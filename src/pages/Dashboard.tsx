import React, { useState, useEffect } from 'react';
import { LeaderboardItem, Match } from '../types';
import { apiRequest } from '../api/client';
import { formatDateStr } from '../utils/date';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import {
  Trophy,
  Flame,
  Calendar,
  Users,
  Plus,
  ArrowUpRight,
  Medal,
  Award,
  Sparkles,
  ChevronRight,
  TrendingUp,
  AlertCircle
} from 'lucide-react';

interface DashboardProps {
  onOpenNewMatch: () => void;
  onSelectPlayer: (playerId: number) => void;
  onNavigateTab: (tab: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onOpenNewMatch,
  onSelectPlayer,
  onNavigateTab
}) => {
  const { user } = useAuth();
  const { appName } = useSettings();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<{
    summary: {
      matchesToday: number;
      matchesThisMonth: number;
      activePlayers: number;
      currentLeader: string;
      currentLeaderAverage: number;
      mostWinsThisMonth: string;
      mostActivePlayer: string;
      highestWinRatePlayer: string;
    };
    latestMatch: Match | null;
    leaderboard: LeaderboardItem[];
    currentMonth: string;
  } | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await apiRequest('/stats/dashboard');
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="inline-block w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-sm font-semibold text-slate-500">Loading {appName} Dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300">
        <div className="flex items-center space-x-2 font-bold mb-2">
          <AlertCircle className="w-5 h-5" />
          <span>Error loading dashboard</span>
        </div>
        <p className="text-xs">{error}</p>
        <button
          onClick={fetchDashboardData}
          className="mt-3 px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-bold"
        >
          Retry
        </button>
      </div>
    );
  }

  const summary = data?.summary || {
    matchesToday: 0,
    matchesThisMonth: 0,
    activePlayers: 0,
    currentLeader: 'None',
    currentLeaderAverage: 0,
    mostWinsThisMonth: 'None',
    mostActivePlayer: 'None',
    highestWinRatePlayer: 'None'
  };

  const leaderboard = data?.leaderboard || [];
  const latestMatch = data?.latestMatch;

  return (
    <div className="space-y-6">
      {/* Top Hero Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 dark:from-zinc-900 dark:via-zinc-900/95 dark:to-zinc-950 rounded-[2rem] p-6 sm:p-8 text-white dark:text-zinc-100 shadow-xl dark:shadow-2xl border border-amber-500/30 dark:border-zinc-800/80 transition-colors">
        <div className="absolute right-0 top-0 bottom-0 opacity-15 dark:opacity-10 pointer-events-none flex items-center pr-10">
          <Trophy className="w-80 h-80 text-amber-200 dark:text-amber-400" />
        </div>

        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/20 dark:bg-amber-500/10 border border-white/30 dark:border-amber-500/20 text-white dark:text-amber-400 text-[11px] font-extrabold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Monthly Championship Race</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight text-white dark:text-zinc-100">
            {appName} Dashboard
          </h1>

          <p className="text-xs sm:text-sm text-amber-100 dark:text-zinc-400 mt-2 font-medium leading-relaxed">
            Track daily game results, calculated point rankings, player progress, and monthly championship standings in a unified bento interface.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            {(user?.role === 'admin' || user?.role === 'operator') && (
              <button
                id="btn-quick-record-match-hero"
                onClick={onOpenNewMatch}
                className="inline-flex items-center space-x-2 px-5 py-2.5 bg-zinc-950 dark:bg-gradient-to-r dark:from-amber-400 dark:via-amber-500 dark:to-orange-500 hover:bg-zinc-900 dark:hover:from-amber-500 dark:hover:to-orange-600 text-white dark:text-zinc-950 font-black rounded-xl shadow-lg active:scale-95 transition-all cursor-pointer text-xs"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>+ Record Match</span>
              </button>
            )}

            <button
              onClick={() => onNavigateTab('leaderboards')}
              className="inline-flex items-center space-x-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 dark:bg-zinc-800/60 dark:hover:bg-zinc-800 text-white dark:text-zinc-200 font-bold rounded-xl border border-white/20 dark:border-zinc-700/80 transition-all cursor-pointer text-xs"
            >
              <span>Full Standings</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Bento Metric Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Matches Today */}
        <div className="bg-white dark:bg-zinc-900/80 p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800/80 shadow-md dark:shadow-xl relative overflow-hidden group transition-all">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500">Matches Today</span>
            <div className="w-8 h-8 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-zinc-900 dark:text-zinc-100">
            {summary.matchesToday}
          </div>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 font-medium">Recorded for today</p>
        </div>

        {/* Matches This Month */}
        <div className="bg-white dark:bg-zinc-900/80 p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800/80 shadow-md dark:shadow-xl relative overflow-hidden group transition-all">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500">Month Matches</span>
            <div className="w-8 h-8 rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 flex items-center justify-center">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-zinc-900 dark:text-zinc-100">
            {summary.matchesThisMonth}
          </div>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 font-medium">Total in {data?.currentMonth}</p>
        </div>

        {/* Current Leader */}
        <div className="bg-white dark:bg-zinc-900/80 p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800/80 shadow-md dark:shadow-xl relative overflow-hidden group transition-all">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500">Monthly Leader</span>
            <div className="w-8 h-8 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <Trophy className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-zinc-900 dark:text-zinc-100 truncate">
            {summary.currentLeader}
          </div>
          <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 mt-1">
            Avg Score: {summary.currentLeaderAverage} pts
          </p>
        </div>

        {/* Active Players */}
        <div className="bg-white dark:bg-zinc-900/80 p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800/80 shadow-md dark:shadow-xl relative overflow-hidden group transition-all">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500">Active Players</span>
            <div className="w-8 h-8 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-zinc-900 dark:text-zinc-100">
            {summary.activePlayers}
          </div>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 font-medium">Registered in league</p>
        </div>
      </div>

      {/* Content Grid: Leaderboard & Latest Match */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Current Month Leaderboard (2 Cols) */}
        <div className="lg:col-span-2 bg-white dark:bg-zinc-900/80 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800/80 shadow-md dark:shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center">
                <Medal className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-zinc-900 dark:text-zinc-100">Current Standings</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Ranked by Average Score for {data?.currentMonth}</p>
              </div>
            </div>

            <button
              onClick={() => onNavigateTab('leaderboards')}
              className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:text-amber-500 dark:hover:text-amber-300 hover:underline inline-flex items-center space-x-1"
            >
              <span>View All</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {leaderboard.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 space-y-2">
              <Trophy className="w-12 h-12 mx-auto text-zinc-400 dark:text-zinc-700" />
              <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">No matches recorded for this month yet.</p>
              <p className="text-xs text-zinc-500">Record a match to initialize the monthly leaderboard!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 font-extrabold uppercase tracking-wider text-[10px] bg-zinc-50 dark:bg-transparent">
                    <th className="py-2.5 px-3">Rank</th>
                    <th className="py-2.5 px-3">Player</th>
                    <th className="py-2.5 px-3 text-center">Played</th>
                    <th className="py-2.5 px-3 text-center">Wins</th>
                    <th className="py-2.5 px-3 text-center">Win %</th>
                    <th className="py-2.5 px-3 text-right">Avg Score</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/60 font-medium text-zinc-800 dark:text-zinc-300">
                  {leaderboard.map((item) => (
                    <tr
                      key={item.player_id}
                      onClick={() => onSelectPlayer(item.player_id)}
                      className="hover:bg-zinc-100/70 dark:hover:bg-zinc-800/40 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-3 font-black text-sm">
                        {item.rank === 1 ? (
                          <span className="text-amber-600 dark:text-amber-400 font-black">🥇 1</span>
                        ) : item.rank === 2 ? (
                          <span className="text-zinc-600 dark:text-zinc-400 font-black">🥈 2</span>
                        ) : item.rank === 3 ? (
                          <span className="text-amber-700 dark:text-amber-600 font-black">🥉 3</span>
                        ) : (
                          <span className="text-zinc-500">#{item.rank}</span>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex items-center space-x-2">
                          <div className="w-7 h-7 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-extrabold text-xs flex items-center justify-center shrink-0">
                            {item.full_name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center space-x-1">
                              <span>{item.full_name}</span>
                              {item.is_champion && (
                                <span title="Monthly Leader">🏆</span>
                              )}
                            </div>
                            {item.nickname && (
                              <div className="text-[10px] text-zinc-500">{item.nickname}</div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-center font-bold">{item.total_matches}</td>
                      <td className="py-3 px-3 text-center font-bold text-emerald-600 dark:text-emerald-400">
                        {item.wins_1st}
                      </td>
                      <td className="py-3 px-3 text-center">{item.win_pct}%</td>
                      <td className="py-3 px-3 text-right font-black text-amber-600 dark:text-amber-400 text-sm">
                        {item.average_score.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-extrabold rounded-full ${
                            item.is_qualified
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/60'
                              : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border border-zinc-200 dark:border-transparent'
                          }`}
                        >
                          {item.is_qualified ? 'Qualified' : 'Not Qualified'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Sidebar Column: Latest Match & Highlights */}
        <div className="space-y-6">
          {/* Latest Match Card */}
          <div className="bg-white dark:bg-zinc-900/80 rounded-3xl p-5 border border-zinc-200 dark:border-zinc-800/80 shadow-md dark:shadow-xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center space-x-2">
                <Trophy className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <h4 className="text-xs font-extrabold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">Latest Match Result</h4>
              </div>
              {latestMatch && (
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                  {latestMatch.friendly_id}
                </span>
              )}
            </div>

            {!latestMatch ? (
              <div className="py-6 text-center text-xs text-zinc-500">
                No recent match recorded.
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
                  <span>📅 {formatDateStr(latestMatch.match_date)} at {latestMatch.match_time}</span>
                  <span>{latestMatch.player_count} Players</span>
                </div>

                <div className="space-y-1.5 pt-1">
                  {latestMatch.results?.map((res) => (
                    <div
                      key={res.id}
                      className="flex items-center justify-between p-2.5 rounded-2xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800/80 text-xs"
                    >
                      <div className="flex items-center space-x-2">
                        <span className="font-black text-sm">
                          {res.position === 1 ? '🥇' : res.position === 2 ? '🥈' : res.position === 3 ? '🥉' : '4️⃣'}
                        </span>
                        <span className="font-bold text-zinc-900 dark:text-zinc-100">{res.player_name}</span>
                      </div>
                      <span className="font-black text-amber-600 dark:text-amber-400">
                        +{res.points_awarded} pts
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Monthly Stats Highlights */}
          <div className="bg-white dark:bg-zinc-900/80 rounded-3xl p-5 border border-zinc-200 dark:border-zinc-800/80 shadow-md dark:shadow-xl space-y-3">
            <h4 className="text-xs font-extrabold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider flex items-center space-x-2">
              <Award className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              <span>Month Highlights</span>
            </h4>

            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase font-bold text-zinc-500">Most Wins</div>
                  <div className="font-bold text-zinc-900 dark:text-zinc-100">{summary.mostWinsThisMonth}</div>
                </div>
                <Flame className="w-5 h-5 text-orange-500 dark:text-orange-400" />
              </div>

              <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase font-bold text-zinc-500">Most Active Player</div>
                  <div className="font-bold text-zinc-900 dark:text-zinc-100">{summary.mostActivePlayer}</div>
                </div>
                <Users className="w-5 h-5 text-blue-500 dark:text-blue-400" />
              </div>

              <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase font-bold text-zinc-500">Highest Win Rate</div>
                  <div className="font-bold text-zinc-900 dark:text-zinc-100">{summary.highestWinRatePlayer}</div>
                </div>
                <TrendingUp className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
