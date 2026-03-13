import axios from "axios";

const API_BASE_URL = "https://v3.football.api-sports.io";
const API_KEY = (process.env.SPORTS_API_KEY ?? "").trim();

const APP_TIMEZONE = (process.env.APP_TIMEZONE ?? process.env.TZ ?? "UTC").trim();

function resolveIanaTimeZone(timeZone: string): string {
  const tz = (timeZone || "").trim();
  if (!tz) return "UTC";
  try {
    // Validate IANA timezone. Throws RangeError for invalid IDs.
    new Intl.DateTimeFormat("en-US", { timeZone: tz }).format(new Date());
    return tz;
  } catch {
    return "UTC";
  }
}

const API_SPORTS_TIMEZONE = resolveIanaTimeZone(APP_TIMEZONE);

const THESPORTSDB_BASE_URL = "https://www.thesportsdb.com/api/v1/json";
// TheSportsDB documents a public test key "123"; for reliability, set your own.
const THESPORTSDB_KEY = (process.env.THESPORTSDB_KEY ?? "123").trim();

function logApiSportsError(context: string, error: unknown) {
  if (!axios.isAxiosError(error)) {
    console.error(context, error);
    return;
  }

  const status = error.response?.status;
  const data = error.response?.data;
  console.error(context, {
    message: error.message,
    status,
    data,
  });
}

function formatYmdInTimeZone(date: Date, timeZone: string) {
  // en-CA yields ISO-like ordering; formatToParts makes it robust.
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const get = (type: string) => parts.find((p) => p.type === type)?.value;
  const y = get("year");
  const m = get("month");
  const d = get("day");
  if (!y || !m || !d) {
    // Fallback (should be rare)
    const yy = date.getUTCFullYear();
    const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(date.getUTCDate()).padStart(2, "0");
    return `${yy}-${mm}-${dd}`;
  }
  return `${y}-${m}-${d}`;
}

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    // API-Sports (direct) header
    "x-apisports-key": API_KEY,
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

interface ApiSportsTeamSearchItem {
  team: {
    id: number;
    name: string;
    logo: string;
  };
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

interface TheSportsDbEvent {
  idEvent: string;
  strEvent?: string | null;
  strSport?: string | null;
  strLeague?: string | null;
  strCountry?: string | null;
  idHomeTeam?: string | null;
  idAwayTeam?: string | null;
  strHomeTeam?: string | null;
  strAwayTeam?: string | null;
  intHomeScore?: string | null;
  intAwayScore?: string | null;
  dateEvent?: string | null; // YYYY-MM-DD
  strTime?: string | null; // HH:mm:ss
  strTimestamp?: string | null;
  strStatus?: string | null;
}

function normalizeTheSportsDbStatus(
  eventIso: string | null,
  homeScore: number | null,
  awayScore: number | null,
  rawStatus?: string | null
) {
  const s = (rawStatus || "").toLowerCase();
  if (s.includes("postpon") || s.includes("cancel")) return "POSTPONED";
  if (s.includes("finished") || s.includes("ft")) return "FINISHED";

  if (!eventIso) return "SCHEDULED";
  const t = new Date(eventIso).getTime();
  if (Number.isNaN(t)) return "SCHEDULED";

  // If the event is in the future, it's scheduled even if the API sends 0-0 placeholders.
  if (t > Date.now()) return "SCHEDULED";

  // TheSportsDB free endpoints don't reliably provide live states.
  // If it's in the past and we have scores, consider it finished.
  if (homeScore !== null && awayScore !== null) return "FINISHED";
  return "SCHEDULED";
}

function normalizeTheSportsDbMatch(e: TheSportsDbEvent): NormalizedMatch {
  const date = e.strTimestamp
    ? new Date(e.strTimestamp).toISOString()
    : e.dateEvent
      ? new Date(`${e.dateEvent}T${e.strTime || "00:00:00"}Z`).toISOString()
      : new Date().toISOString();

  const parsedHome = e.intHomeScore != null && e.intHomeScore !== "" ? Number(e.intHomeScore) : null;
  const parsedAway = e.intAwayScore != null && e.intAwayScore !== "" ? Number(e.intAwayScore) : null;

  const t = new Date(date).getTime();
  const isFuture = Number.isFinite(t) ? t > Date.now() : false;

  // Some TheSportsDB schedules provide 0-0 placeholders for not-started matches.
  // Hide those until the match is actually played.
  const homeScore =
    isFuture && parsedHome === 0 && parsedAway === 0 ? null : parsedHome;
  const awayScore =
    isFuture && parsedHome === 0 && parsedAway === 0 ? null : parsedAway;

  return {
    id: e.idEvent,
    homeTeam: e.strHomeTeam || "TBD",
    awayTeam: e.strAwayTeam || "TBD",
    homeTeamLogo: "",
    awayTeamLogo: "",
    homeScore: Number.isFinite(homeScore) ? homeScore : null,
    awayScore: Number.isFinite(awayScore) ? awayScore : null,
    leagueName: e.strLeague || "",
    leagueLogo: "",
    country: e.strCountry || "",
    matchDate: date,
    status: normalizeTheSportsDbStatus(
      date,
      Number.isFinite(homeScore) ? homeScore : null,
      Number.isFinite(awayScore) ? awayScore : null,
      e.strStatus
    ),
    externalId: e.idEvent,
  };
}

interface TheSportsDbTeam {
  idTeam: string;
  strTeam?: string | null;
  strSport?: string | null;
  strTeamShort?: string | null;
  strAlternate?: string | null;
}

function normalizeLooseText(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_\-]+/g, " ")
    .replace(/\s+/g, " ");
}

