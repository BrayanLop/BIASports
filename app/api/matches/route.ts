import { NextResponse } from "next/server";
import { fetchTodayMatches } from "@/lib/sports-api";

export async function GET() {
  try {
    const matches = await fetchTodayMatches();
    return NextResponse.json({ data: matches });
  } catch (error) {
    console.error("Matches error:", error);
    return NextResponse.json({ error: "Error al cargar partidos" }, { status: 500 });
  }
}
