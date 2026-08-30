import { Player, LeaderboardItem, MonthlyAwardPlayer, MatchResult } from '../types';

/**
 * Determines whether a player is an automated Bot or AI player.
 * Checks the is_bot flag as well as bot naming patterns.
 */
export function isBotPlayer(
  player?: {
    is_bot?: number | boolean | null;
    full_name?: string | null;
    name?: string | null;
    player_name?: string | null;
    nickname?: string | null;
    player_nickname?: string | null;
  } | null
): boolean {
  if (!player) return false;

  // Check explicit database / model flag
  if (player.is_bot === 1 || player.is_bot === true) {
    return true;
  }

  // Check full_name / name / player_name patterns
  const name = (player.full_name || player.name || player.player_name || '').toLowerCase().trim();
  if (
    name.startsWith('bot ') ||
    name.startsWith('bot-') ||
    name.startsWith('[bot]') ||
    name === 'bot' ||
    name.includes('(ai)') ||
    name.includes('[ai]')
  ) {
    return true;
  }

  // Check nickname patterns
  const nickname = (player.nickname || player.player_nickname || '').toLowerCase().trim();
  if (
    nickname.startsWith('bot ') ||
    nickname.startsWith('bot-') ||
    nickname.startsWith('[bot]') ||
    nickname === 'bot' ||
    nickname.includes('(ai)')
  ) {
    return true;
  }

  return false;
}

/**
 * Filters out all automated Bot / AI players from a list of players or stats records.
 */
export function filterHumanPlayers<T extends object = any>(
  items: T[] = []
): T[] {
  if (!Array.isArray(items)) return [];
  return items.filter((item) => !isBotPlayer(item as any));
}
