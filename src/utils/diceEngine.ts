/**
 * Centralized Fair Six-Sided Dice Engine
 *
 * Guarantees:
 * 1. Exactly 1/6 (~16.6667%) theoretical probability for each face (1, 2, 3, 4, 5, 6).
 * 2. Strict independent random trials (no history bias, no catch-up, no player favoring).
 * 3. Cryptographically secure random integer generation with rejection sampling
 *    to eliminate modulo bias.
 * 4. Total separation from game rules, AI difficulty, and board state.
 */

export type DiceValue = 1 | 2 | 3 | 4 | 5 | 6;

// 2^32 = 4,294,967,296.
// 4,294,967,296 % 6 = 4.
// Largest multiple of 6 <= 2^32 is 4,294,967,292.
// Rejection threshold eliminates modulo bias completely.
const REJECTION_THRESHOLD = 4294967292;

/**
 * Generates an unbiased, uniformly distributed integer between 1 and 6 inclusive.
 * Uses Crypto.getRandomValues when available, with rejection sampling.
 */
export function rollFairDice(): DiceValue {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const uint32 = new Uint32Array(1);
    let rand = 0;
    do {
      window.crypto.getRandomValues(uint32);
      rand = uint32[0];
    } while (rand >= REJECTION_THRESHOLD);

    return ((rand % 6) + 1) as DiceValue;
  }

  // Fallback if Web Crypto API is unavailable (uniform scaling)
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
 * Diagnostic tool: Simulates N dice rolls to test and audit empirical distribution.
 * Default is 100,000 rolls.
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
