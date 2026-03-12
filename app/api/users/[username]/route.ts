import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getDemoProfile } from "@/lib/demo-data";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;
    const session = await auth();
    const currentUserId = session?.user?.id;

    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        image: true,
        bio: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        stats: true,
        _count: { select: { followers: true, following: true, picks: true } },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    let isFollowing = false;
    if (currentUserId && currentUserId !== user.id) {
      const follow = await prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: currentUserId, followingId: user.id } },
      });
      isFollowing = !!follow;
    }

    return NextResponse.json({ data: { ...user, isFollowing } });
  } catch (error) {
    console.error("Get user error:", error);
    const { username } = await params;
    const profile = getDemoProfile(username);
    if (profile) return NextResponse.json({ data: profile });
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }
}