function pickBestTheSportsDbTeam(teams: TheSportsDbTeam[], query: string): TheSportsDbTeam | null {
  if (teams.length === 0) return null;
  const q = normalizeLooseText(query);

  const scored = teams
    .map((team) => {
      const name = normalizeLooseText(team.strTeam || "");
      const shortName = normalizeLooseText(team.strTeamShort || "");
      const alt = normalizeLooseText(team.strAlternate || "");

      let score = 0;
      if (name === q || shortName === q) score += 100;
      if (name.startsWith(q) || shortName.startsWith(q)) score += 60;
      if (name.includes(q) || shortName.includes(q)) score += 25;
      if (alt.includes(q)) score += 10;

      // Prefer soccer only
      if ((team.strSport || "").toLowerCase() === "soccer") score += 5;

      return { team, score };
    })
    .sort((a, b) => b.score - a.score);

  return scored[0]?.team ?? null;
}

function scoreTheSportsDbTeams(teams: TheSportsDbTeam[], query: string): Array<{ team: TheSportsDbTeam; score: number }> {
  const q = normalizeLooseText(query);
  return teams
    .map((team) => {
      const name = normalizeLooseText(team.strTeam || "");
      const shortName = normalizeLooseText(team.strTeamShort || "");
      const alt = normalizeLooseText(team.strAlternate || "");

      let score = 0;
      if (name === q || shortName === q) score += 100;
      if (name.startsWith(q) || shortName.startsWith(q)) score += 60;
      if (name.includes(q) || shortName.includes(q)) score += 25;
      if (alt.includes(q)) score += 10;

      if ((team.strSport || "").toLowerCase() === "soccer") score += 5;
      return { team, score };
    })
    .sort((a, b) => b.score - a.score);
}

async function searchTheSportsDbTeams(query: string): Promise<TheSportsDbTeam[]> {
  const q = query.trim();
  if (!q) return [];

  const url = `${THESPORTSDB_BASE_URL}/${THESPORTSDB_KEY}/searchteams.php`;
  try {
    const res = await axios.get(url, { params: { t: q } });
    const teams: TheSportsDbTeam[] = res.data?.teams || [];
    return teams.filter((t) => (t.strSport || "").toLowerCase() === "soccer");
  } catch (error) {
    console.error("Error searching TheSportsDB teams:", error);
    return [];
  }
}

async function fetchTheSportsDbNextEventsByTeamId(teamId: string): Promise<TheSportsDbEvent[]> {
  const url = `${THESPORTSDB_BASE_URL}/${THESPORTSDB_KEY}/eventsnext.php`;
  try {
    const res = await axios.get(url, { params: { id: teamId } });
    const events: TheSportsDbEvent[] = res.data?.events || [];
    return events;
  } catch (error) {
    console.error("Error fetching TheSportsDB next team events:", error);
    return [];
  }
}

