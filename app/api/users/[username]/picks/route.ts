import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;
    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get("cursor");
    const limit = 20;

    const user = await prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    const session = await auth();
    const currentUserId = session?.user?.id;

    const picks = await prisma.pick.findMany({
      where: {
        userId: user.id,
        isPublic: true,
        ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      include: {
        user: {
          select: {
            id: true, username: true, name: true, image: true,
            bio: true, role: true, createdAt: true, updatedAt: true, email: true,
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

    const feedItems = items.map((pick) => {
      const { likes, ...rest } = pick as typeof pick & { likes?: { id: string }[] };
      return {
        ...rest,
        isLiked: likes ? likes.length > 0 : false,
        isFollowing: false,
      };
    });

    return NextResponse.json({
      data: feedItems,
      nextCursor: hasMore ? items[items.length - 1].createdAt.toISOString() : undefined,
      hasMore,
    });
  } catch (error) {
    console.error("User picks error:", error);
    return NextResponse.json({ data: [], hasMore: false });
  }
}
