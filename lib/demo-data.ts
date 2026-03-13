import type { FeedItem, RankingUser, UserStats } from "@/types";

const now = new Date();
const hour = (h: number) => {
  const d = new Date(now);
  d.setHours(d.getHours() + h);
  return d.toISOString();
};
const ago = (h: number) => {
  const d = new Date(now);
  d.setHours(d.getHours() - h);
  return d.toISOString();
};

const demoUsers = [
  {
    id: "demo-1", email: "carlos@demo.com", username: "carlos_bets", name: "Carlos Rodríguez",
    image: null, bio: "Tipster profesional. Especialista en La Liga y Premier League. +5 años de experiencia.",
    role: "USER" as const, createdAt: new Date("2024-01-15"), updatedAt: new Date(),
    _count: { followers: 1240, following: 85, picks: 342 },
  },
  {
    id: "demo-2", email: "maria@demo.com", username: "maria_tips", name: "María García",
    image: null, bio: "Analista deportiva. Fútbol y tenis. Datos y estadísticas.",
    role: "USER" as const, createdAt: new Date("2024-03-20"), updatedAt: new Date(),
    _count: { followers: 870, following: 120, picks: 198 },
  },
  {
    id: "demo-3", email: "andres@demo.com", username: "andres_pro", name: "Andrés López",
    image: null, bio: "Basketball & fútbol. ROI positivo desde 2023.",
    role: "USER" as const, createdAt: new Date("2023-11-10"), updatedAt: new Date(),
    _count: { followers: 2100, following: 45, picks: 567 },
  },
  {
    id: "demo-4", email: "laura@demo.com", username: "laura_picks", name: "Laura Martínez",
    image: null, bio: "Apuestas de valor. Análisis profundo de ligas europeas.",
    role: "USER" as const, createdAt: new Date("2024-06-01"), updatedAt: new Date(),
    _count: { followers: 650, following: 200, picks: 145 },
  },
  {
    id: "demo-5", email: "diego@demo.com", username: "diego_winner", name: "Diego Fernández",
    image: null, bio: "El rey del over/under. Tennis lover.",
    role: "USER" as const, createdAt: new Date("2024-02-14"), updatedAt: new Date(),
    _count: { followers: 430, following: 90, picks: 230 },
  },
];

const demoMatches = [
  {
    id: "demo-m1", homeTeam: "Real Madrid", awayTeam: "FC Barcelona",
    homeScore: null, awayScore: null, leagueId: "l1", sportId: "s1",
    matchDate: new Date(hour(3)), status: "SCHEDULED", externalId: "dm1",
    league: { id: "l1", name: "La Liga", sportId: "s1", country: "España", logo: null },
  },
  {
    id: "demo-m2", homeTeam: "Manchester City", awayTeam: "Arsenal",
    homeScore: 2, awayScore: 1, leagueId: "l2", sportId: "s1",
    matchDate: new Date(ago(2)), status: "FINISHED", externalId: "dm2",
    league: { id: "l2", name: "Premier League", sportId: "s1", country: "Inglaterra", logo: null },
  },
  {
    id: "demo-m3", homeTeam: "Bayern Munich", awayTeam: "Borussia Dortmund",
    homeScore: 3, awayScore: 2, leagueId: "l3", sportId: "s1",
    matchDate: new Date(ago(5)), status: "FINISHED", externalId: "dm3",
    league: { id: "l3", name: "Bundesliga", sportId: "s1", country: "Alemania", logo: null },
  },
  {
    id: "demo-m4", homeTeam: "Juventus", awayTeam: "AC Milan",
    homeScore: null, awayScore: null, leagueId: "l4", sportId: "s1",
    matchDate: new Date(hour(6)), status: "SCHEDULED", externalId: "dm4",
    league: { id: "l4", name: "Serie A", sportId: "s1", country: "Italia", logo: null },
  },
  {
    id: "demo-m5", homeTeam: "PSG", awayTeam: "Marseille",
    homeScore: 1, awayScore: 0, leagueId: "l5", sportId: "s1",
    matchDate: new Date(ago(1)), status: "FINISHED", externalId: "dm5",
    league: { id: "l5", name: "Ligue 1", sportId: "s1", country: "Francia", logo: null },
  },
];

const demoSports = [
  { id: "s1", name: "Fútbol", slug: "football", icon: "⚽" },
];

