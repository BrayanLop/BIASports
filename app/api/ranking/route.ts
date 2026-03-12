import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { demoRanking } from "@/lib/demo-data";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const metric = searchParams.get("metric") || "roi";
    const limit = parseInt(searchParams.get("limit") || "50");

    const orderField =
      metric === "winrate" ? "winRate" : metric === "profit" ? "totalProfit" : "roi";

    const stats = await prisma.userStats.findMany({
      where: { totalPicks: { gte: 5 } },
      orderBy: { [orderField]: "desc" },
      take: limit,
      include: {
        user: {
          select: {
            id: true, username: true, name: true, image: true,
            bio: true, role: true, createdAt: true, updatedAt: true, email: true,
            _count: { select: { followers: true, following: true, picks: true } },
          },
        },
      },
    });

    const ranking = stats.map((s, i) => ({
      rank: i + 1,
      user: s.user,
      stats: {
        id: s.id,
        userId: s.userId,
        totalPicks: s.totalPicks,
        wonPicks: s.wonPicks,
        lostPicks: s.lostPicks,
        pendingPicks: s.pendingPicks,
        totalStake: s.totalStake,
        totalProfit: s.totalProfit,
        roi: s.roi,
        yield: s.yield,
        winRate: s.winRate,
        currentStreak: s.currentStreak,
        maxStreak: s.maxStreak,
        updatedAt: s.updatedAt,
      },
    }));

    return NextResponse.json({ data: ranking });
  } catch (error) {
    console.error("Ranking error:", error);
    // Return demo data when DB is unavailable
    const { searchParams } = new URL(req.url);
    const metric = searchParams.get("metric") || "roi";
    const sorted = [...demoRanking].sort((a, b) => {
      if (metric === "winrate") return b.stats.winRate - a.stats.winRate;
      if (metric === "profit") return b.stats.totalProfit - a.stats.totalProfit;
      return b.stats.roi - a.stats.roi;
    }).map((item, i) => ({ ...item, rank: i + 1 }));
    return NextResponse.json({ data: sorted });
  }
}
