import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        image: true,
        bio: true,
        role: true,
        hashedPassword: true,
        createdAt: true,
        updatedAt: true,
        stats: true,
        _count: { select: { followers: true, following: true, picks: true } },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }

    const { hashedPassword, ...safeUser } = user;
    const hasPassword = Boolean(hashedPassword);
    return NextResponse.json({ data: { ...safeUser, hasPassword } });
  } catch (error) {
    console.error("Me error:", error);
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { name, bio, image, username } = await req.json();

    let nextUsername: string | undefined;
    if (username !== undefined) {
      if (typeof username !== "string") {
        return NextResponse.json({ error: "username inválido" }, { status: 400 });
      }
      const normalized = username.trim().toLowerCase();
      if (normalized.length < 3 || normalized.length > 20) {
        return NextResponse.json(
          { error: "El usuario debe tener entre 3 y 20 caracteres" },
          { status: 400 }
        );
      }
      if (!/^[a-z0-9_]+$/.test(normalized)) {
        return NextResponse.json(
          { error: "El usuario solo puede contener letras, números y _" },
          { status: 400 }
        );
      }

      const existing = await prisma.user.findUnique({
        where: { username: normalized },
        select: { id: true },
      });
      if (existing && existing.id !== session.user.id) {
        return NextResponse.json(
          { error: "El nombre de usuario ya está en uso" },
          { status: 400 }
        );
      }
      nextUsername = normalized;
    }

    const nextImage =
      image !== undefined
        ? typeof image === "string" && image.trim().length > 0
          ? image.trim()
          : null
        : undefined;

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(bio !== undefined ? { bio } : {}),
        ...(nextImage !== undefined ? { image: nextImage } : {}),
        ...(nextUsername !== undefined ? { username: nextUsername } : {}),
      },
      select: {
        id: true, email: true, username: true, name: true,
        image: true, bio: true, role: true, createdAt: true, updatedAt: true,
      },
    });

    return NextResponse.json({ data: user });
  } catch (error) {
    console.error("Update me error:", error);
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