export const demoFeedItems: FeedItem[] = [
  {
    id: "pick-1", userId: "demo-1", matchId: "demo-m1", sportId: "s1",
    market: "1X2 - Local", odds: 2.10, stake: 7, result: "PENDING",
    comment: "El Madrid en casa es muy fuerte este año. Con Mbappé en gran forma y Vini Jr en racha, veo difícil que el Barça saque algo del Bernabéu. 🔥",
    isPublic: true, createdAt: new Date(ago(0.5)), updatedAt: new Date(),
    user: demoUsers[0], match: demoMatches[0], sport: demoSports[0],
    _count: { comments: 12, likes: 45 }, isLiked: false, isFollowing: false,
  },
  {
    id: "pick-2", userId: "demo-2", matchId: "demo-m2", sportId: "s1",
    market: "Over 2.5", odds: 1.85, stake: 5, result: "WON",
    comment: "City y Arsenal siempre dan partidos con goles. Estadísticamente en los últimos 5 enfrentamientos hubo más de 2.5 goles.",
    isPublic: true, createdAt: new Date(ago(2)), updatedAt: new Date(),
    user: demoUsers[1], match: demoMatches[1], sport: demoSports[0],
    _count: { comments: 8, likes: 32 }, isLiked: false, isFollowing: false,
  },
  {
    id: "pick-3", userId: "demo-3", matchId: "demo-m3", sportId: "s1",
    market: "Ambos Marcan - Sí", odds: 1.75, stake: 8, result: "WON",
    comment: "Der Klassiker nunca decepciona. Bayern y Dortmund siempre dan espectáculo. BTTS es apuesta segura aquí.",
    isPublic: true, createdAt: new Date(ago(5)), updatedAt: new Date(),
    user: demoUsers[2], match: demoMatches[2], sport: demoSports[0],
    _count: { comments: 15, likes: 67 }, isLiked: false, isFollowing: false,
  },
  {
    id: "pick-4", userId: "demo-4", matchId: "demo-m5", sportId: "s1",
    market: "Under 2.5", odds: 1.90, stake: 4, result: "WON",
    comment: "PSG en Ligue 1 suele ganar por la mínima contra equipos grandes. Bajo expected goals en los últimos partidos.",
    isPublic: true, createdAt: new Date(ago(1)), updatedAt: new Date(),
    user: demoUsers[3], match: demoMatches[4], sport: demoSports[0],
    _count: { comments: 5, likes: 18 }, isLiked: false, isFollowing: false,
  },
  {
    id: "pick-5", userId: "demo-5", matchId: "demo-m4", sportId: "s1",
    market: "Doble Oportunidad 1X", odds: 1.45, stake: 9, result: "PENDING",
    comment: "Juventus en casa rara vez pierde. Con la defensa más sólida de Serie A, confío en que al menos empatan.",
    isPublic: true, createdAt: new Date(ago(0.3)), updatedAt: new Date(),
    user: demoUsers[4], match: demoMatches[3], sport: demoSports[0],
    _count: { comments: 3, likes: 22 }, isLiked: false, isFollowing: false,
  },
  {
    id: "pick-7", userId: "demo-1", matchId: "demo-m2", sportId: "s1",
    market: "Handicap -1", odds: 2.40, stake: 3, result: "LOST",
    comment: "Arriesgué con el handicap del City. No salió pero era buena cuota.",
    isPublic: true, createdAt: new Date(ago(4)), updatedAt: new Date(),
    user: demoUsers[0], match: demoMatches[1], sport: demoSports[0],
    _count: { comments: 6, likes: 14 }, isLiked: false, isFollowing: false,
  },
  {
    id: "pick-8", userId: "demo-2", matchId: "demo-m3", sportId: "s1",
    market: "1X2 - Local", odds: 1.55, stake: 6, result: "WON",
    comment: "Bayern en casa contra el Dortmund. El historial habla por sí solo.",
    isPublic: true, createdAt: new Date(ago(6)), updatedAt: new Date(),
    user: demoUsers[1], match: demoMatches[2], sport: demoSports[0],
    _count: { comments: 4, likes: 28 }, isLiked: false, isFollowing: false,
  },
];

const demoStats: Record<string, UserStats> = {
  "demo-1": {
    id: "s1", userId: "demo-1", totalPicks: 342, wonPicks: 198, lostPicks: 130, pendingPicks: 14,
    totalStake: 1680, totalProfit: 245.5, roi: 14.6, yield: 8.2, winRate: 60.4, currentStreak: 3, maxStreak: 11, updatedAt: new Date(),
  },
  "demo-2": {
    id: "s2", userId: "demo-2", totalPicks: 198, wonPicks: 120, lostPicks: 72, pendingPicks: 6,
    totalStake: 890, totalProfit: 178.3, roi: 20.0, yield: 11.5, winRate: 62.5, currentStreak: 5, maxStreak: 9, updatedAt: new Date(),
  },
  "demo-3": {
    id: "s3", userId: "demo-3", totalPicks: 567, wonPicks: 340, lostPicks: 210, pendingPicks: 17,
    totalStake: 3200, totalProfit: 520.8, roi: 16.3, yield: 9.1, winRate: 61.8, currentStreak: 4, maxStreak: 14, updatedAt: new Date(),
  },
  "demo-4": {
    id: "s4", userId: "demo-4", totalPicks: 145, wonPicks: 82, lostPicks: 58, pendingPicks: 5,
    totalStake: 650, totalProfit: 89.2, roi: 13.7, yield: 7.8, winRate: 58.6, currentStreak: -2, maxStreak: 7, updatedAt: new Date(),
  },
  "demo-5": {
    id: "s5", userId: "demo-5", totalPicks: 230, wonPicks: 145, lostPicks: 78, pendingPicks: 7,
    totalStake: 1100, totalProfit: 310.4, roi: 28.2, yield: 15.3, winRate: 65.0, currentStreak: 6, maxStreak: 12, updatedAt: new Date(),
  },
};

export const demoRanking: RankingUser[] = [
  { rank: 1, user: demoUsers[4], stats: demoStats["demo-5"] },
  { rank: 2, user: demoUsers[1], stats: demoStats["demo-2"] },
  { rank: 3, user: demoUsers[2], stats: demoStats["demo-3"] },
  { rank: 4, user: demoUsers[0], stats: demoStats["demo-1"] },
  { rank: 5, user: demoUsers[3], stats: demoStats["demo-4"] },
];

export function getDemoProfile(username: string) {
  const user = demoUsers.find((u) => u.username === username);
  if (!user) return null;
  return {
    ...user,
    stats: demoStats[user.id] || null,
    isFollowing: false,
  };
}

export function getDemoUserPicks(username: string) {
  const user = demoUsers.find((u) => u.username === username);
  if (!user) return [];
  return demoFeedItems.filter((p) => p.userId === user.id);
}
