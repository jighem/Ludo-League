import React, { useState } from 'react';
import {
  X,
  BookOpen,
  Dice5,
  Swords,
  Shield,
  Trophy,
  Sparkles,
  Zap,
  Target,
  AlertTriangle,
  RotateCcw,
  CheckCircle2
} from 'lucide-react';

interface LudoRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LudoRulesModal: React.FC<LudoRulesModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'all' | 'basics' | 'combat' | 'scoring' | 'safezones'>('all');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-md overflow-y-auto">
      <div
        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 p-5 sm:p-6 text-zinc-950 flex items-center justify-between relative">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-zinc-950/90 text-amber-400 p-2 flex items-center justify-center border border-amber-300 shadow-md">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                Official Ludo & League Rules
              </h2>
              <p className="text-xs font-bold text-amber-100 mt-0.5">
                Standard tournament rules, combat knockout mechanics & scoring guidelines
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-2xl bg-zinc-950/80 hover:bg-zinc-950 text-white/80 hover:text-white transition-all cursor-pointer shadow-md"
            title="Close Rules"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center space-x-1 p-2 bg-zinc-100 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 overflow-x-auto text-xs font-bold">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'all'
                ? 'bg-amber-500 text-zinc-950 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            All Rules
          </button>
          <button
            onClick={() => setActiveTab('basics')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'basics'
                ? 'bg-amber-500 text-zinc-950 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <Dice5 className="w-3.5 h-3.5" />
            <span>Turn & Dice</span>
          </button>
          <button
            onClick={() => setActiveTab('combat')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'combat'
                ? 'bg-amber-500 text-zinc-950 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <Swords className="w-3.5 h-3.5" />
            <span>Knockouts & Combat</span>
          </button>
          <button
            onClick={() => setActiveTab('safezones')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'safezones'
                ? 'bg-amber-500 text-zinc-950 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Safe Zones (Stars)</span>
          </button>
          <button
            onClick={() => setActiveTab('scoring')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'scoring'
                ? 'bg-amber-500 text-zinc-950 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>Points & Standings</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-7 max-h-[65vh] overflow-y-auto space-y-6 text-zinc-800 dark:text-zinc-200">
          
          {/* Section 1: Objective & Game Modes */}
          {(activeTab === 'all' || activeTab === 'basics') && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <Target className="w-5 h-5 shrink-0" />
                <h3 className="text-sm font-black uppercase tracking-wider">1. Game Objective & Modes</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 space-y-1.5">
                  <div className="font-black text-zinc-900 dark:text-white flex items-center gap-1.5">
                    <Trophy className="w-4 h-4 text-amber-500" />
                    <span>Classic Mode (Standard)</span>
                  </div>
                  <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    Move all <strong className="text-amber-600 dark:text-amber-400">4 tokens</strong> from your base yard, navigate clockwise around the entire 52-step perimeter track, and enter your home triangle. The match continues until 3 players reach the podium.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 space-y-1.5">
                  <div className="font-black text-zinc-900 dark:text-white flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-orange-500" />
                    <span>Quick Blitz Mode</span>
                  </div>
                  <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    Fast-paced action where the <strong className="text-orange-500">first player to get ANY 1 token home</strong> wins 1st place immediately. Remaining ranks are determined by token advancement and knockout score.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Section 2: Dice & Turn Mechanics */}
          {(activeTab === 'all' || activeTab === 'basics') && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <Dice5 className="w-5 h-5 shrink-0" />
                <h3 className="text-sm font-black uppercase tracking-wider">2. Rolling & Turn Mechanics</h3>
              </div>
              <ul className="space-y-2 text-xs">
                <li className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-zinc-900 dark:text-white">Unlocking Tokens (Roll a 6):</strong> A token begins locked in the base yard. Rolling a <span className="font-extrabold text-amber-600 dark:text-amber-400">6</span> allows you to release one token onto your starting entry square.
                  </div>
                </li>
                <li className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-zinc-900 dark:text-white">Bonus Rolls:</strong> You receive an immediate extra roll if you:
                    <ul className="list-disc pl-5 mt-1 space-y-0.5 text-zinc-600 dark:text-zinc-400">
                      <li>Roll a <strong className="text-amber-500">6</strong></li>
                      <li><strong className="text-red-500">Capture/Knock out</strong> an opponent's token</li>
                      <li>Successfully bring a token <strong className="text-emerald-500">Home</strong></li>
                    </ul>
                  </div>
                </li>
                <li className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-amber-900 dark:text-amber-200">Four 6s Rule:</strong> Rolling four consecutive 6s automatically forfeits the fourth roll to prevent infinite rolling streaks and maintain competitive fairness.
                  </div>
                </li>
              </ul>
            </div>
          )}

          {/* Section 3: Knockouts & Combat */}
          {(activeTab === 'all' || activeTab === 'combat') && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <Swords className="w-5 h-5 shrink-0" />
                <h3 className="text-sm font-black uppercase tracking-wider">3. Combat & Knockout Rules</h3>
              </div>
              <div className="p-4 rounded-2xl bg-red-500/5 dark:bg-red-950/20 border border-red-500/20 space-y-3 text-xs">
                <p className="leading-relaxed">
                  If your token lands precisely on a square occupied by an opponent's token on an open track, you <strong className="text-red-600 dark:text-red-400 font-extrabold">KNOCK THEM OUT</strong>.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <div className="font-extrabold text-emerald-700 dark:text-emerald-300">⚔️ Attacker Reward</div>
                    <div className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-0.5">
                      +5 Bonus Points added to match score & grants 1 Extra Turn Roll.
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
                    <div className="font-extrabold text-red-700 dark:text-red-300">💀 Defender Penalty</div>
                    <div className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-0.5">
                      -5 Points deduction & token is sent back to the starting yard.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section 4: Safe Zones (Star Squares) */}
          {(activeTab === 'all' || activeTab === 'safezones') && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <Shield className="w-5 h-5 shrink-0" />
                <h3 className="text-sm font-black uppercase tracking-wider">4. Safe Zones & Star Squares</h3>
              </div>
              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 space-y-2 text-xs">
                <p className="leading-relaxed">
                  Tokens residing on <strong className="text-emerald-600 dark:text-emerald-400">Safe Zones</strong> CANNOT be captured or knocked out by any opponent token under any circumstances.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700">
                    <strong className="text-zinc-900 dark:text-white">⭐ Star Squares:</strong> 4 designated star-marked squares located on the outer track.
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700">
                    <strong className="text-zinc-900 dark:text-white">🚀 Starting Tiles:</strong> Each color's initial release square is an immune safe point.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section 5: Scoring System & Points Table */}
          {(activeTab === 'all' || activeTab === 'scoring') && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <Trophy className="w-5 h-5 shrink-0" />
                <h3 className="text-sm font-black uppercase tracking-wider">5. League Scoring & Standings Distribution</h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 text-[10px] uppercase font-black">
                      <th className="py-2.5 px-3">Player Count</th>
                      <th className="py-2.5 px-3">🥇 1st Place</th>
                      <th className="py-2.5 px-3">🥈 2nd Place</th>
                      <th className="py-2.5 px-3">🥉 3rd Place</th>
                      <th className="py-2.5 px-3">4️⃣ 4th Place</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 font-bold">
                    <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                      <td className="py-2.5 px-3 text-zinc-900 dark:text-white">4 Players (Full Match)</td>
                      <td className="py-2.5 px-3 text-amber-600 dark:text-amber-400 font-black">+50.0 pts</td>
                      <td className="py-2.5 px-3 text-slate-500 dark:text-slate-300">+30.0 pts</td>
                      <td className="py-2.5 px-3 text-amber-700 dark:text-amber-600">+20.0 pts</td>
                      <td className="py-2.5 px-3 text-zinc-400">0.0 pts</td>
                    </tr>
                    <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                      <td className="py-2.5 px-3 text-zinc-900 dark:text-white">3 Players</td>
                      <td className="py-2.5 px-3 text-amber-600 dark:text-amber-400 font-black">+62.5 pts</td>
                      <td className="py-2.5 px-3 text-slate-500 dark:text-slate-300">+37.5 pts</td>
                      <td className="py-2.5 px-3 text-zinc-400">0.0 pts</td>
                      <td className="py-2.5 px-3 text-zinc-400">—</td>
                    </tr>
                    <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                      <td className="py-2.5 px-3 text-zinc-900 dark:text-white">2 Players (Head to Head)</td>
                      <td className="py-2.5 px-3 text-amber-600 dark:text-amber-400 font-black">+75.0 pts</td>
                      <td className="py-2.5 px-3 text-slate-500 dark:text-slate-300">+25.0 pts</td>
                      <td className="py-2.5 px-3 text-zinc-400">—</td>
                      <td className="py-2.5 px-3 text-zinc-400">—</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs flex items-center justify-between">
                <div className="font-extrabold text-amber-800 dark:text-amber-300">
                  Combat Points Modifier:
                </div>
                <div className="font-black text-zinc-900 dark:text-white">
                  Total Points = Base Rank Pts + (Kills × 5) - (Deaths × 5)
                </div>
              </div>
            </div>
          )}

          {/* Section 6: Exact Reaching Home Rule */}
          {(activeTab === 'all' || activeTab === 'basics') && (
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300 font-black uppercase tracking-wider text-[11px]">
                <RotateCcw className="w-4 h-4 text-amber-500" />
                <span>Exact Roll Requirement for Home</span>
              </div>
              <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Tokens moving through the colored home corridor require the <strong className="text-zinc-900 dark:text-white">exact number</strong> on the die to enter the center home triangle. If the roll exceeds the remaining distance, the token cannot make that move.
              </p>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <span className="text-[11px] font-bold text-zinc-500">
            Ludo League Master Official Rulebook
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-zinc-950 text-xs font-black hover:from-amber-600 hover:to-orange-600 shadow-md transition-all cursor-pointer active:scale-95"
          >
            Got It! Back to Game
          </button>
        </div>
      </div>
    </div>
  );
};
