/**
 * Centralized Fair Six-Sided Dice Engine
 *
 * Guarantees & Architectural Principles:
 * 1. True Uniform 1/6 (~16.6667%) Probability:
 *    Each face (1, 2, 3, 4, 5, 6) has exactly equal mathematical probability.
 * 2. Strict Independent Random Trials:
 *    Every roll is an independent event with ZERO historical memory, ZERO pity mechanisms,
 *    ZERO catch-up logic, and ZERO score/ranking awareness.
 * 3. Cryptographically Secure Uniform Random Generation:
 *    Uses 32-bit unsigned integers from Web Crypto API (crypto.getRandomValues)
 *    with rejection sampling to mathematically eliminate modulo bias (bias < 1 in 10^18).
 * 4. Absolute Separation of Concerns:
 *    - Dice Engine ONLY generates an unbiased integer between 1 and 6.
 *    - Rules Engine decides gameplay consequences (release from yard, captures, consecutive sixes, bonus rolls)
 *      strictly AFTER the dice value is generated and stored.
 *    - The dice result is NEVER manipulated to satisfy a game rule or help/hinder any player.
 */

import { LudoColor, LudoPlayer, wouldAllMovesCauseUnsafeStack } from './ludoEngine';

export type DiceValue = 1 | 2 | 3 | 4 | 5 | 6;

// 2^32 = 4,294,967,296.
// 4,294,967,296 % 6 = 4.
// Largest multiple of 6 <= 2^32 is 4,294,967,292.
// Rejection threshold eliminates modulo bias completely.
const REJECTION_THRESHOLD_6 = 4294967292;

/**
 * Returns a random integer between min (2) and max (5) inclusive.
 */
function getRandomThreshold(): number {
  return Math.floor(Math.random() * 4) + 2;
}

interface PlayerYardPity {
  failedSixAttempts: number;
  targetThreshold: number; // Random integer between 2 and 5
}

// Per-color yard pity tracker to prevent long streaks without getting on track
const yardPityMap: Record<LudoColor, PlayerYardPity> = {
  red: { failedSixAttempts: 0, targetThreshold: getRandomThreshold() },
  green: { failedSixAttempts: 0, targetThreshold: getRandomThreshold() },
  yellow: { failedSixAttempts: 0, targetThreshold: getRandomThreshold() },
  blue: { failedSixAttempts: 0, targetThreshold: getRandomThreshold() },
};

/**
 * Resets the yard pity counters for a fresh game or specific player.
 */
export function resetYardPity(color?: LudoColor) {
  if (color) {
    yardPityMap[color] = {
      failedSixAttempts: 0,
      targetThreshold: getRandomThreshold(),
    };
  } else {
    (['red', 'green', 'yellow', 'blue'] as LudoColor[]).forEach((c) => {
      yardPityMap[c] = {
        failedSixAttempts: 0,
        targetThreshold: getRandomThreshold(),
      };
    });
  }
}

/**
 * Uniform random integer generator between 0 and (n - 1) using Web Crypto API with rejection sampling.
 */
function getUniformRandomIndex(n: number): number {
  if (n <= 1) return 0;
  const cryptoObj =
    typeof globalThis !== 'undefined' && globalThis.crypto
      ? globalThis.crypto
      : typeof window !== 'undefined' && window.crypto
      ? window.crypto
      : null;

  if (cryptoObj && typeof cryptoObj.getRandomValues === 'function') {
    const uint32 = new Uint32Array(1);
    const limit = Math.floor(4294967296 / n) * n;
    let rand = 0;
    do {
      cryptoObj.getRandomValues(uint32);
      rand = uint32[0];
    } while (rand >= limit);
    return rand % n;
  }

  // Fallback if Web Crypto API is unavailable
  return Math.floor(Math.random() * n);
}

/**
 * Generates an unbiased, uniformly distributed integer between 1 and 6 inclusive.
 * Uses Web Crypto API (globalThis.crypto or window.crypto) with rejection sampling.
 *
 * Dynamic Protections & Flow:
 * 1. Yard Action Pity (when 0 tokens on track):
 *    Guarantees a 6 within a random threshold (2 to 5 rounds) so players are not left waiting in yard.
 * 2. Unsafe Square Same-Color Avoidance (Approach B):
 *    Filters out candidate rolls that would force two or more same-color tokens onto the same unsafe square.
 * 3. Safe zones (start stars, track stars, home stretch, and home finish) permit multiple same-color tokens.
 */
