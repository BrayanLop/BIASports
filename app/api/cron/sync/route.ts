import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { fetchMatchById } from "@/lib/sports-api";
import { resolvePickResult } from "@/lib/pick-resolution";
import { updateUserStats } from "@/lib/stats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const authHeader = req.headers.get("authorization");
  if (!authHeader) return false;

  return authHeader === `Bearer ${secret}`;
}

async function syncOnce() {
  const now = new Date();
  const lookbackDays = Number(process.env.CRON_SYNC_LOOKBACK_DAYS ?? "3");
  const maxMatches = Number(process.env.CRON_SYNC_MAX_MATCHES ?? "40");

  const from = new Date(now);
  from.setDate(from.getDate() - (Number.isFinite(lookbackDays) ? lookbackDays : 3));

  const matches = await prisma.match.findMany({
    where: {
      externalId: { not: null },
      matchDate: { gte: from, lte: now },
      OR: [{ status: { not: "FINISHED" } }, { homeScore: null }, { awayScore: null }],
    },
    orderBy: { matchDate: "asc" },
    take: Number.isFinite(maxMatches) ? maxMatches : 40,
    select: {
      id: true,
      externalId: true,
      homeScore: true,
      awayScore: true,
      status: true,
    },
  });

  let updatedMatches = 0;
  let resolvedPicks = 0;
  const touchedUsers = new Set<string>();

  for (const match of matches) {
    const externalId = match.externalId;
    if (!externalId) continue;

    const normalized = await fetchMatchById(externalId);
    if (!normalized) continue;

    const nextHome = normalized.homeScore;
    const nextAway = normalized.awayScore;
    const nextStatus = normalized.status;

    const shouldUpdateMatch =
      nextHome !== match.homeScore || nextAway !== match.awayScore || nextStatus !== match.status;

    if (shouldUpdateMatch) {
      await prisma.match.update({
        where: { id: match.id },
        data: {
          homeScore: nextHome,
          awayScore: nextAway,
          status: nextStatus,
        },
      });
      updatedMatches++;
    }

    const isFinished =
      nextStatus === "FINISHED" || (nextHome !== null && nextAway !== null);

    if (!isFinished || nextHome === null || nextAway === null) continue;

    const pending = await prisma.pick.findMany({
      where: { matchId: match.id, result: "PENDING" },
      select: { id: true, userId: true, market: true },
    });

    for (const pick of pending) {
      const result = resolvePickResult({
        market: pick.market,
        homeScore: nextHome,
        awayScore: nextAway,
      });

      if (!result) continue;

      await prisma.pick.update({
        where: { id: pick.id },
        data: { result },
      });

      resolvedPicks++;
      touchedUsers.add(pick.userId);
    }
  }

  for (const userId of touchedUsers) {
    await updateUserStats(userId);
  }

  return {
    checkedMatches: matches.length,
    updatedMatches,
    resolvedPicks,
    updatedUsers: touchedUsers.size,
  };
}

export async function POST(req: NextRequest) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json(
      { error: "CRON_SECRET no configurado" },
      { status: 500 }
    );
  }

  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const result = await syncOnce();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("Cron sync error:", error);
    return NextResponse.json(
      { ok: false, error: "Error al sincronizar" },
      { status: 500 }
    );
  }
}

// Allow simple cron providers that only support GET.
export async function GET(req: NextRequest) {
  return POST(req);
}
