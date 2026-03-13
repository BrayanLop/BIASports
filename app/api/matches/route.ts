import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  fetchUpcomingMatches,
  searchUpcomingFootballMatches,
  type NormalizedMatch,
} from "@/lib/sports-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clampInt(input: unknown, fallback: number, min: number, max: number): number {
  const n = typeof input === "number" ? input : Number(input);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

function isUpcoming(matchDateIso: string, nowMs: number, maxMs: number): boolean {
  const t = new Date(matchDateIso).getTime();
  if (Number.isNaN(t)) return false;
  return t >= nowMs && t <= maxMs;
}

function mapDbMatchToNormalized(m: {
  id: string;
  externalId: string | null;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  matchDate: Date;
  status: string;
  league: { name: string; country: string | null; logo: string | null };
}): NormalizedMatch {
  return {
    id: m.externalId || m.id,
    externalId: m.externalId || m.id,
    homeTeam: m.homeTeam,
    awayTeam: m.awayTeam,
    homeTeamLogo: "",
    awayTeamLogo: "",
    homeScore: m.homeScore,
    awayScore: m.awayScore,
    leagueName: m.league?.name || "",
    leagueLogo: m.league?.logo || "",
    country: m.league?.country || "",
    matchDate: m.matchDate.toISOString(),
    status: m.status,
  };
}

async function getOrCreateFootballSportId(): Promise<string> {
  const existing = await prisma.sport.findUnique({ where: { slug: "football" } });
  if (existing) return existing.id;
  const created = await prisma.sport.create({
    data: { name: "Fútbol", slug: "football", icon: "⚽" },
  });
  return created.id;
}

async function getOrCreateLeague(params: {
  sportId: string;
  name: string;
  country?: string | null;
  logo?: string | null;
}): Promise<{ id: string }> {
  const existing = await prisma.league.findFirst({
    where: {
      sportId: params.sportId,
      name: params.name,
      ...(params.country ? { country: params.country } : {}),
    },
    select: { id: true },
  });
  if (existing) return existing;

  return prisma.league.create({
    data: {
      sportId: params.sportId,
      name: params.name,
      country: params.country ?? null,
      logo: params.logo ?? null,
    },
    select: { id: true },
  });
}

async function persistMatchesToCache(params: { sportId: string; matches: NormalizedMatch[] }) {
  const leagueCache = new Map<string, string>();

  for (const m of params.matches) {
    const externalId = String(m.externalId || m.id).trim();
    if (!externalId) continue;

    const matchDate = new Date(m.matchDate);
    if (Number.isNaN(matchDate.getTime())) continue;

    const leagueName = (m.leagueName || "Unknown League").trim() || "Unknown League";
    const leagueCountry = (m.country || "").trim() || null;
    const leagueLogo = (m.leagueLogo || "").trim() || null;
    const leagueKey = `${leagueName}__${leagueCountry ?? ""}`;

    let leagueId = leagueCache.get(leagueKey);
    if (!leagueId) {
      const league = await getOrCreateLeague({
        sportId: params.sportId,
        name: leagueName,
        country: leagueCountry,
        logo: leagueLogo,
      });
      leagueId = league.id;
      leagueCache.set(leagueKey, leagueId);
    }

    await prisma.match.upsert({
      where: { externalId },
      create: {
        externalId,
        homeTeam: m.homeTeam,
        awayTeam: m.awayTeam,
        homeScore: m.homeScore,
        awayScore: m.awayScore,
        status: m.status || "SCHEDULED",
        matchDate,
        sportId: params.sportId,
        leagueId,
      },
      update: {
        homeTeam: m.homeTeam,
        awayTeam: m.awayTeam,
        homeScore: m.homeScore,
        awayScore: m.awayScore,
        status: m.status || "SCHEDULED",
        matchDate,
        sportId: params.sportId,
        leagueId,
      },
    });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q");

    const daysParam = searchParams.get("days");
    const debug = process.env.DEBUG_SPORTS_API === "true";
    const hasApiKey = Boolean((process.env.SPORTS_API_KEY ?? "").trim());
    const timeZone = process.env.APP_TIMEZONE ?? process.env.TZ ?? "UTC";

    const nowMs = Date.now();

    if (q && q.trim().length > 0) {
      const daysSearch = clampInt(daysParam, 60, 1, 60);
      const maxMs = nowMs + daysSearch * 24 * 60 * 60 * 1000;
      const sportId = await getOrCreateFootballSportId();

      // 1) DB-first cache
      const cached = await prisma.match.findMany({
        where: {
          sportId,
          matchDate: { gte: new Date(nowMs), lte: new Date(maxMs) },
          OR: [
            { homeTeam: { contains: q, mode: "insensitive" } },
            { awayTeam: { contains: q, mode: "insensitive" } },
            { league: { name: { contains: q, mode: "insensitive" } } },
            { league: { country: { contains: q, mode: "insensitive" } } },
          ],
        },
        orderBy: { matchDate: "asc" },
        take: 80,
        include: { league: { select: { name: true, country: true, logo: true } } },
      });

      if (cached.length > 0) {
        const data = cached.map(mapDbMatchToNormalized);
        if (debug) {
          console.log(
            JSON.stringify({
              tag: "matches.search",
              source: "db",
              q,
              daysSearch,
              hasApiKey,
              timeZone,
              count: data.length,
            })
          );
        }
        return NextResponse.json({ data });
      }

      // 2) Fallback to provider, then persist
      const fetched = await searchUpcomingFootballMatches(q, daysSearch);
      const filtered = fetched.filter((m) => isUpcoming(m.matchDate, nowMs, maxMs));
      await persistMatchesToCache({ sportId, matches: filtered });

      if (debug) {
        console.log(
          JSON.stringify({
            tag: "matches.search",
            source: "api",
            q,
            daysSearch,
            hasApiKey,
            timeZone,
            count: filtered.length,
          })
        );
      }
      return NextResponse.json({ data: filtered });
    }

    const daysUpcoming = clampInt(daysParam, 7, 1, 14);
    const maxMs = nowMs + daysUpcoming * 24 * 60 * 60 * 1000;
    const sportId = await getOrCreateFootballSportId();

    const cachedUpcoming = await prisma.match.findMany({
      where: {
        sportId,
        matchDate: { gte: new Date(nowMs), lte: new Date(maxMs) },
      },
      orderBy: { matchDate: "asc" },
      take: 200,
      include: { league: { select: { name: true, country: true, logo: true } } },
    });

    if (cachedUpcoming.length > 0) {
      const data = cachedUpcoming.map(mapDbMatchToNormalized);
      if (debug) {
        console.log(
          JSON.stringify({
            tag: "matches.upcoming",
            source: "db",
            daysUpcoming,
            hasApiKey,
            timeZone,
            count: data.length,
          })
        );
      }
      return NextResponse.json({ data });
    }

    const fetchedUpcoming = await fetchUpcomingMatches(daysUpcoming);
    const filtered = fetchedUpcoming.filter((m) => isUpcoming(m.matchDate, nowMs, maxMs));
    await persistMatchesToCache({ sportId, matches: filtered });

    if (debug) {
      console.log(
        JSON.stringify({
          tag: "matches.upcoming",
          source: "api",
          daysUpcoming,
          hasApiKey,
          timeZone,
          count: filtered.length,
        })
      );
    }
    return NextResponse.json({ data: filtered });
  } catch (error) {
    console.error("Matches error:", error);
    return NextResponse.json({ error: "Error al cargar partidos" }, { status: 500 });
  }
}
