import { LudoColor, LudoPlayer } from './ludoEngine';
import { apiRequest } from '../api/client';

export interface LudoSavedSession {
  id: string;
  gameMode: 'classic' | 'quick';
  playerCount: 2 | 3 | 4;
  targetLeagueId: number;
  seatConfig: Record<
    LudoColor,
    {
      type: 'player' | 'bot' | 'guest';
      playerId: string;
      guestName: string;
    }
  >;
  players: LudoPlayer[];
  turnColor: LudoColor;
  diceValue: number | null;
  waitingForMove: boolean;
  gameLogs: string[];
  activeTurnNotice: string;
  rankings: Array<{ rank: number; player: LudoPlayer }>;
  includeCombatPoints?: boolean;
  gameState: 'setup' | 'playing' | 'gameover';
  updatedAt: number;
}

export interface PendingMatchResult {
  position: number;
  player_id?: number;
  player_name?: string;
  is_bot?: number | boolean;
  kills: number;
  deaths: number;
}

export interface PendingMatch {
  id: string;
  match_date: string;
  match_time: string;
  player_count: number;
  league_id: number;
  notes: string;
  include_combat_points?: boolean;
  action_logs?: any;
  kill_logs?: any;
  results: PendingMatchResult[];
  createdAt: number;
  retryCount: number;
}

const ACTIVE_SESSION_KEY = 'ac_ludo_active_game_session';
const OUTBOX_KEY = 'ac_ludo_pending_matches_outbox';

/**
 * Persist active in-progress game state to local storage.
 * Completely client-side and instantaneous.
 */
export function saveActiveLudoSession(session: Omit<LudoSavedSession, 'updatedAt'>) {
  try {
    const data: LudoSavedSession = {
      ...session,
      updatedAt: Date.now()
    };
    localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn('Unable to persist active Ludo game session to localStorage:', err);
  }
}

/**
 * Retrieve saved in-progress game session if one exists.
 */
export function loadActiveLudoSession(): LudoSavedSession | null {
  try {
    const raw = localStorage.getItem(ACTIVE_SESSION_KEY);
    if (!raw) return null;
    const parsed: LudoSavedSession = JSON.parse(raw);
    if (!parsed || !parsed.players || parsed.players.length === 0) {
      return null;
    }
    return parsed;
  } catch (err) {
    console.warn('Error reading active Ludo game session:', err);
    return null;
  }
}

/**
 * Remove saved session when game is reset or match is fully concluded.
 */
export function clearActiveLudoSession() {
  try {
    localStorage.removeItem(ACTIVE_SESSION_KEY);
  } catch (err) {
    console.warn('Error clearing active Ludo game session:', err);
  }
}

/**
 * Get all matches queued in local outbox waiting to be synced to the backend.
 */
export function getPendingMatches(): PendingMatch[] {
  try {
    const raw = localStorage.getItem(OUTBOX_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as PendingMatch[];
  } catch (err) {
    console.warn('Error reading offline outbox matches:', err);
    return [];
  }
}

/**
 * Queue a completed match to local offline storage if network is unstable or offline.
 */
export function queuePendingMatch(
  payload: Omit<PendingMatch, 'id' | 'createdAt' | 'retryCount'>
): PendingMatch {
  const match: PendingMatch = {
    ...payload,
    id: `local_match_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    createdAt: Date.now(),
    retryCount: 0
  };

  try {
    const current = getPendingMatches();
    current.push(match);
    localStorage.setItem(OUTBOX_KEY, JSON.stringify(current));
  } catch (err) {
    console.warn('Failed to queue offline match:', err);
  }

  return match;
}

/**
 * Synchronize all locally queued offline matches to the database.
 */
export async function syncPendingMatches(
  onSuccess?: () => void
): Promise<{ synced: number; failed: number }> {
  const pending = getPendingMatches();
  if (pending.length === 0) {
    return { synced: 0, failed: 0 };
  }

  let synced = 0;
  let failed = 0;
  const remaining: PendingMatch[] = [];

  for (const match of pending) {
    try {
      await apiRequest<{ friendlyId: string }>('/matches', {
        method: 'POST',
        body: JSON.stringify({
          match_date: match.match_date,
          match_time: match.match_time,
          player_count: match.player_count,
          league_id: match.league_id,
          include_combat_points: match.include_combat_points,
          action_logs: match.action_logs,
          kill_logs: match.kill_logs,
          notes: `${match.notes} [Synced Offline Game]`,
          results: match.results
        })
      });
      synced++;
    } catch (err) {
      console.warn('Could not sync pending offline match, will retry later:', err);
      failed++;
      remaining.push({
        ...match,
        retryCount: match.retryCount + 1
      });
    }
  }

  try {
    if (remaining.length > 0) {
      localStorage.setItem(OUTBOX_KEY, JSON.stringify(remaining));
    } else {
      localStorage.removeItem(OUTBOX_KEY);
    }
  } catch (e) {
    console.warn('Failed to update offline outbox storage:', e);
  }

  if (synced > 0 && onSuccess) {
    onSuccess();
  }

  return { synced, failed };
}

/**
 * Check if the browser currently reports network connectivity.
 */
export function isBrowserOnline(): boolean {
  if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') {
    return navigator.onLine;
  }
  return true;
}

/**
 * Listen for network connectivity transitions and auto-sync when online.
 */
export function initNetworkAutoSync(onSyncSuccess?: () => void): () => void {
  const handleOnline = () => {
    syncPendingMatches(onSyncSuccess);
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('online', handleOnline);
    // Also try an initial sync if online
    if (navigator.onLine) {
      syncPendingMatches(onSyncSuccess);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }

  return () => {};
}
