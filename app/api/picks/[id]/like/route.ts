import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id: pickId } = await params;

    const existing = await prisma.like.findUnique({
      where: { userId_pickId: { userId: session.user.id, pickId } },
    });

    if (existing) {
      await prisma.like.delete({ where: { id: existing.id } });
      const count = await prisma.like.count({ where: { pickId } });
      return NextResponse.json({ liked: false, likesCount: count });
    }

    await prisma.like.create({
      data: { userId: session.user.id, pickId },
    });

    const count = await prisma.like.count({ where: { pickId } });
    return NextResponse.json({ liked: true, likesCount: count });
  } catch (error) {
    console.error("Like error:", error);
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
