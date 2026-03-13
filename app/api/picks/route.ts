import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { updateUserStats } from "@/lib/stats";
import { fetchMatchById } from "@/lib/sports-api";

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
}) {
  const existing = await prisma.match.findUnique({
    where: { externalId: params.externalId },
    include: { league: true },
  });
  if (existing) return existing;

  const normalized = await fetchMatchById(params.externalId);
  if (!normalized) {
    throw new Error(`Match not found for externalId=${params.externalId}`);
  }

  const league = await getOrCreateLeague({
    sportId: params.sportId,
    name: normalized.leagueName,
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

    const { matchId, sportId, market, odds, stake, comment, isPublic } =
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
    const match = await getOrCreateMatchByExternalId({
      externalId: String(matchId),
      sportId: sport.id,
    });

    const pick = await prisma.pick.create({
      data: {
        userId: session.user.id,
        matchId: match.id,
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
    return NextResponse.json({ error: "Error al crear la predicción" }, { status: 500 });
  }
}
