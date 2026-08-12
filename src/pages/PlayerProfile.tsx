import React, { useState, useEffect } from 'react';
import { Player } from '../types';
import { apiRequest } from '../api/client';
import {
  User,
  Trophy,
  Flame,
  Award,
  Medal,
  Calendar,
  ChevronLeft,
  PieChart as PieChartIcon,
  TrendingUp,
  BarChart2
} from 'lucide-react';

interface PlayerProfileProps {
  playerId: number;
  onBack: () => void;
}

export const PlayerProfile: React.FC<PlayerProfileProps> = ({ playerId, onBack }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    player: Player;
    summary: {
      totalMatches: number;
      totalPoints: number;
      averageScore: number;
      averagePosition: number;
      wins: number;
      pos2: number;
      pos3: number;
      pos4: number;
      lastPlace: number;
      podiumFinishes: number;
      winPercentage: number;
      podiumPercentage: number;
      currentWinStreak: number;
      bestWinStreak: number;
      currentPodiumStreak: number;
      bestPodiumStreak: number;
      currentMonthRank: number | string;
      currentMonthAverage: number;
      currentMonthMatches: number;
      currentMonthWins: number;
      currentMonthQualified: boolean;
    };
    recentMatches: Array<{
      position: number;
      points_awarded: number;
      match_date: string;
      friendly_id: string;
    }>;
    performanceBySize: {
      4: { matches: number; wins: number; points: number; avg_score: number; win_pct: number; avg_pos: number };
      3: { matches: number; wins: number; points: number; avg_score: number; win_pct: number; avg_pos: number };
      2: { matches: number; wins: number; points: number; avg_score: number; win_pct: number; avg_pos: number };
    };
    monthlyPerformance: Array<{
      month: string;
      matches: number;
      points: number;
      wins: number;
      average_score: number;
      win_pct: number;
    }>;
  } | null>(null);

  useEffect(() => {
    fetchProfile();
  }, [playerId]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await apiRequest(`/stats/player/${playerId}`);
      setData(res);
    } catch (err) {
      console.error('Failed to load player profile:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-12 text-center text-zinc-500 space-y-2">
        <div className="inline-block w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-2"></div>
        <p className="text-xs font-bold text-zinc-400">Loading player statistics...</p>
      </div>
    );
  }

  if (!data) return null;

  const { player, summary, recentMatches, performanceBySize, monthlyPerformance } = data;

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-zinc-900/80 border border-zinc-800 rounded-xl text-xs font-bold text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer shadow-md"
      >
        <ChevronLeft className="w-4 h-4" />
        <span>Back to Players</span>
      </button>

      {/* Hero Profile Banner */}
      <div className="bg-zinc-900/80 rounded-3xl p-6 border border-zinc-800/80 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-400 via-amber-500 to-orange-500 text-zinc-950 font-black text-2xl flex items-center justify-center shadow-lg shadow-orange-500/20">
            {player.full_name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-2xl font-black text-zinc-100 tracking-tight">
                {player.full_name}
              </h2>
              <span
                className={`px-2 py-0.5 text-[10px] font-extrabold rounded-full ${
                  player.is_active
                    ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60'
                    : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                }`}
              >
                {player.is_active ? 'Active' : 'Archived'}
              </span>
            </div>
            {player.nickname && <p className="text-xs font-bold text-zinc-400">"{player.nickname}"</p>}
            <p className="text-xs text-zinc-500 mt-1 font-medium">Joined {player.date_joined}</p>
          </div>
        </div>

        <div className="flex items-center space-x-4 bg-zinc-950/60 p-4 rounded-2xl border border-zinc-800/80">
          <div className="text-center px-2">
            <div className="text-[10px] font-bold text-zinc-500 uppercase">Avg Score</div>
            <div className="text-2xl font-black text-amber-400">
              {summary.averageScore.toFixed(2)}
            </div>
          </div>

          <div className="w-px h-8 bg-zinc-800" />

          <div className="text-center px-2">
            <div className="text-[10px] font-bold text-zinc-500 uppercase">Win Rate</div>
            <div className="text-2xl font-black text-emerald-400">
              {summary.winPercentage}%
            </div>
          </div>

          <div className="w-px h-8 bg-zinc-800" />

          <div className="text-center px-2">
            <div className="text-[10px] font-bold text-zinc-500 uppercase">Matches</div>
            <div className="text-2xl font-black text-zinc-100">
              {summary.totalMatches}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Form Badge Sequence */}
      <div className="bg-zinc-900/80 rounded-3xl p-6 border border-zinc-800/80 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-extrabold text-zinc-100 uppercase tracking-wider flex items-center space-x-2">
            <Flame className="w-4 h-4 text-orange-400" />
            <span>Recent Form (Last Matches)</span>
          </h3>
          <span className="text-xs font-bold text-zinc-400">Streak: {summary.currentWinStreak} wins</span>
        </div>

        {recentMatches.length === 0 ? (
          <p className="text-xs text-zinc-500 italic">No recent match history recorded.</p>
        ) : (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {recentMatches.map((m, idx) => (
              <div
                key={idx}
                className="flex flex-col items-center justify-center p-2 rounded-2xl bg-zinc-950 border border-zinc-800 min-w-12 shadow-inner"
                title={`Match ${m.friendly_id} on ${m.match_date}: Rank ${m.position} (+${m.points_awarded} pts)`}
              >
                <span className="text-xl">
                  {m.position === 1 ? '🥇' : m.position === 2 ? '🥈' : m.position === 3 ? '🥉' : '4️⃣'}
                </span>
                <span className="text-[10px] font-black text-amber-400 mt-0.5">
                  +{m.points_awarded}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-zinc-900/80 p-5 rounded-3xl border border-zinc-800/80 shadow-xl">
          <div className="text-[10px] font-extrabold uppercase text-zinc-500">Average Finish Position</div>
          <div className="text-2xl font-black text-zinc-100 mt-1">
            {summary.averagePosition.toFixed(2)}
          </div>
          <p className="text-[10px] text-zinc-500 mt-0.5 font-medium">Lower is better (1.00 = perfect)</p>
        </div>

        <div className="bg-zinc-900/80 p-5 rounded-3xl border border-zinc-800/80 shadow-xl">
          <div className="text-[10px] font-extrabold uppercase text-zinc-500">Podium Rate</div>
          <div className="text-2xl font-black text-amber-400 mt-1">
            {summary.podiumPercentage}%
          </div>
          <p className="text-[10px] text-zinc-500 mt-0.5 font-medium">{summary.podiumFinishes} top-3 finishes</p>
        </div>

        <div className="bg-zinc-900/80 p-5 rounded-3xl border border-zinc-800/80 shadow-xl">
          <div className="text-[10px] font-extrabold uppercase text-zinc-500">Best Win Streak</div>
          <div className="text-2xl font-black text-orange-400 mt-1">
            {summary.bestWinStreak} Games
          </div>
          <p className="text-[10px] text-zinc-500 mt-0.5 font-medium">Consecutive 1st place finishes</p>
        </div>

        <div className="bg-zinc-900/80 p-5 rounded-3xl border border-zinc-800/80 shadow-xl">
          <div className="text-[10px] font-extrabold uppercase text-zinc-500">Current Month Rank</div>
          <div className="text-2xl font-black text-zinc-100 mt-1">
            #{summary.currentMonthRank}
          </div>
          <p className="text-[10px] text-zinc-500 mt-0.5 font-medium">Avg {summary.currentMonthAverage} pts</p>
        </div>
      </div>

      {/* Performance by Game Size (4P vs 3P vs 2P) */}
      <div className="bg-zinc-900/80 rounded-3xl p-6 border border-zinc-800/80 shadow-xl space-y-4">
        <h3 className="text-xs font-extrabold text-zinc-100 uppercase tracking-wider flex items-center space-x-2">
          <BarChart2 className="w-4 h-4 text-amber-400" />
          <span>Performance by Game Size (Normalized Scoring Context)</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {([4, 3, 2] as const).map((size) => {
            const st = performanceBySize[size];
            return (
              <div key={size} className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 space-y-2">
                <div className="flex items-center justify-between font-extrabold text-xs text-zinc-100 pb-2 border-b border-zinc-800">
                  <span>{size}-Player Games</span>
                  <span className="text-amber-400">{st.matches} Matches</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div>
                    <span className="text-zinc-500 text-[10px] font-bold block">Wins</span>
                    <span className="font-bold text-emerald-400">{st.wins} ({st.win_pct}%)</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 text-[10px] font-bold block">Avg Score</span>
                    <span className="font-black text-amber-400">{st.avg_score} pts</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Monthly Performance Timeline Table */}
      <div className="bg-zinc-900/80 rounded-3xl p-6 border border-zinc-800/80 shadow-xl space-y-4">
        <h3 className="text-xs font-extrabold text-zinc-100 uppercase tracking-wider flex items-center space-x-2">
          <Calendar className="w-4 h-4 text-blue-400" />
          <span>Monthly Performance Timeline</span>
        </h3>

        {monthlyPerformance.length === 0 ? (
          <p className="text-xs text-zinc-500">No monthly performance data recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500 font-extrabold uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3">Month</th>
                  <th className="py-2.5 px-3 text-center">Matches</th>
                  <th className="py-2.5 px-3 text-center">Wins</th>
                  <th className="py-2.5 px-3 text-center">Win %</th>
                  <th className="py-2.5 px-3 text-right">Avg Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-medium text-zinc-300">
                {monthlyPerformance.map((m) => (
                  <tr key={m.month} className="hover:bg-zinc-800/40 transition-colors">
                    <td className="py-3 px-3 font-bold text-zinc-100">{m.month}</td>
                    <td className="py-3 px-3 text-center font-bold">{m.matches}</td>
                    <td className="py-3 px-3 text-center font-bold text-emerald-400">{m.wins}</td>
                    <td className="py-3 px-3 text-center">{m.win_pct}%</td>
                    <td className="py-3 px-3 text-right font-black text-amber-400">{m.average_score.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
