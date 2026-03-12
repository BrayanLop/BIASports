import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { updateUserStats } from "@/lib/stats";

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

    const pick = await prisma.pick.create({
      data: {
        userId: session.user.id,
        matchId,
        sportId,
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