async function searchUpcomingMatchesByText(params: {
  query: string;
  daysAhead: number;
  maxResults?: number;
}): Promise<NormalizedMatch[]> {
  const q = normalizeLooseText(params.query);
  const days = Math.max(1, Math.min(21, Math.floor(params.daysAhead)));
  const maxResults = Math.max(10, Math.min(200, params.maxResults ?? 60));

  // Use a stable UTC noon anchor to avoid DST edge cases when stepping by days.
  const base = new Date();
  base.setUTCHours(12, 0, 0, 0);

  const seen = new Set<string>();
  const out: NormalizedMatch[] = [];

  for (let i = -1; i < days; i++) {
    const d = new Date(base);
    d.setUTCDate(d.getUTCDate() + i);
    const date = formatYmdInTimeZone(d, APP_TIMEZONE);
    const matches = await fetchMatchesByDate(date);
    for (const m of matches) {
      const key = m.externalId || m.id;
      if (seen.has(key)) continue;

      const hay = normalizeLooseText(`${m.homeTeam} ${m.awayTeam} ${m.leagueName} ${m.country}`);
      if (!hay.includes(q)) continue;

      seen.add(key);
      out.push(m);
      if (out.length >= maxResults) {
        out.sort((a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime());
        return out;
      }
    }
  }

  out.sort((a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime());
  return out;
}

async function apiSportsSearchTeams(query: string): Promise<ApiSportsTeamSearchItem[]> {
  if (!API_KEY) return [];
  try {
    const res = await apiClient.get("/teams", {
      params: { search: query.trim() },
    });
    const items: ApiSportsTeamSearchItem[] = res.data?.response || [];
    return items;
  } catch (error) {
    logApiSportsError("Error searching teams (API-Sports)", error);
    return [];
  }
}

async function apiSportsFetchUpcomingFixturesByTeamId(params: {
  teamId: number;
  fromYmd: string;
  toYmd: string;
}): Promise<NormalizedMatch[]> {
  try {
    const res = await apiClient.get("/fixtures", {
      params: {
        team: params.teamId,
        from: params.fromYmd,
        to: params.toYmd,
        timezone: API_SPORTS_TIMEZONE,
      },
    });

    const response: ApiMatch[] = res.data?.response || [];
    const mapped = response.map(normalizeMatch);
    if (mapped.length > 0) return mapped;

    // Some teams may not return fixtures in the from/to window (off-season, API quirks).
    // Retry a cheap query for the next fixtures and let the caller filter by date range.
    const nextRes = await apiClient.get("/fixtures", {
      params: {
        team: params.teamId,
        next: 20,
        timezone: API_SPORTS_TIMEZONE,
      },
    });
    const nextResponse: ApiMatch[] = nextRes.data?.response || [];
    return nextResponse.map(normalizeMatch);
  } catch (error) {
    logApiSportsError("Error fetching fixtures by team (API-Sports)", error);
    return [];
  }
}

export async function searchUpcomingFootballMatches(query: string, daysAhead: number = 30): Promise<NormalizedMatch[]> {
  const q = query.trim();
  if (!q) return [];

  const days = Math.max(1, Math.min(60, Math.floor(daysAhead)));
  const now = Date.now();
  const max = now + days * 24 * 60 * 60 * 1000;

  // Prefer API-Sports when available: better coverage for many leagues/teams.
  if (API_KEY) {
    const from = formatYmdInTimeZone(new Date(), APP_TIMEZONE);
    const toDate = new Date();
    toDate.setUTCHours(12, 0, 0, 0);
    toDate.setUTCDate(toDate.getUTCDate() + days);
    const to = formatYmdInTimeZone(toDate, APP_TIMEZONE);

    const teams = await apiSportsSearchTeams(q);
    const topTeams = teams
      .slice(0, 5)
      .map((t) => t.team)
      .filter((t) => typeof t?.id === "number");

    if (topTeams.length > 0) {
      const lists = await Promise.all(
        topTeams.map((t) =>
          apiSportsFetchUpcomingFixturesByTeamId({
            teamId: t.id,
            fromYmd: from,
            toYmd: to,
          })
        )
      );

      const matches = lists
        .flat()
        .filter((m) => {
          const t = new Date(m.matchDate).getTime();
          if (Number.isNaN(t)) return false;
          return t >= now && t <= max;
        })
        .sort((a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime());

      const seen = new Set<string>();
      const unique = matches.filter((m) => {
        const key = m.externalId || m.id;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      if (unique.length > 0) return unique;
    }
  }

  let teams = await searchTheSportsDbTeams(q);

  // TheSportsDB `searchteams` is not fuzzy; for ambiguous single-word queries like "Nacional",
  // try common prefixes to match full club names (e.g. "Atlético Nacional").
  if (teams.length === 0) {
    const tokenCount = q.split(/\s+/).filter(Boolean).length;
    if (tokenCount === 1 && q.length >= 4) {
      const alternatives = [`Atletico ${q}`, `Atlético ${q}`, `Club ${q}`];
      const altLists = await Promise.all(alternatives.map((alt) => searchTheSportsDbTeams(alt)));
      const merged = altLists.flat();
      if (merged.length > 0) {
        const seenTeamIds = new Set<string>();
        teams = merged.filter((t) => {
          if (!t.idTeam) return false;
          if (seenTeamIds.has(t.idTeam)) return false;
          seenTeamIds.add(t.idTeam);
          return true;
        });
      }
    }
  }

  // If we still have no exact team matches, fall back to partial schedule scan.
  // This makes short queries like "nac" useful even when TheSportsDB doesn't fuzzy-match teams.
  if (teams.length === 0) {
    if (q.length < 2) return [];
    return searchUpcomingMatchesByText({ query: q, daysAhead: days, maxResults: 60 });
  }

  // With the free key, `eventsnext` is limited, so we fetch from a few top candidates.
  const scored = scoreTheSportsDbTeams(teams, q);
  const candidates = scored
    .filter((x) => x.score > 0)
    .slice(0, 3)
    .map((x) => x.team);

  const fallbackBest = pickBestTheSportsDbTeam(teams, q);
  const finalCandidates = candidates.length > 0 ? candidates : fallbackBest ? [fallbackBest] : [];
  if (finalCandidates.length === 0) return [];

  const eventsLists = await Promise.all(finalCandidates.map((t) => fetchTheSportsDbNextEventsByTeamId(t.idTeam)));
  const matches = eventsLists
    .flat()
    .filter((e) => (e.strSport || "").toLowerCase() === "soccer")
    .filter((e) => Boolean(e.strTimestamp || e.dateEvent))
    .map(normalizeTheSportsDbMatch)
    .filter((m) => {
      const t = new Date(m.matchDate).getTime();
      if (Number.isNaN(t)) return false;
      return t >= now && t <= max;
    })
    .sort((a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime());

  // Deduplicate by externalId/id
  const seen = new Set<string>();
  const unique = matches.filter((m) => {
    const key = m.externalId || m.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // If TheSportsDB 'eventsnext' doesn't provide anything, fall back to event search / day schedules.
  if (unique.length === 0) {
    const from = now;
    const to = max;

    // 1) Try event-based search (can find fixtures even when team next-events is empty)
    const byEvents = await searchFootballEvents(q);
    const inWindow = byEvents
      .filter((m) => {
        const t = new Date(m.matchDate).getTime();
        if (Number.isNaN(t)) return false;
        return t >= from && t <= to;
      })
      .sort((a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime());

    if (inWindow.length > 0) return inWindow;

    // 2) Robust partial search: scan upcoming day schedules (capped to avoid too many requests).
    return searchUpcomingMatchesByText({ query: q, daysAhead: days, maxResults: 60 });
  }

  return unique;
}

export async function searchFootballEvents(query: string): Promise<NormalizedMatch[]> {
  const q = query.trim();
  if (!q) return [];

  const url = `${THESPORTSDB_BASE_URL}/${THESPORTSDB_KEY}/searchevents.php`;
  try {
    const res = await axios.get(url, { params: { e: q } });
    const events: TheSportsDbEvent[] = res.data?.event || [];
    return events
      .filter((e) => (e.strSport || "").toLowerCase() === "soccer")
      .map(normalizeTheSportsDbMatch)
      .sort((a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime());
  } catch (error) {
    console.error("Error searching TheSportsDB events:", error);
    return [];
  }
}

async function lookupTheSportsDbEventById(eventId: string): Promise<NormalizedMatch | null> {
  const url = `${THESPORTSDB_BASE_URL}/${THESPORTSDB_KEY}/lookupevent.php`;
  try {
    const res = await axios.get(url, { params: { id: eventId } });
    const events: TheSportsDbEvent[] = res.data?.events || [];
    const e = events[0];
    if (!e) return null;
    if ((e.strSport || "").toLowerCase() !== "soccer") return null;
    return normalizeTheSportsDbMatch(e);
  } catch (error) {
    console.error("Error looking up TheSportsDB event:", error);
    return null;
  }
}

async function fetchTheSportsDbEventsByDay(date: string): Promise<TheSportsDbEvent[]> {
  const url = `${THESPORTSDB_BASE_URL}/${THESPORTSDB_KEY}/eventsday.php`;
  try {
    const res = await axios.get(url, { params: { d: date, s: "Soccer" } });
    const events: TheSportsDbEvent[] = res.data?.events || [];
    return events;
  } catch (error) {
    console.error("Error fetching TheSportsDB events by day:", error);
    return [];
  }
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
    const today = formatYmdInTimeZone(new Date(), APP_TIMEZONE);
    const events = await fetchTheSportsDbEventsByDay(today);
    return events
      .filter((e) => (e.strSport || "").toLowerCase() === "soccer")
      .map(normalizeTheSportsDbMatch)
      .sort((a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime());
  }

  try {
    const today = formatYmdInTimeZone(new Date(), APP_TIMEZONE);
    const response = await apiClient.get("/fixtures", {
      params: { date: today, timezone: API_SPORTS_TIMEZONE },
    });

    if (response.data?.response) {
      return response.data.response.map(normalizeMatch);
    }
    return [];
  } catch (error) {
    logApiSportsError("Error fetching today matches (API-Sports)", error);
    // Fallback to TheSportsDB so the UI still shows matches if API-Sports is misconfigured.
    console.warn("Falling back to TheSportsDB for today matches");
    const today = formatYmdInTimeZone(new Date(), APP_TIMEZONE);
    const events = await fetchTheSportsDbEventsByDay(today);
    return events
      .filter((e) => (e.strSport || "").toLowerCase() === "soccer")
      .map(normalizeTheSportsDbMatch)
      .sort((a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime());
  }
}

async function fetchMatchesByDate(date: string): Promise<NormalizedMatch[]> {
  if (!API_KEY) {
    const events = await fetchTheSportsDbEventsByDay(date);
    return events
      .filter((e) => (e.strSport || "").toLowerCase() === "soccer")
      .map(normalizeTheSportsDbMatch)
      .sort((a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime());
  }

  try {
    const response = await apiClient.get("/fixtures", {
      params: { date, timezone: API_SPORTS_TIMEZONE },
    });

    if (response.data?.response) {
      return response.data.response.map(normalizeMatch);
    }
    return [];
  } catch (error) {
    logApiSportsError("Error fetching matches by date (API-Sports)", error);
    console.warn("Falling back to TheSportsDB for matches by date", { date });
    const events = await fetchTheSportsDbEventsByDay(date);
    return events
      .filter((e) => (e.strSport || "").toLowerCase() === "soccer")
      .map(normalizeTheSportsDbMatch)
      .sort((a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime());
  }
}

export async function fetchUpcomingMatches(daysAhead: number = 7): Promise<NormalizedMatch[]> {
  const days = Math.max(1, Math.min(14, Math.floor(daysAhead)));
  // Use a stable UTC noon anchor to avoid DST edge cases when stepping by days.
  const base = new Date();
  base.setUTCHours(12, 0, 0, 0);

  const all: NormalizedMatch[] = [];
  // Include the previous day to avoid timezone drift (server UTC vs user local day).
  for (let i = -1; i < days; i++) {
    const d = new Date(base);
    d.setUTCDate(d.getUTCDate() + i);
    const date = formatYmdInTimeZone(d, APP_TIMEZONE);
    const matches = await fetchMatchesByDate(date);
    all.push(...matches);
  }

  // Deduplicate by externalId/id
  const seen = new Set<string>();
  const unique = all.filter((m) => {
    const key = m.externalId || m.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Keep chronological order
  unique.sort((a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime());
  return unique;
}

export async function fetchMatchById(matchId: string): Promise<NormalizedMatch | null> {
  if (!API_KEY) {
    return lookupTheSportsDbEventById(matchId);
  }

  try {
    const response = await apiClient.get("/fixtures", {
      params: { id: matchId, timezone: API_SPORTS_TIMEZONE },
    });

    if (response.data?.response?.[0]) {
      return normalizeMatch(response.data.response[0]);
    }
    return null;
  } catch (error) {
    logApiSportsError("Error fetching match by id (API-Sports)", error);
    console.warn("Falling back to TheSportsDB for match by id", { matchId });
    return lookupTheSportsDbEventById(matchId);
  }
}

export async function fetchLiveMatches(): Promise<NormalizedMatch[]> {
  if (!API_KEY) {
    // TheSportsDB v1 free endpoints don't provide a reliable livescore feed.
    return [];
  }

  try {
    const response = await apiClient.get("/fixtures", {
      params: { live: "all", timezone: API_SPORTS_TIMEZONE },
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
