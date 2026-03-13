import { PickResult } from "@prisma/client";

function parseLine(market: string): number | null {
  const m = market.match(/^(Over|Under)\s+(\d+(?:\.\d+)?)$/i);
  if (!m) return null;
  const line = Number(m[2]);
  return Number.isFinite(line) ? line : null;
}

export function resolvePickResult(params: {
  market: string;
  homeScore: number;
  awayScore: number;
}): PickResult | null {
  const market = params.market.trim();
  const home = params.homeScore;
  const away = params.awayScore;

  if (!Number.isFinite(home) || !Number.isFinite(away)) return null;

  // 1X2
  if (market === "1X2 - Local") return home > away ? PickResult.WON : PickResult.LOST;
  if (market === "1X2 - Empate") return home === away ? PickResult.WON : PickResult.LOST;
  if (market === "1X2 - Visitante") return away > home ? PickResult.WON : PickResult.LOST;

  // Over/Under goals (total)
  const line = parseLine(market);
  if (line !== null) {
    const total = home + away;
    if (market.toLowerCase().startsWith("over")) return total > line ? PickResult.WON : PickResult.LOST;
    if (market.toLowerCase().startsWith("under")) return total < line ? PickResult.WON : PickResult.LOST;
  }

  // Both teams to score
  if (market === "Ambos Marcan - Sí") return home > 0 && away > 0 ? PickResult.WON : PickResult.LOST;
  if (market === "Ambos Marcan - No") return home === 0 || away === 0 ? PickResult.WON : PickResult.LOST;

  // Double chance
  if (market === "Doble Oportunidad 1X") return home >= away ? PickResult.WON : PickResult.LOST;
  if (market === "Doble Oportunidad X2") return away >= home ? PickResult.WON : PickResult.LOST;
  if (market === "Doble Oportunidad 12") return home !== away ? PickResult.WON : PickResult.LOST;

  // Handicap (assumed for the home team)
  // Interpreted as European handicap: apply handicap to home score, then compare.
  const handicapMatch = market.match(/^Handicap\s+([+-]\d+)$/i);
  if (handicapMatch) {
    const handicap = Number(handicapMatch[1]);
    if (!Number.isFinite(handicap)) return null;
    return home + handicap > away ? PickResult.WON : PickResult.LOST;
  }

  return null;
}
