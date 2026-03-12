import axios from "axios";

const API_BASE_URL = "https://v3.football.api-sports.io";
const API_KEY = process.env.SPORTS_API_KEY ?? "";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "x-rapidapi-key": API_KEY,
    "x-rapidapi-host": "v3.football.api-sports.io",
  },
});

export interface ApiTeam {
  id: number;
  name: string;
  logo: string;
}

export interface ApiLeague {
  id: number;
  name: string;
  country: string;
  logo: string;
  flag: string;
  season: number;
  round: string;
}

export interface ApiFixtureStatus {
  long: string;
  short: string;
  elapsed: number | null;
}

export interface ApiFixture {
  id: number;
  referee: string | null;
  timezone: string;
  date: string;
  timestamp: number;
  status: ApiFixtureStatus;
}

export interface ApiGoals {
  home: number | null;
  away: number | null;
}

export interface ApiMatch {
  fixture: ApiFixture;
  league: ApiLeague;
  teams: {
    home: ApiTeam;
    away: ApiTeam;
  };
  goals: ApiGoals;
}

export interface NormalizedMatch {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeTeamLogo: string;
  awayTeamLogo: string;
  homeScore: number | null;
  awayScore: number | null;
  leagueName: string;
  leagueLogo: string;
  country: string;
  matchDate: string;
  status: string;
  externalId: string;
}

function normalizeStatus(status: string): string {
  const statusMap: Record<string, string> = {
    NS: "SCHEDULED",
    "1H": "LIVE",
    HT: "LIVE",
    "2H": "LIVE",
    ET: "LIVE",
    P: "LIVE",
    FT: "FINISHED",
    AET: "FINISHED",
    PEN: "FINISHED",
    BT: "LIVE",
    SUSP: "SUSPENDED",
    INT: "INTERRUPTED",
    PST: "POSTPONED",
    CANC: "CANCELLED",
    ABD: "ABANDONED",
    AWD: "AWARDED",
    WO: "WALKOVER",
    LIVE: "LIVE",
    TBD: "SCHEDULED",
  };
  return statusMap[status] ?? "SCHEDULED";
}

function normalizeMatch(apiMatch: ApiMatch): NormalizedMatch {
  return {
    id: apiMatch.fixture.id.toString(),
    homeTeam: apiMatch.teams.home.name,
    awayTeam: apiMatch.teams.away.name,
    homeTeamLogo: apiMatch.teams.home.logo,
    awayTeamLogo: apiMatch.teams.away.logo,
    homeScore: apiMatch.goals.home,
    awayScore: apiMatch.goals.away,
    leagueName: apiMatch.league.name,
    leagueLogo: apiMatch.league.logo,
    country: apiMatch.league.country,
    matchDate: apiMatch.fixture.date,
    status: normalizeStatus(apiMatch.fixture.status.short),
    externalId: apiMatch.fixture.id.toString(),
  };
}

export async function fetchTodayMatches(): Promise<NormalizedMatch[]> {
  if (!API_KEY) {
    return getMockMatches();
  }

  try {
    const today = new Date().toISOString().split("T")[0];
    const response = await apiClient.get("/fixtures", {
      params: { date: today },
    });

    if (response.data?.response) {
      return response.data.response.map(normalizeMatch);
    }
    return [];
  } catch (error) {
    console.error("Error fetching today matches:", error);
    return getMockMatches();
  }
}

export async function fetchMatchById(matchId: string): Promise<NormalizedMatch | null> {
  if (!API_KEY) {
    const mocks = getMockMatches();
    return mocks.find((m) => m.externalId === matchId) ?? null;
  }

  try {
    const response = await apiClient.get("/fixtures", {
      params: { id: matchId },
    });

    if (response.data?.response?.[0]) {
      return normalizeMatch(response.data.response[0]);
    }
    return null;
  } catch (error) {
    console.error("Error fetching match by id:", error);
    return null;
  }
}

export async function fetchLiveMatches(): Promise<NormalizedMatch[]> {
  if (!API_KEY) {
    return getMockMatches().filter((m) => m.status === "LIVE");
  }

  try {
    const response = await apiClient.get("/fixtures", {
      params: { live: "all" },
    });

    if (response.data?.response) {
      return response.data.response.map(normalizeMatch);
    }
    return [];
  } catch (error) {
    console.error("Error fetching live matches:", error);
    return [];
  }
}

function getMockMatches(): NormalizedMatch[] {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return [
    {
      id: "mock-1",
      homeTeam: "Real Madrid",
      awayTeam: "FC Barcelona",
      homeTeamLogo: "https://media.api-sports.io/football/teams/541.png",
      awayTeamLogo: "https://media.api-sports.io/football/teams/529.png",
      homeScore: null,
      awayScore: null,
      leagueName: "La Liga",
      leagueLogo: "https://media.api-sports.io/football/leagues/140.png",
      country: "Spain",
      matchDate: today.toISOString(),
      status: "SCHEDULED",
      externalId: "mock-1",
    },
    {
      id: "mock-2",
      homeTeam: "Manchester City",
      awayTeam: "Arsenal",
      homeTeamLogo: "https://media.api-sports.io/football/teams/50.png",
      awayTeamLogo: "https://media.api-sports.io/football/teams/42.png",
      homeScore: 2,
      awayScore: 1,
      leagueName: "Premier League",
      leagueLogo: "https://media.api-sports.io/football/leagues/39.png",
      country: "England",
      matchDate: today.toISOString(),
      status: "LIVE",
      externalId: "mock-2",
    },
    {
      id: "mock-3",
      homeTeam: "PSG",
      awayTeam: "Marseille",
      homeTeamLogo: "https://media.api-sports.io/football/teams/85.png",
      awayTeamLogo: "https://media.api-sports.io/football/teams/81.png",
      homeScore: null,
      awayScore: null,
      leagueName: "Ligue 1",
      leagueLogo: "https://media.api-sports.io/football/leagues/61.png",
      country: "France",
      matchDate: tomorrow.toISOString(),
      status: "SCHEDULED",
      externalId: "mock-3",
    },
    {
      id: "mock-4",
      homeTeam: "Bayern Munich",
      awayTeam: "Borussia Dortmund",
      homeTeamLogo: "https://media.api-sports.io/football/teams/157.png",
      awayTeamLogo: "https://media.api-sports.io/football/teams/165.png",
      homeScore: 3,
      awayScore: 0,
      leagueName: "Bundesliga",
      leagueLogo: "https://media.api-sports.io/football/leagues/78.png",
      country: "Germany",
      matchDate: today.toISOString(),
      status: "FINISHED",
      externalId: "mock-4",
    },
    {
      id: "mock-5",
      homeTeam: "Juventus",
      awayTeam: "AC Milan",
      homeTeamLogo: "https://media.api-sports.io/football/teams/496.png",
      awayTeamLogo: "https://media.api-sports.io/football/teams/489.png",
      homeScore: null,
      awayScore: null,
      leagueName: "Serie A",
      leagueLogo: "https://media.api-sports.io/football/leagues/135.png",
      country: "Italy",
      matchDate: today.toISOString(),
      status: "SCHEDULED",
      externalId: "mock-5",
    },
  ];
}
