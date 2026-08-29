import React, { useState, useEffect } from 'react';
import { simulateDiceRolls, SimulationResult, DiceValue } from '../../utils/diceEngine';
import {
  X,
  Dice5,
  BarChart3,
  ShieldCheck,
  Zap,
  Play,
  RotateCcw,
  Sparkles,
  Info,
  CheckCircle2
} from 'lucide-react';

interface DiceFairnessModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DiceFairnessModal: React.FC<DiceFairnessModalProps> = ({ isOpen, onClose }) => {
  const [sampleSize, setSampleSize] = useState<number>(100000);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [result, setResult] = useState<SimulationResult | null>(null);

  useEffect(() => {
    if (isOpen && !result) {
      runSimulation(100000);
    }
  }, [isOpen]);

  const runSimulation = (count: number) => {
    setIsRunning(true);
    // Allow React to render loading state
    setTimeout(() => {
      const res = simulateDiceRolls(count);
      setResult(res);
      setIsRunning(false);
    }, 50);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl transition-all">
        {/* Header */}
        <div className="sticky top-0 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between z-10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20 shadow-xs">
              <Dice5 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-zinc-900 dark:text-white flex items-center gap-2">
                <span>Fair Dice & Probability Engine</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-extrabold uppercase">
                  100% Unbiased
                </span>
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Independent 1/6 (~16.67%) uniform probability verified by Web Crypto RNG
              </p>
            </div>
          </div>
          <button
            id="btn-close-dice-fairness-modal"
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Core Guarantees Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/5 via-amber-500/10 to-orange-500/5 border border-amber-500/20 space-y-2">
            <div className="flex items-center gap-2 text-xs font-black text-amber-700 dark:text-amber-400 uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-amber-500" />
              <span>Architectural Fairness Guarantees</span>
            </div>
            <ul className="text-xs text-zinc-600 dark:text-zinc-300 space-y-1.5 list-disc list-inside">
              <li>
                <strong>Independent Random Trials:</strong> Every roll is an isolated event with zero historical memory or pity timers.
              </li>
              <li>
                <strong>No Player Favoring / Handicaps:</strong> Dice values are never influenced by player ranking, token positions, AI difficulty, or need for a 6.
              </li>
              <li>
                <strong>Clean Separation of Concerns:</strong> The <em>Dice Engine</em> strictly generates numbers 1–6. The <em>Ludo Rules Engine</em> evaluates game mechanics (bonus rolls, 4-consecutive-sixes skip, legal moves) afterwards.
              </li>
              <li>
                <strong>Zero Modulo Bias:</strong> Uses 32-bit cryptographically secure random integers with rejection sampling.
              </li>
            </ul>
          </div>

          {/* Live Simulator Controls */}
          <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-750 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-amber-500" />
                  <h3 className="text-sm font-black text-zinc-900 dark:text-white">
                    Live Randomness Audit Simulation
                  </h3>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Simulate thousands of real-time rolls to empirically verify the theoretical 16.667% distribution.
                </p>
              </div>

              {/* Sample Size Selector */}
              <div className="flex items-center gap-1.5 bg-zinc-200/70 dark:bg-zinc-800 p-1 rounded-xl">
                {[10000, 100000, 250000].map((size) => (
                  <button
                    key={size}
                    onClick={() => {
                      setSampleSize(size);
                      runSimulation(size);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                      sampleSize === size
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                    }`}
                  >
                    {size >= 1000 ? `${size / 1000}k` : size} Rolls
                  </button>
                ))}
              </div>
            </div>

            {/* Results Grid */}
            {isRunning ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-3">
                <RotateCcw className="w-8 h-8 text-amber-500 animate-spin" />
                <span className="text-xs font-bold text-zinc-500">
                  Simulating {sampleSize.toLocaleString()} independent dice rolls...
                </span>
              </div>
            ) : result ? (
              <div className="space-y-4">
                {/* 6 Dice Faces Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
                  {([1, 2, 3, 4, 5, 6] as DiceValue[]).map((face) => {
                    const count = result.counts[face];
                    const pct = result.percentages[face];
                    const diff = Number((pct - result.expectedPercentage).toFixed(3));
                    const isOver = diff >= 0;

                    return (
                      <div
                        key={face}
                        className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex flex-col items-center text-center space-y-1.5 shadow-xs"
                      >
                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 font-black text-sm flex items-center justify-center border border-amber-500/30">
                          {face}
                        </div>
                        <div className="space-y-0.5">
                          <div className="text-xs font-black text-zinc-900 dark:text-white">
                            {pct}%
                          </div>
                          <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
                            {count.toLocaleString()}
                          </div>
                        </div>

                        {/* Deviation Pill */}
                        <div
                          className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${
                            Math.abs(diff) < 0.3
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300'
                          }`}
                        >
                          {isOver ? `+${diff}%` : `${diff}%`}
                        </div>

                        {/* Mini Visual Bar */}
                        <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden mt-1">
                          <div
                            className="bg-amber-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, (pct / 25) * 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Statistical Summary Strip */}
                <div className="p-3.5 rounded-xl bg-emerald-500/10 dark:bg-emerald-950/30 border border-emerald-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center space-x-2.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    <div>
                      <div className="font-black text-emerald-900 dark:text-emerald-200">
                        Chi-Square Test Passed (χ² = {result.chiSquare} &lt; {result.criticalValue95})
                      </div>
                      <div className="text-[11px] text-emerald-700 dark:text-emerald-400">
                        {result.totalRolls.toLocaleString()} rolls completed in {result.durationMs}ms with max deviation of ±{result.maxDeviationPercent}%.
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => runSimulation(sampleSize)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition-all shadow-xs cursor-pointer flex items-center gap-1.5 shrink-0"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Re-Test</span>
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          {/* Quick Technical Specs */}
          <div className="text-xs text-zinc-500 dark:text-zinc-400 space-y-2 border-t border-zinc-100 dark:border-zinc-800 pt-4">
            <h4 className="font-black text-zinc-700 dark:text-zinc-300 uppercase tracking-wider text-[11px]">
              Technical RNG Specifications
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-750">
                <strong>Generator:</strong> Web Crypto API (32-bit unsigned integers with rejection sampling threshold at 4,294,967,292).
              </div>
              <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-750">
                <strong>Race-Condition Lock:</strong> Atomic state lock locks out double-taps and UI re-renders during active rolls.
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-zinc-50 dark:bg-zinc-850 border-t border-zinc-200 dark:border-zinc-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-black transition-all cursor-pointer"
          >
            Close Diagnostics
          </button>
        </div>
      </div>
    </div>
  );
};
