import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toDataUrl(buffer: Buffer, mimeType: string): string {
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const form = await req.formData();
    const file = form.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Archivo requerido" }, { status: 400 });
    }

    const mimeType = (file.type || "").toLowerCase();
    const allowed = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
    if (!allowed.has(mimeType)) {
      return NextResponse.json(
        { error: "Formato inválido. Usa PNG, JPG, WEBP o GIF" },
        { status: 400 }
      );
    }

    const maxBytes = 1_500_000; // ~1.5MB
    if (file.size > maxBytes) {
      return NextResponse.json(
        { error: "La imagen es muy pesada (máx 1.5MB)" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buf = Buffer.from(arrayBuffer);

    const image = toDataUrl(buf, mimeType);

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: { image },
      select: { id: true, username: true, name: true, image: true },
    });

    return NextResponse.json({ data: user });
  } catch (error) {
    console.error("Upload avatar error:", error);
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: { image: null },
      select: { id: true, username: true, name: true, image: true },
    });

    return NextResponse.json({ data: user });
  } catch (error) {
    console.error("Delete avatar error:", error);
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
