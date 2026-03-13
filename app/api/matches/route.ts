import { NextRequest, NextResponse } from "next/server";
import { fetchUpcomingMatches, searchUpcomingFootballMatches } from "@/lib/sports-api";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q");

    const daysParam = searchParams.get("days");
    const debug = process.env.DEBUG_SPORTS_API === "true";
    const hasApiKey = Boolean((process.env.SPORTS_API_KEY ?? "").trim());
    const timeZone = process.env.APP_TIMEZONE ?? process.env.TZ ?? "UTC";

    if (q && q.trim().length > 0) {
      const daysSearch = daysParam ? Number(daysParam) : 60;
      const matches = await searchUpcomingFootballMatches(q, daysSearch);
      if (debug) {
        console.log(
          JSON.stringify({
            tag: "matches.search",
            q,
            daysSearch,
            hasApiKey,
            timeZone,
            count: matches.length,
          })
        );
      }
      return NextResponse.json({ data: matches });
    }

    const daysUpcoming = daysParam ? Number(daysParam) : 7;

    const matches = await fetchUpcomingMatches(daysUpcoming);
    if (debug) {
      console.log(
        JSON.stringify({
          tag: "matches.upcoming",
          daysUpcoming,
          hasApiKey,
          timeZone,
          count: matches.length,
        })
      );
    }
    return NextResponse.json({ data: matches });
  } catch (error) {
    console.error("Matches error:", error);
    return NextResponse.json({ error: "Error al cargar partidos" }, { status: 500 });
  }
}
