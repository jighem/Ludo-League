export interface User {
  id: number;
  name: string;
  username: string;
  email: string | null;
  role: 'admin' | 'operator' | 'viewer';
  allowed_leagues?: number[] | string | null;
  is_active: number;
  created_at?: string;
  updated_at?: string;
}

export interface League {
  id: number;
  name: string;
  code: string;
  description: string | null;
  is_active: number;
  is_default: number;
  total_matches?: number;
  active_players_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Player {
  id: number;
  full_name: string;
  nickname: string | null;
  profile_photo: string | null;
  mobile_number: string | null;
  email: string | null;
  date_joined: string;
  is_active: number;
  total_matches?: number;
  created_at?: string;
}

export interface MatchResultInput {
  player_id: number;
  position: number;
  kills?: number;
  deaths?: number;
}

export interface MatchResult {
  id: number;
  match_id: number;
  player_id: number;
  player_name?: string;
  player_nickname?: string;
  profile_photo?: string;
  position: number;
  points_awarded: number;
  kills: number;
  deaths: number;
}

export interface Match {
  id: number;
  league_id: number;
  league_name?: string;
  league_code?: string;
  friendly_id: string;
  match_date: string;
  match_time: string;
  player_count: number;
  notes: string | null;
  action_logs?: string | string[] | null;
  kill_logs?: string | Array<{
    killer_id?: number;
    killer_name?: string;
    killer_color?: string;
    victim_id?: number;
    victim_name?: string;
    victim_color?: string;
    square?: number;
    turn?: number;
    timestamp?: string;
  }> | null;
  created_by: number | null;
  created_by_name?: string;
  results: MatchResult[];
  created_at: string;
}

export interface MonthlyAwardPlayer {
  player_id: number;
  full_name: string;
  nickname: string | null;
  profile_photo: string | null;
  total_matches: number;
  total_points: number;
  average_score: number;
  average_position: number;
  wins_1st: number;
  pos_2nd: number;
  pos_3rd: number;
  pos_4th: number;
  last_place: number;
  podium_finishes: number;
  win_pct: number;
  podium_pct: number;
  is_qualified: boolean;
  total_kills: number;
  total_deaths: number;
  net_combat_points: number;
}

export interface MonthlyAwardsData {
  month: string;
  awards: {
    champions: MonthlyAwardPlayer[];
    killerOfTheMonth: MonthlyAwardPlayer | null;
    topSingleMatchKill?: {
      kills: number;
      deaths: number;
      match_id: number;
      position: number;
      points_awarded: number;
      player_id: number;
      full_name: string;
      nickname: string | null;
      profile_photo: string | null;
      friendly_id: string;
      match_date: string;
    } | null;
    mostWins: MonthlyAwardPlayer | null;
    bestPodiumRate: MonthlyAwardPlayer | null;
    survivor: MonthlyAwardPlayer | null;
    bestWinRate: MonthlyAwardPlayer | null;
    mostActive: MonthlyAwardPlayer | null;
    pointsLeader: MonthlyAwardPlayer | null;
    mostImproved: {
      player: MonthlyAwardPlayer;
      prevAverage: number;
      currAverage: number;
      improvement: number;
    } | null;
    mostConsistent: {
      player: MonthlyAwardPlayer;
      stdDev: number;
    } | null;
  } | null;
  message?: string;
}

export interface LeaderboardItem {
  player_id: number;
  full_name: string;
  nickname: string | null;
  profile_photo: string | null;
  is_active: number;
  total_matches: number;
  total_points: number;
  average_score: number;
  average_position: number;
  wins_1st: number;
  pos_2nd: number;
  pos_3rd: number;
  pos_4th: number;
  last_place: number;
  podium_finishes: number;
  win_pct: number;
  podium_pct: number;
  is_qualified: boolean;
  rank: number;
  is_champion: boolean;
  total_kills: number;
  total_deaths: number;
  net_combat_points: number;
}

export interface ScoringRule {
  id: number;
  player_count: number;
  pos1_points: number;
  pos2_points: number;
  pos3_points: number;
  pos4_points: number;
}

export interface AppSettings {
  minMatchesQualification: number;
  appName: string;
  timezone: string;
  closedMonths: string[];
}

export interface AuditLog {
  id: number;
  user_id: number | null;
  username: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  details: string | null;
  ip_address: string | null;
  created_at: string;
}