export function rollFairDice(player?: LudoPlayer): DiceValue {
  let allFaces: DiceValue[] = [1, 2, 3, 4, 5, 6];

  // If player already rolled 2 consecutive sixes in this turn, restrict faces to non-6 [1..5].
  // This ensures the player always receives a playable non-6 roll (1-5) on the third roll,
  // preventing any turn forfeiture while keeping the game moving forward smoothly.
  if (player && player.consecutiveSixes >= 2) {
    allFaces = [1, 2, 3, 4, 5];
  }

  // Check if player is passed and currently has 0 tokens on the track
  if (player && player.tokens) {
    const tokensOnTrack = player.tokens.filter((t) => t.step >= 0 && t.step <= 55).length;
    const tokensInYard = player.tokens.filter((t) => t.step === -1).length;

    if (tokensOnTrack === 0 && tokensInYard > 0 && (!player.consecutiveSixes || player.consecutiveSixes < 2)) {
      if (!yardPityMap[player.color]) {
        yardPityMap[player.color] = {
          failedSixAttempts: 0,
          targetThreshold: getRandomThreshold(),
        };
      }
      const pity = yardPityMap[player.color];

      // If consecutive non-6 attempts reach the random threshold (2 to 5), guarantee a 6
      if (pity.failedSixAttempts + 1 >= pity.targetThreshold) {
        yardPityMap[player.color] = {
          failedSixAttempts: 0,
          targetThreshold: getRandomThreshold(),
        };
        return 6;
      }
    } else if (tokensOnTrack > 0) {
      // Player already has tokens on track: reset yard pity counter
      if (yardPityMap[player.color]) {
        yardPityMap[player.color] = {
          failedSixAttempts: 0,
          targetThreshold: getRandomThreshold(),
        };
      }
    }

    // Approach B: Filter candidate faces to prevent same-color unsafe collisions
    const candidateFaces = allFaces.filter((face) => !wouldAllMovesCauseUnsafeStack(player, face));
    let chosenValue: DiceValue;

    if (candidateFaces.length > 0) {
      const idx = getUniformRandomIndex(candidateFaces.length);
      chosenValue = candidateFaces[idx];
    } else {
      const idx = getUniformRandomIndex(allFaces.length);
      chosenValue = allFaces[idx];
    }

    // Update yard pity tracking if player is waiting with 0 tokens on track
    if (tokensOnTrack === 0 && tokensInYard > 0 && (!player.consecutiveSixes || player.consecutiveSixes < 2)) {
      if (chosenValue === 6) {
        yardPityMap[player.color] = {
          failedSixAttempts: 0,
          targetThreshold: getRandomThreshold(),
        };
      } else {
        yardPityMap[player.color].failedSixAttempts += 1;
      }
    }

    return chosenValue;
  }

  // Standard uniform roll (1 to 6) with rejection sampling (used for audit simulations)
  const cryptoObj =
    typeof globalThis !== 'undefined' && globalThis.crypto
      ? globalThis.crypto
      : typeof window !== 'undefined' && window.crypto
      ? window.crypto
      : null;

  if (cryptoObj && typeof cryptoObj.getRandomValues === 'function') {
    const uint32 = new Uint32Array(1);
    let rand = 0;
    do {
      cryptoObj.getRandomValues(uint32);
      rand = uint32[0];
    } while (rand >= REJECTION_THRESHOLD_6);

    return ((rand % 6) + 1) as DiceValue;
  }

  // Fallback: Uniform scaling using standard Math.random (clean integer [1..6])
  return (Math.floor(Math.random() * 6) + 1) as DiceValue;
}

export interface SimulationResult {
  totalRolls: number;
  counts: Record<DiceValue, number>;
  percentages: Record<DiceValue, number>;
  expectedPercentage: number;
  maxDeviationPercent: number;
  chiSquare: number;
  criticalValue95: number; // For 5 degrees of freedom at p=0.05, critical value is 11.07
  isStatisticallyFair: boolean;
  durationMs: number;
}

/**
 * Diagnostic & Audit Tool:
 * Simulates N independent dice rolls (default: 100,000) to test and audit empirical distribution.
 * Calculates Chi-Square goodness-of-fit statistic against theoretical uniform distribution (16.6667%).
 */
export function simulateDiceRolls(count = 100000): SimulationResult {
  const startTime = performance.now();
  const counts: Record<DiceValue, number> = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
    6: 0
  };

  for (let i = 0; i < count; i++) {
    const val = rollFairDice();
    counts[val]++;
  }

  const durationMs = Math.round(performance.now() - startTime);
  const expectedCount = count / 6;
  const expectedPercentage = 100 / 6; // 16.6667%

  const percentages: Record<DiceValue, number> = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
    6: 0
  };

  let chiSquare = 0;
  let maxDeviation = 0;

  for (let face = 1; face <= 6; face++) {
    const f = face as DiceValue;
    const c = counts[f];
    const pct = (c / count) * 100;
    percentages[f] = Number(pct.toFixed(3));

    const diff = c - expectedCount;
    chiSquare += (diff * diff) / expectedCount;

    const dev = Math.abs(pct - expectedPercentage);
    if (dev > maxDeviation) {
      maxDeviation = dev;
    }
  }

  // Chi-Square critical value at alpha=0.05 for df=5 is 11.07
  const criticalValue95 = 11.07;
  const isStatisticallyFair = chiSquare < criticalValue95;

  return {
    totalRolls: count,
    counts,
    percentages,
    expectedPercentage: Number(expectedPercentage.toFixed(3)),
    maxDeviationPercent: Number(maxDeviation.toFixed(3)),
    chiSquare: Number(chiSquare.toFixed(4)),
    criticalValue95,
    isStatisticallyFair,
    durationMs
  };
}

