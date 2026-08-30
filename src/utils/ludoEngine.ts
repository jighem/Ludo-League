// Ludo Game Engine Types & Constants

export type TokenState = 'IN_YARD' | 'ACTIVE' | 'IN_HOME_PATH' | 'COMPLETED';

export type LudoColor = 'red' | 'green' | 'yellow' | 'blue';

export interface LudoToken {
  id: number; // 0, 1, 2, 3
  color: LudoColor;
  step: number; // -1 = in base/yard, 0..50 = on outer track, 51..55 = in home stretch, 56 = home finish
  hasWon: boolean;
}

export interface LudoPlayer {
  id: string;
  color: LudoColor;
  name: string;
  leaguePlayerId?: number;
  isBot: boolean;
  tokens: LudoToken[];
  rank?: number; // 1, 2, 3, 4 when finished
  hasFinished: boolean;
  consecutiveSixes: number;
  kills: number;
  deaths: number;
}

export interface GridPos {
  row: number;
  col: number;
}

// 52 Perimeter track coordinates (Row, Col) in clockwise order starting at Red Start
export const TRACK_COORDINATES: GridPos[] = [
  { row: 6, col: 1 },  // 0: Red Start (Safe)
  { row: 6, col: 2 },  // 1
  { row: 6, col: 3 },  // 2
  { row: 6, col: 4 },  // 3
  { row: 6, col: 5 },  // 4
  { row: 5, col: 6 },  // 5
  { row: 4, col: 6 },  // 6
  { row: 3, col: 6 },  // 7
  { row: 2, col: 6 },  // 8: Safe Star (Green track entry star)
  { row: 1, col: 6 },  // 9
  { row: 0, col: 6 },  // 10
  { row: 0, col: 7 },  // 11
  { row: 0, col: 8 },  // 12
  { row: 1, col: 8 },  // 13: Green Start (Safe)
  { row: 2, col: 8 },  // 14
  { row: 3, col: 8 },  // 15
  { row: 4, col: 8 },  // 16
  { row: 5, col: 8 },  // 17
  { row: 6, col: 9 },  // 18
  { row: 6, col: 10 }, // 19
  { row: 6, col: 11 }, // 20
  { row: 6, col: 12 }, // 21: Safe Star (Yellow track entry star)
  { row: 6, col: 13 }, // 22
  { row: 6, col: 14 }, // 23
  { row: 7, col: 14 }, // 24
  { row: 8, col: 14 }, // 25
  { row: 8, col: 13 }, // 26: Yellow Start (Safe)
  { row: 8, col: 12 }, // 27
  { row: 8, col: 11 }, // 28
  { row: 8, col: 10 }, // 29
  { row: 8, col: 9 },  // 30
  { row: 9, col: 8 },  // 31
  { row: 10, col: 8 }, // 32
  { row: 11, col: 8 }, // 33
  { row: 12, col: 8 }, // 34: Safe Star (Blue track entry star)
  { row: 13, col: 8 }, // 35
  { row: 14, col: 8 }, // 36
  { row: 14, col: 7 }, // 37
  { row: 14, col: 6 }, // 38
  { row: 13, col: 6 }, // 39: Blue Start (Safe)
  { row: 12, col: 6 }, // 40
  { row: 11, col: 6 }, // 41
  { row: 10, col: 6 }, // 42
  { row: 9, col: 6 },  // 43
  { row: 8, col: 5 },  // 44
  { row: 8, col: 4 },  // 45
  { row: 8, col: 3 },  // 46
  { row: 8, col: 2 },  // 47: Safe Star (Red track entry star)
  { row: 8, col: 1 },  // 48
  { row: 8, col: 0 },  // 49
  { row: 7, col: 0 },  // 50
  { row: 6, col: 0 },  // 51
];

// Home stretches for each color (steps 51 to 55, and 56 = Center Finish)
export const HOME_STRETCHES: Record<LudoColor, GridPos[]> = {
  red: [
    { row: 7, col: 1 }, // 51
    { row: 7, col: 2 }, // 52
    { row: 7, col: 3 }, // 53
    { row: 7, col: 4 }, // 54
    { row: 7, col: 5 }, // 55
    { row: 7, col: 6 }, // 56
  ],
  green: [
    { row: 1, col: 7 }, // 51
    { row: 2, col: 7 }, // 52
    { row: 3, col: 7 }, // 53
    { row: 4, col: 7 }, // 54
    { row: 5, col: 7 }, // 55
    { row: 6, col: 7 }, // 56
  ],
  yellow: [
    { row: 7, col: 13 }, // 51
    { row: 7, col: 12 }, // 52
    { row: 7, col: 11 }, // 53
    { row: 7, col: 10 }, // 54
    { row: 7, col: 9 },  // 55
    { row: 7, col: 8 },  // 56
  ],
  blue: [
    { row: 13, col: 7 }, // 51
    { row: 12, col: 7 }, // 52
    { row: 11, col: 7 }, // 53
    { row: 10, col: 7 }, // 54
    { row: 9, col: 7 },  // 55
    { row: 8, col: 7 },  // 56
  ]
};

