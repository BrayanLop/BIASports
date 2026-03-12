import prisma from "@/lib/prisma";
import { PickResult } from "@prisma/client";

interface PickForStats {
  result: PickResult;
  odds: number;
  stake: number;
}

export function calculateProfit(picks: PickForStats[]): number {
  const resolvedPicks = picks.filter(
    (p) => p.result === PickResult.WON || p.result === PickResult.LOST
  );

  return resolvedPicks.reduce((total, pick) => {
    if (pick.result === PickResult.WON) {
      return total + pick.stake * (pick.odds - 1);
    } else {
      return total - pick.stake;
    }
  }, 0);
}

export function calculateROI(picks: PickForStats[]): number {
  const resolvedPicks = picks.filter(
    (p) => p.result === PickResult.WON || p.result === PickResult.LOST
  );

  if (resolvedPicks.length === 0) return 0;

  const totalStake = resolvedPicks.reduce((sum, p) => sum + p.stake, 0);
  if (totalStake === 0) return 0;

  const profit = calculateProfit(resolvedPicks);
  return (profit / totalStake) * 100;
}

export function calculateYield(picks: PickForStats[]): number {
  const resolvedPicks = picks.filter(
    (p) => p.result === PickResult.WON || p.result === PickResult.LOST
  );

  if (resolvedPicks.length === 0) return 0;

  const avgOdds =
    resolvedPicks.reduce((sum, p) => sum + p.odds, 0) / resolvedPicks.length;
  const avgStake =
    resolvedPicks.reduce((sum, p) => sum + p.stake, 0) / resolvedPicks.length;
  const totalBets = resolvedPicks.length;

  const denominator = totalBets * avgOdds * avgStake;
  if (denominator === 0) return 0;

  const profit = calculateProfit(resolvedPicks);
  return (profit / denominator) * 100;
}

export function calculateWinRate(picks: PickForStats[]): number {
  const resolvedPicks = picks.filter(
    (p) => p.result === PickResult.WON || p.result === PickResult.LOST
  );

  if (resolvedPicks.length === 0) return 0;

  const wonPicks = resolvedPicks.filter((p) => p.result === PickResult.WON).length;
  return (wonPicks / resolvedPicks.length) * 100;
}

export function calculateStreak(picks: PickForStats[]): { current: number; max: number } {
  const resolvedPicks = picks.filter(
    (p) => p.result === PickResult.WON || p.result === PickResult.LOST
  );

  if (resolvedPicks.length === 0) return { current: 0, max: 0 };

  let currentStreak = 0;
  let maxStreak = 0;
  let tempStreak = 0;
  const lastResult = resolvedPicks[resolvedPicks.length - 1].result;

  for (let i = resolvedPicks.length - 1; i >= 0; i--) {
    if (resolvedPicks[i].result === lastResult) {
      tempStreak++;
      if (i === resolvedPicks.length - 1 || resolvedPicks[i + 1].result === lastResult) {
        currentStreak = tempStreak;
      }
    } else {
      break;
    }
  }

  let streak = 0;
  let streakResult = resolvedPicks[0].result;

  for (const pick of resolvedPicks) {
    if (pick.result === streakResult) {
      streak++;
      if (streak > maxStreak) maxStreak = streak;
    } else {
      streak = 1;
      streakResult = pick.result;
    }
  }

  if (lastResult === PickResult.LOST) {
    currentStreak = -currentStreak;
  }

  return { current: currentStreak, max: maxStreak };
}

export async function updateUserStats(userId: string) {
  const picks = await prisma.pick.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: {
      result: true,
      odds: true,
      stake: true,
    },
  });

  const totalPicks = picks.length;
  const wonPicks = picks.filter((p) => p.result === PickResult.WON).length;
  const lostPicks = picks.filter((p) => p.result === PickResult.LOST).length;
  const pendingPicks = picks.filter((p) => p.result === PickResult.PENDING).length;

  const resolvedPicks = picks.filter(
    (p) => p.result === PickResult.WON || p.result === PickResult.LOST
  );
  const totalStake = resolvedPicks.reduce((sum, p) => sum + p.stake, 0);
  const totalProfit = calculateProfit(picks);
  const roi = calculateROI(picks);
  const yieldValue = calculateYield(picks);
  const winRate = calculateWinRate(picks);
  const { current: currentStreak, max: maxStreak } = calculateStreak(picks);

  const stats = await prisma.userStats.upsert({
    where: { userId },
    create: {
      userId,
      totalPicks,
      wonPicks,
      lostPicks,
      pendingPicks,
      totalStake,
      totalProfit,
      roi,
      yield: yieldValue,
      winRate,
      currentStreak,
      maxStreak,
    },
    update: {
      totalPicks,
      wonPicks,
      lostPicks,
      pendingPicks,
      totalStake,
      totalProfit,
      roi,
      yield: yieldValue,
      winRate,
      currentStreak,
      maxStreak,
    },
  });

  return stats;
}
