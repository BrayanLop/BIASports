import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { updateUserStats } from "@/lib/stats";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const { result, comment, isPublic } = await req.json();

    const pick = await prisma.pick.findUnique({ where: { id } });
    if (!pick) {
      return NextResponse.json({ error: "Pick no encontrado" }, { status: 404 });
    }

    if (pick.userId !== session.user.id && session.user.id !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const updated = await prisma.pick.update({
      where: { id },
      data: {
        ...(result !== undefined ? { result } : {}),
        ...(comment !== undefined ? { comment } : {}),
        ...(isPublic !== undefined ? { isPublic } : {}),
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

    if (result) {
      await updateUserStats(pick.userId);
    }

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("Update pick error:", error);
    return NextResponse.json({ error: "Error al actualizar" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const pick = await prisma.pick.findUnique({ where: { id } });
    if (!pick) {
      return NextResponse.json({ error: "Pick no encontrado" }, { status: 404 });
    }

    if (pick.userId !== session.user.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    await prisma.pick.delete({ where: { id } });
    await updateUserStats(session.user.id);

    return NextResponse.json({ message: "Pick eliminado" });
  } catch (error) {
    console.error("Delete pick error:", error);
    return NextResponse.json({ error: "Error al eliminar" }, { status: 500 });
  }
}