// Dedicated non-overlapping finish quadrant slots in the center 3x3 for each token
export const FINISH_POSITIONS: Record<LudoColor, GridPos[]> = {
  green: [
    { row: 6.15, col: 6.55 },
    { row: 6.15, col: 7.45 },
    { row: 6.55, col: 6.8 },
    { row: 6.55, col: 7.2 },
  ],
  red: [
    { row: 6.55, col: 6.15 },
    { row: 7.45, col: 6.15 },
    { row: 6.8, col: 6.55 },
    { row: 7.2, col: 6.55 },
  ],
  yellow: [
    { row: 6.55, col: 7.85 },
    { row: 7.45, col: 7.85 },
    { row: 6.8, col: 7.45 },
    { row: 7.2, col: 7.45 },
  ],
  blue: [
    { row: 7.85, col: 6.55 },
    { row: 7.85, col: 7.45 },
    { row: 7.45, col: 6.8 },
    { row: 7.45, col: 7.2 },
  ]
};

// Base yard spawn coordinates for tokens (Row, Col) matching centered compact corner white pads
export const BASE_POSITIONS: Record<LudoColor, GridPos[]> = {
  // Top-Left: Red Base (Centered in 6x6 corner box)
  red: [
    { row: 1.8, col: 1.8 },
    { row: 1.8, col: 3.2 },
    { row: 3.2, col: 1.8 },
    { row: 3.2, col: 3.2 },
  ],
  // Top-Right: Green Base
  green: [
    { row: 1.8, col: 10.8 },
    { row: 1.8, col: 12.2 },
    { row: 3.2, col: 10.8 },
    { row: 3.2, col: 12.2 },
  ],
  // Bottom-Right: Yellow Base
  yellow: [
    { row: 10.8, col: 10.8 },
    { row: 10.8, col: 12.2 },
    { row: 12.2, col: 10.8 },
    { row: 12.2, col: 12.2 },
  ],
  // Bottom-Left: Blue Base
  blue: [
    { row: 10.8, col: 1.8 },
    { row: 10.8, col: 3.2 },
    { row: 12.2, col: 1.8 },
    { row: 12.2, col: 3.2 },
  ]
};

export const COLOR_START_INDICES: Record<LudoColor, number> = {
  red: 0,
  green: 13,
  yellow: 26,
  blue: 39,
};

export const SAFE_TRACK_INDICES = [0, 8, 13, 21, 26, 34, 39, 47];

export const COLOR_CONFIG: Record<LudoColor, {
  name: string;
  bgHex: string;
  badgeClass: string;
  borderClass: string;
  textClass: string;
  lightBg: string;
  gradient: string;
  tokenGradient: string;
}> = {
  red: {
    name: 'Red',
    bgHex: '#EF4444',
    badgeClass: 'bg-red-500 text-white',
    borderClass: 'border-red-500',
    textClass: 'text-red-500',
    lightBg: 'bg-red-50 dark:bg-red-950/40',
    gradient: 'from-red-600 to-rose-700',
    tokenGradient: 'radial-gradient(circle at 35% 35%, #FCA5A5 0%, #EF4444 45%, #991B1B 100%)'
  },
  green: {
    name: 'Green',
    bgHex: '#10B981',
    badgeClass: 'bg-emerald-500 text-white',
    borderClass: 'border-emerald-500',
    textClass: 'text-emerald-500',
    lightBg: 'bg-emerald-50 dark:bg-emerald-950/40',
    gradient: 'from-emerald-600 to-teal-700',
    tokenGradient: 'radial-gradient(circle at 35% 35%, #6EE7B7 0%, #10B981 45%, #065F46 100%)'
  },
  yellow: {
    name: 'Yellow',
    bgHex: '#F59E0B',
    badgeClass: 'bg-amber-400 text-zinc-950',
    borderClass: 'border-amber-400',
    textClass: 'text-amber-500',
    lightBg: 'bg-amber-50 dark:bg-amber-950/40',
    gradient: 'from-amber-400 to-yellow-600',
    tokenGradient: 'radial-gradient(circle at 35% 35%, #FDE68A 0%, #F59E0B 45%, #92400E 100%)'
  },
  blue: {
    name: 'Blue',
    bgHex: '#3B82F6',
    badgeClass: 'bg-blue-500 text-white',
    borderClass: 'border-blue-500',
    textClass: 'text-blue-500',
    lightBg: 'bg-blue-50 dark:bg-blue-950/40',
    gradient: 'from-blue-600 to-indigo-700',
    tokenGradient: 'radial-gradient(circle at 35% 35%, #93C5FD 0%, #3B82F6 45%, #1E40AF 100%)'
  }
};

