import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { demoFeedItems } from "@/lib/demo-data";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const currentUserId = session?.user?.id;

    const { searchParams } = new URL(req.url);
    const filter = searchParams.get("filter") || "all";
    const sport = searchParams.get("sport") || "all";
    const cursor = searchParams.get("cursor");
    const limit = 20;

    const where: Record<string, unknown> = { isPublic: true };

    if (filter === "following" && currentUserId) {
      const following = await prisma.follow.findMany({
        where: { followerId: currentUserId },
        select: { followingId: true },
      });
      where.userId = { in: following.map((f) => f.followingId) };
    }

    if (sport !== "all") {
      const sportRecord = await prisma.sport.findUnique({
        where: { slug: sport },
      });
      if (sportRecord) {
        where.sportId = sportRecord.id;
      }
    }

    const picks = await prisma.pick.findMany({
      where: {
        ...where,
        ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            image: true,
            bio: true,
            role: true,
            createdAt: true,
            updatedAt: true,
            email: true,
            _count: { select: { followers: true, following: true, picks: true } },
          },
        },
        match: { include: { league: true } },
        sport: true,
        _count: { select: { comments: true, likes: true } },
        ...(currentUserId
          ? { likes: { where: { userId: currentUserId }, take: 1 } }
          : {}),
      },
    });

    const hasMore = picks.length > limit;
    const items = picks.slice(0, limit);

    let followingIds: string[] = [];
    if (currentUserId) {
      const follows = await prisma.follow.findMany({
        where: { followerId: currentUserId },
        select: { followingId: true },
      });
      followingIds = follows.map((f) => f.followingId);
    }

    const feedItems = items.map((pick) => {
      const { likes, ...rest } = pick as typeof pick & { likes?: { id: string }[] };
      return {
        ...rest,
        isLiked: likes ? likes.length > 0 : false,
        isFollowing: followingIds.includes(pick.userId),
      };
    });

    return NextResponse.json({
      data: feedItems,
      nextCursor: hasMore
        ? items[items.length - 1].createdAt.toISOString()
        : undefined,
      hasMore,
    });
  } catch (error) {
    console.error("Feed error:", error);
    // Return demo data when DB is unavailable
    let items = demoFeedItems;
    const { searchParams } = new URL(req.url);
    const sport = searchParams.get("sport") || "all";
    if (sport !== "all") {
      items = items.filter((i) => i.sport.slug === sport);
    }
    return NextResponse.json({ data: items, hasMore: false });
  }
}
