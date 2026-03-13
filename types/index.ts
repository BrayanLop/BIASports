export type Role = "USER" | "ADMIN";
export type PickResult = "PENDING" | "WON" | "LOST" | "VOID";

export interface User {
  id: string;
  email: string;
  username: string;
  name: string | null;
  image: string | null;
  bio: string | null;
  createdAt: Date;
  updatedAt: Date;
  role: Role;
  _count?: {
    followers: number;
    following: number;
    picks: number;
  };
}

export interface UserStats {
  id: string;
  userId: string;
  totalPicks: number;
  wonPicks: number;
  lostPicks: number;
  pendingPicks: number;
  totalStake: number;
  totalProfit: number;
  roi: number;
  yield: number;
  winRate: number;
  currentStreak: number;
  maxStreak: number;
  updatedAt: Date;
}

export interface Sport {
  id: string;
  name: string;
  slug: string;
  icon: string;
}

export interface League {
  id: string;
  name: string;
  sportId: string;
  country: string | null;
  logo: string | null;
  sport?: Sport;
}

export interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  leagueId: string;
  sportId: string;
  matchDate: Date;
  status: string;
  externalId: string | null;
  league?: League;
  sport?: Sport;
}

export interface Pick {
  id: string;
  userId: string;
  matchId: string;
  sportId: string;
  market: string;
  odds: number;
  stake: number;
  result: PickResult;
  comment: string | null;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
  user?: User;
  match?: Match;
  sport?: Sport;
  _count?: {
    comments: number;
    likes: number;
  };
  isLiked?: boolean;
  isFollowing?: boolean;
}

export interface Comment {
  id: string;
  content: string;
  userId: string;
  pickId: string;
  createdAt: Date;
  user?: User;
}

export interface Like {
  id: string;
  userId: string;
  pickId: string;
  createdAt: Date;
}

export interface FeedItem extends Pick {
  user: User;
  match: Match;
  sport: Sport;
  _count: {
    comments: number;
    likes: number;
  };
  isLiked: boolean;
  isFollowing: boolean;
}

export interface RankingUser {
  user: User;
  stats: UserStats;
  rank: number;
}

export type FeedFilterType = "all" | "following" | "trending";
export type SportFilterType = "football";
export type RankingMetric = "roi" | "winrate" | "profit";

export interface PaginationParams {
  page?: number;
  limit?: number;
  cursor?: string;
}

export interface ApiResponse<T> {
  data: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  nextCursor?: string;
  hasMore: boolean;
  total?: number;
}

export interface CreatePickPayload {
  matchId: string;
  sportId: string;
  market: string;
  odds: number;
  stake: number;
  comment?: string;
  isPublic?: boolean;
}

export interface UpdatePickPayload {
  result?: PickResult;
  comment?: string;
  isPublic?: boolean;
}

export interface RegisterPayload {
  email: string;
  username: string;
  name: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface ExtendedSession {
  user: {
    id: string;
    email: string;
    name: string | null;
    image: string | null;
    username: string;
  };
  expires: string;
}