/**
 * Returns the semantic state of a token.
 */
export function getTokenState(token: LudoToken): TokenState {
  if (token.hasWon || token.step === 56) return 'COMPLETED';
  if (token.step === -1) return 'IN_YARD';
  if (token.step >= 51 && token.step <= 55) return 'IN_HOME_PATH';
  return 'ACTIVE';
}

/**
 * Calculates the destination step for a token given a dice roll, or null if illegal.
 */
export function calculateTargetStep(token: LudoToken, dice: number): number | null {
  if (token.hasWon || token.step === 56) return null;
  if (token.step === -1) {
    return dice === 6 ? 0 : null;
  }
  const nextStep = token.step + dice;
  if (nextStep > 56) return null; // Overshoot is illegal in standard Ludo
  return nextStep;
}

/**
 * Calculates real (Row, Col) on the 15x15 board for a token given its step.
 */
export function getTokenGridPos(token: LudoToken): GridPos {
  if (token.step === -1) {
    return BASE_POSITIONS[token.color][token.id];
  }
  if (token.step === 56 || token.hasWon) {
    return FINISH_POSITIONS[token.color][token.id];
  }
  if (token.step >= 51 && token.step <= 55) {
    const stretchIndex = token.step - 51;
    return HOME_STRETCHES[token.color][stretchIndex];
  }
  // On 52 perimeter track
  const startTrackIdx = COLOR_START_INDICES[token.color];
  const actualTrackIdx = (startTrackIdx + token.step) % 52;
  return TRACK_COORDINATES[actualTrackIdx];
}

/**
 * Returns the 0..51 perimeter track index for a token on the main board, or null if in yard/home.
 */
export function getActualTrackIndex(color: LudoColor, step: number): number | null {
  if (step < 0 || step > 50) return null;
  return (COLOR_START_INDICES[color] + step) % 52;
}

/**
 * Checks whether moving a token by the given dice roll would cause two or more
 * tokens of the SAME color to land on the same UNSAFE outer track square.
 * Safe zones (the 8 starting & star cells, home stretch 51-55, and home finish 56)
 * are exempt and allow multiple same-color tokens.
 */
export function wouldMoveCauseSameColorUnsafeStack(
  player: LudoPlayer,
  token: LudoToken,
  dice: number
): boolean {
  const targetStep = calculateTargetStep(token, dice);
  if (targetStep === null) return false;

  // On perimeter track (steps 0..50)
  if (targetStep >= 0 && targetStep <= 50) {
    const startTrackIdx = COLOR_START_INDICES[player.color];
    const landingTrackIdx = (startTrackIdx + targetStep) % 52;

    // Safe stars & base start cells are safe zones - stacking is allowed
    if (isTrackIndexSafe(landingTrackIdx)) {
      return false;
    }

    // Unsafe track square: Check if another token of the SAME color currently occupies this square
    return player.tokens.some(
      (otherToken) =>
        otherToken.id !== token.id &&
        otherToken.step >= 0 &&
        otherToken.step <= 50 &&
        otherToken.step === targetStep
    );
  }

  // Home stretch (51..55) and Home Finish (56) are Safe Zones - stacking allowed
  return false;
}

/**
 * Checks if a token can make a legal move with the given rolled dice number.
 * If player context is provided, prevents moving to an unsafe square already occupied
 * by another same-color token.
 */
export function canTokenMove(token: LudoToken, dice: number, player?: LudoPlayer): boolean {
  if (calculateTargetStep(token, dice) === null) return false;
  if (player && wouldMoveCauseSameColorUnsafeStack(player, token, dice)) {
    return false;
  }
  return true;
}

/**
 * Returns all movable tokens for a player with the given dice roll,
 * strictly filtering out moves that would cause multiple same-color tokens to sit on an unsafe square.
 */
export function getMovableTokens(player: LudoPlayer, dice: number): LudoToken[] {
  if (!dice) return [];
  return player.tokens.filter((t) => canTokenMove(t, dice, player));
}

/**
 * Evaluates whether ALL possible moves for a candidate dice roll would cause
 * an unsafe same-color stack (leaving 0 safe legal moves).
 * Used by the dice engine (Approach B) to filter out rolls that would force same-color stacking on unsafe squares.
 */
export function wouldAllMovesCauseUnsafeStack(player: LudoPlayer, dice: number): boolean {
  const physicallyMovableTokens = player.tokens.filter((t) => calculateTargetStep(t, dice) !== null);
  if (physicallyMovableTokens.length === 0) return false;

  // If every movable token would land on an unsafe square occupied by another same-color token
  return physicallyMovableTokens.every((t) => wouldMoveCauseSameColorUnsafeStack(player, t, dice));
}

/**
 * Checks whether a board track index is a safe star or safe base starting cell.
 */
export function isTrackIndexSafe(actualTrackIdx: number): boolean {
  return SAFE_TRACK_INDICES.includes(actualTrackIdx);
}
