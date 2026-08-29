import React, { useState, useEffect } from 'react';
import { Player } from '../types';
import { apiRequest } from '../api/client';
import { formatDateStr } from '../utils/date';
import { useLeague } from '../context/LeagueContext';
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
  BarChart2,
  Swords,
  Skull,
  Crosshair,
  ShieldAlert
} from 'lucide-react';

interface PlayerProfileProps {
  playerId: number | null;
  onBack: () => void;
}

export const PlayerProfile: React.FC<PlayerProfileProps> = ({ playerId, onBack }) => {
  const { dataVersion } = useLeague();
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
      totalKills?: number;
      totalDeaths?: number;
      netCombatPoints?: number;
      killDeathRatio?: number;
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
      kills?: number;
      deaths?: number;
      match_date: string;
      friendly_id: string;
    }>;
    performanceBySize: {
      4: { matches: number; wins: number; points: number; avg_score: number; win_pct: number; avg_pos: number; kills?: number; deaths?: number };
      3: { matches: number; wins: number; points: number; avg_score: number; win_pct: number; avg_pos: number; kills?: number; deaths?: number };
      2: { matches: number; wins: number; points: number; avg_score: number; win_pct: number; avg_pos: number; kills?: number; deaths?: number };
    };
    monthlyPerformance: Array<{
      month: string;
      matches: number;
      points: number;
      wins: number;
      average_score: number;
      win_pct: number;
      kills?: number;
      deaths?: number;
    }>;
  } | null>(null);

  useEffect(() => {
    if (playerId) {
      fetchProfile();
    }
  }, [playerId, dataVersion]);

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
  const totalKills = summary.totalKills || 0;
  const totalDeaths = summary.totalDeaths || 0;
  const netCombat = summary.netCombatPoints !== undefined ? summary.netCombatPoints : (totalKills * 5) - (totalDeaths * 5);
  const kdRatio = summary.killDeathRatio !== undefined ? summary.killDeathRatio : (totalDeaths > 0 ? (totalKills / totalDeaths).toFixed(2) : totalKills);

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
            <p className="text-xs text-zinc-500 mt-1 font-medium">Joined {formatDateStr(player.date_joined)}</p>
          </div>
        </div>

        <div className="flex items-center space-x-3 bg-zinc-950/60 p-4 rounded-2xl border border-zinc-800/80 overflow-x-auto">
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
            <div className="text-[10px] font-bold text-zinc-500 uppercase">Kills / Deaths</div>
            <div className="text-xl font-black text-rose-400 whitespace-nowrap">
              ⚔️ {totalKills} <span className="text-zinc-600">/</span> 💀 {totalDeaths}
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

      {/* Combat & Hunting Profile Panel */}
      <div className="bg-gradient-to-r from-rose-950/30 via-zinc-900/80 to-amber-950/20 rounded-3xl p-6 border border-rose-900/40 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <Swords className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-zinc-100 uppercase tracking-wider flex items-center gap-2">
                Combat & Kill/Death Record
              </h3>
              <p className="text-xs text-zinc-400 font-medium">
                Combat rule: +5 pts per kill, -5 pts per death knocked out
              </p>
            </div>
          </div>
          <span className="text-xs font-extrabold px-3 py-1 bg-zinc-950 rounded-full border border-zinc-800 text-zinc-300">
            K/D Ratio: <span className="text-amber-400 font-black">{kdRatio}</span>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          <div className="p-4 rounded-2xl bg-zinc-950/70 border border-rose-900/30 space-y-1">
            <div className="flex items-center space-x-1.5 text-rose-400 text-xs font-bold">
              <Crosshair className="w-4 h-4" />
              <span>Total Kills</span>
            </div>
            <div className="text-2xl font-black text-rose-400">⚔️ {totalKills}</div>
            <p className="text-[10px] text-zinc-500">Tokens captured</p>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800 space-y-1">
            <div className="flex items-center space-x-1.5 text-zinc-400 text-xs font-bold">
              <Skull className="w-4 h-4 text-zinc-400" />
              <span>Total Deaths</span>
            </div>
            <div className="text-2xl font-black text-zinc-300">💀 {totalDeaths}</div>
            <p className="text-[10px] text-zinc-500">Tokens sent home</p>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800 space-y-1">
            <div className="flex items-center space-x-1.5 text-amber-400 text-xs font-bold">
              <Flame className="w-4 h-4" />
              <span>Net Combat Points</span>
            </div>
            <div className={`text-2xl font-black ${netCombat >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {netCombat >= 0 ? `+${netCombat}` : netCombat} pts
            </div>
            <p className="text-[10px] text-zinc-500">(Kills × 5) - (Deaths × 5)</p>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800 space-y-1">
            <div className="flex items-center space-x-1.5 text-blue-400 text-xs font-bold">
              <ShieldAlert className="w-4 h-4" />
              <span>Kills Per Match</span>
            </div>
            <div className="text-2xl font-black text-blue-400">
              {summary.totalMatches > 0 ? (totalKills / summary.totalMatches).toFixed(2) : '0.00'}
            </div>
            <p className="text-[10px] text-zinc-500">Average aggression</p>
          </div>
        </div>
      </div>

      {/* Recent Form Badge Sequence */}
      <div className="bg-zinc-900/80 rounded-3xl p-6 border border-zinc-800/80 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-extrabold text-zinc-100 uppercase tracking-wider flex items-center space-x-2">
            <Flame className="w-4 h-4 text-orange-400" />
            <span>Recent Form & Combat Action</span>
          </h3>
          <span className="text-xs font-bold text-zinc-400">Streak: {summary.currentWinStreak} wins</span>
        </div>

        {recentMatches.length === 0 ? (
          <p className="text-xs text-zinc-500 italic">No recent match history recorded.</p>
        ) : (
          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            {recentMatches.map((m, idx) => (
              <div
                key={idx}
                className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-zinc-950 border border-zinc-800 min-w-16 shadow-inner"
                title={`Match ${m.friendly_id} on ${formatDateStr(m.match_date)}: Rank ${m.position} (+${m.points_awarded} pts) | Kills: ${m.kills || 0}, Deaths: ${m.deaths || 0}`}
              >
                <span className="text-xl">
                  {m.position === 1 ? '🥇' : m.position === 2 ? '🥈' : m.position === 3 ? '🥉' : '4️⃣'}
                </span>
                <span className="text-[11px] font-black text-amber-400 mt-0.5">
                  +{m.points_awarded}
                </span>
                <span className="text-[9px] font-bold text-zinc-400 mt-0.5 flex items-center gap-1">
                  <span className="text-rose-400 font-extrabold">⚔️{m.kills || 0}</span>
                  <span className="text-zinc-500">/</span>
                  <span className="text-zinc-300 font-extrabold">💀{m.deaths || 0}</span>
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
          <span>Performance & Combat by Game Size</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {([4, 3, 2] as const).map((size) => {
            const st = performanceBySize[size];
            return (
              <div key={size} className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 space-y-2.5">
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
                  <div>
                    <span className="text-zinc-500 text-[10px] font-bold block">Combat Kills</span>
                    <span className="font-bold text-rose-400">⚔️ {st.kills || 0}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 text-[10px] font-bold block">Deaths</span>
                    <span className="font-bold text-zinc-400">💀 {st.deaths || 0}</span>
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
                  <th className="py-2.5 px-3 text-center">Combat (K/D)</th>
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
                    <td className="py-3 px-3 text-center">
                      <span className="font-bold text-rose-400">⚔️ {m.kills || 0}</span>
                      <span className="text-zinc-600 mx-1">/</span>
                      <span className="font-bold text-zinc-400">💀 {m.deaths || 0}</span>
                    </td>
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
