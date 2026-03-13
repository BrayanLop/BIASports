import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { updateUserStats } from "@/lib/stats";
import { fetchMatchById } from "@/lib/sports-api";
import { Prisma } from "@prisma/client";

type MatchSnapshot = {
  externalId?: string | null;
  homeTeam?: string | null;
  awayTeam?: string | null;
  homeScore?: number | null;
  awayScore?: number | null;
  leagueName?: string | null;
  leagueLogo?: string | null;
  country?: string | null;
  matchDate?: string | null;
  status?: string | null;
};

async function getOrCreateSportByIdOrSlug(sportIdOrSlug: string) {
  const byId = await prisma.sport.findUnique({ where: { id: sportIdOrSlug } });
  if (byId) return byId;

  const bySlug = await prisma.sport.findUnique({ where: { slug: sportIdOrSlug } });
  if (bySlug) return bySlug;

  const defaults: Record<string, { name: string; icon: string }> = {
    football: { name: "Fútbol", icon: "⚽" },
    basketball: { name: "Basketball", icon: "🏀" },
    tennis: { name: "Tenis", icon: "🎾" },
  };

  const fallback = defaults[sportIdOrSlug] ?? { name: sportIdOrSlug, icon: "🏆" };
  return prisma.sport.create({
    data: {
      name: fallback.name,
      slug: sportIdOrSlug,
      icon: fallback.icon,
    },
  });
}

async function getOrCreateLeague(params: {
  sportId: string;
  name: string;
  country?: string | null;
  logo?: string | null;
}) {
  const existing = await prisma.league.findFirst({
    where: {
      sportId: params.sportId,
      name: params.name,
      ...(params.country ? { country: params.country } : {}),
    },
  });
  if (existing) return existing;

  return prisma.league.create({
    data: {
      sportId: params.sportId,
      name: params.name,
      country: params.country ?? null,
      logo: params.logo ?? null,
    },
  });
}

async function getOrCreateMatchByExternalId(params: {
  externalId: string;
  sportId: string;
  snapshot?: MatchSnapshot | null;
}) {
  const existing = await prisma.match.findUnique({
    where: { externalId: params.externalId },
    include: { league: true },
  });
  if (existing) return existing;

  let normalized = await fetchMatchById(params.externalId);
  if (!normalized && params.snapshot?.matchDate) {
    const s = params.snapshot;
    normalized = {
      id: s.externalId || params.externalId,
      externalId: s.externalId || params.externalId,
      homeTeam: s.homeTeam || "TBD",
      awayTeam: s.awayTeam || "TBD",
      homeTeamLogo: "",
      awayTeamLogo: "",
      homeScore: typeof s.homeScore === "number" ? s.homeScore : null,
      awayScore: typeof s.awayScore === "number" ? s.awayScore : null,
      leagueName: s.leagueName || "",
      leagueLogo: s.leagueLogo || "",
      country: s.country || "",
      matchDate: s.matchDate ?? new Date().toISOString(),
      status: s.status || "SCHEDULED",
    };
  }
  if (!normalized) {
    throw new Error(`Match not found for externalId=${params.externalId}`);
  }

  const league = await getOrCreateLeague({
    sportId: params.sportId,
    name: normalized.leagueName || "Unknown League",
    country: normalized.country,
    logo: normalized.leagueLogo,
  });

  return prisma.match.create({
    data: {
      homeTeam: normalized.homeTeam,
      awayTeam: normalized.awayTeam,
      homeScore: normalized.homeScore,
      awayScore: normalized.awayScore,
      leagueId: league.id,
      sportId: params.sportId,
      matchDate: new Date(normalized.matchDate),
      status: normalized.status,
      externalId: params.externalId,
    },
    include: { league: true },
  });
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { matchId, match: matchSnapshot, sportId, market, odds, stake, comment, isPublic } =
      await req.json();

    if (!matchId || !sportId || !market || !odds || !stake) {
      return NextResponse.json(
        { error: "Campos requeridos: matchId, sportId, market, odds, stake" },
        { status: 400 }
      );
    }

    const sport = await getOrCreateSportByIdOrSlug(String(sportId));
    if (sport.slug !== "football") {
      return NextResponse.json(
        { error: "Por ahora solo está habilitado Fútbol" },
        { status: 400 }
      );
    }
    const dbMatch = await getOrCreateMatchByExternalId({
      externalId: String(matchId),
      sportId: sport.id,
      snapshot: matchSnapshot ?? null,
    });

    const pick = await prisma.pick.create({
      data: {
        userId: session.user.id,
        matchId: dbMatch.id,
        sportId: sport.id,
        market,
        odds: parseFloat(odds),
        stake: parseInt(stake),
        comment: comment || null,
        isPublic: isPublic !== false,
      },
      include: {
        user: {
          select: {
            id: true, username: true, name: true, image: true,
            bio: true, role: true, createdAt: true, updatedAt: true, email: true,
          },
        },
        match: { include: { league: true } },
        sport: true,
        _count: { select: { comments: true, likes: true } },
      },
    });

    await updateUserStats(session.user.id);

    return NextResponse.json({ data: pick }, { status: 201 });
  } catch (error) {
    console.error("Create pick error:", error);

    if (error instanceof Error) {
      if (error.message.includes("Match not found")) {
        return NextResponse.json(
          { error: "No se pudo encontrar el partido. Vuelve a buscarlo y selecciónalo otra vez." },
          { status: 400 }
        );
      }
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Unique constraint violations, etc.
      if (error.code === "P2002") {
        return NextResponse.json(
          { error: "Ya existe un registro con esos datos. Intenta de nuevo." },
          { status: 409 }
        );
      }
    }

    return NextResponse.json({ error: "Error al crear la predicción" }, { status: 500 });
  }
}
