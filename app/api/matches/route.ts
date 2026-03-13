import { NextRequest, NextResponse } from "next/server";
import { fetchUpcomingMatches, searchUpcomingFootballMatches } from "@/lib/sports-api";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q");

    const daysParam = searchParams.get("days");

    if (q && q.trim().length > 0) {
      const daysSearch = daysParam ? Number(daysParam) : 60;
      const matches = await searchUpcomingFootballMatches(q, daysSearch);
      return NextResponse.json({ data: matches });
    }

    const daysUpcoming = daysParam ? Number(daysParam) : 7;

    const matches = await fetchUpcomingMatches(daysUpcoming);
    return NextResponse.json({ data: matches });
  } catch (error) {
    console.error("Matches error:", error);
    return NextResponse.json({ error: "Error al cargar partidos" }, { status: 500 });
  }
}
