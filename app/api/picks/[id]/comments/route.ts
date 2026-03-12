import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: pickId } = await params;

    const comments = await prisma.comment.findMany({
      where: { pickId },
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: { id: true, username: true, name: true, image: true },
        },
      },
    });

    return NextResponse.json({ data: comments });
  } catch (error) {
    console.error("Get comments error:", error);
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

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
    const { content } = await req.json();

    if (!content?.trim()) {
      return NextResponse.json({ error: "Contenido requerido" }, { status: 400 });
    }

    const comment = await prisma.comment.create({
      data: {
        content: content.trim(),
        userId: session.user.id,
        pickId,
      },
      include: {
        user: {
          select: { id: true, username: true, name: true, image: true },
        },
      },
    });

    return NextResponse.json({ data: comment }, { status: 201 });
  } catch (error) {
    console.error("Create comment error:", error);
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
