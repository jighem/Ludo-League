import React, { useState, useEffect } from 'react';
import { LeaderboardItem } from '../types';
import { apiRequest } from '../api/client';
import { useLeague } from '../context/LeagueContext';
import { Trophy, Download, Calendar, Info, Award, Filter, ShieldCheck, Crown, RefreshCw, Swords, Crosshair, Skull } from 'lucide-react';

interface LeaderboardsProps {
  onSelectPlayer: (playerId: number) => void;
  onOpenNewMatch?: () => void;
}

export const Leaderboards: React.FC<LeaderboardsProps> = ({ onSelectPlayer }) => {
  const { activeLeague, activeLeagueId, dataVersion, triggerDataRefresh } = useLeague();
  const [tab, setTab] = useState<'monthly' | 'yearly' | 'alltime'>('monthly');

  const now = new Date();
  const currentMonthStr = now.toISOString().split('T')[0].substring(0, 7);
  const currentYearStr = String(now.getFullYear());

  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [selectedYear, setSelectedYear] = useState(currentYearStr);
  const [sortBy, setSortBy] = useState<'rank' | 'kills' | 'wins' | 'podium' | 'points'>('rank');

  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [minQualThreshold, setMinQualThreshold] = useState<number>(8);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchLeaderboard();
  }, [tab, selectedMonth, selectedYear, activeLeagueId, dataVersion]);

  const fetchLeaderboard = async () => {
    try {
      if (leaderboard.length === 0) setLoading(true);
      setIsRefreshing(true);
      setError('');
      let endpoint = `/stats/leaderboard?leagueId=${activeLeagueId || 1}&`;
      if (tab === 'monthly') {
        endpoint += `month=${selectedMonth}`;
      } else if (tab === 'yearly') {
        endpoint += `year=${selectedYear}`;
      }

      const res = await apiRequest<{ leaderboard: LeaderboardItem[]; minQualificationThreshold: number }>(endpoint);
      setLeaderboard(res.leaderboard);
      setMinQualThreshold(res.minQualificationThreshold);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch leaderboard.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleExportCSV = () => {
    let url = `/api/stats/export?type=leaderboard&leagueId=${activeLeagueId || 1}`;
    if (tab === 'monthly') url += `&month=${selectedMonth}`;
    if (tab === 'yearly') url += `&year=${selectedYear}`;
    window.open(url, '_blank');
  };

  // Sort display items based on selected sort metric
  const sortedDisplayItems = [...leaderboard].sort((a, b) => {
    if (sortBy === 'kills') {
      return (b.total_kills || 0) - (a.total_kills || 0) || (b.net_combat_points || 0) - (a.net_combat_points || 0);
    }
    if (sortBy === 'wins') {
      return b.wins_1st - a.wins_1st || b.win_pct - a.win_pct;
    }
    if (sortBy === 'podium') {
      return b.podium_pct - a.podium_pct || (b.pos_2nd + b.pos_3rd + b.wins_1st) - (a.pos_2nd + a.pos_3rd + a.wins_1st);
    }
    if (sortBy === 'points') {
      return b.total_points - a.total_points;
    }
    // Default: official calculated rank
    if (a.is_qualified && !b.is_qualified) return -1;
    if (!a.is_qualified && b.is_qualified) return 1;
    return (a.rank || 999) - (b.rank || 999) || b.average_score - a.average_score;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white dark:bg-zinc-900/80 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800/80 shadow-md dark:shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
        <div>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">Official Standings & Combat Stats</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Calculated strictly by <span className="font-bold">Average Score = Total Points / Matches</span> with tracked pawn knockouts
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold rounded-xl text-xs transition-all cursor-pointer border border-zinc-200 dark:border-zinc-700"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            id="btn-leaderboard-refresh"
            onClick={() => {
              triggerDataRefresh();
              fetchLeaderboard();
            }}
            disabled={isRefreshing}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold rounded-xl text-xs transition-all cursor-pointer border border-zinc-200 dark:border-zinc-700 disabled:opacity-50"
            title="Refresh Leaderboard"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-amber-500' : ''}`} />
            <span className="hidden sm:inline">{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Tabs & Filters */}
      <div className="bg-white dark:bg-zinc-900/80 rounded-2xl p-4 border border-zinc-200 dark:border-zinc-800/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
        {/* Type Tabs */}
        <div className="flex bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-xl border border-zinc-200 dark:border-zinc-700/50">
          <button
            onClick={() => setTab('monthly')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              tab === 'monthly' ? 'bg-amber-500 text-zinc-950 shadow-md font-extrabold' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setTab('yearly')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              tab === 'yearly' ? 'bg-amber-500 text-zinc-950 shadow-md font-extrabold' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            Yearly
          </button>
          <button
            onClick={() => setTab('alltime')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              tab === 'alltime' ? 'bg-amber-500 text-zinc-950 shadow-md font-extrabold' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            All-Time
          </button>
        </div>

        {/* Filters & Sorting */}
        <div className="flex flex-wrap items-center gap-2">
          {tab === 'monthly' && (
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50 cursor-pointer"
              />
            </div>
          )}

          {tab === 'yearly' && (
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50 cursor-pointer"
              >
                {[2026, 2025, 2024].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          )}

          {/* Quick Sort Filter */}
          <div className="flex items-center space-x-1 bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs">
            <span className="text-[10px] font-bold text-zinc-400 px-1">Sort:</span>
            <button
              onClick={() => setSortBy('rank')}
              className={`px-2 py-1 rounded-lg font-bold text-[11px] transition-colors cursor-pointer ${
                sortBy === 'rank' ? 'bg-white dark:bg-zinc-700 text-amber-600 dark:text-amber-400 shadow-xs' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              Rank
            </button>
            <button
              onClick={() => setSortBy('kills')}
              className={`px-2 py-1 rounded-lg font-bold text-[11px] transition-colors cursor-pointer flex items-center space-x-1 ${
                sortBy === 'kills' ? 'bg-rose-500 text-white shadow-xs' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              <span>⚔️ Kills</span>
            </button>
            <button
              onClick={() => setSortBy('wins')}
              className={`px-2 py-1 rounded-lg font-bold text-[11px] transition-colors cursor-pointer ${
                sortBy === 'wins' ? 'bg-white dark:bg-zinc-700 text-emerald-600 dark:text-emerald-400 shadow-xs' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              Wins
            </button>
            <button
              onClick={() => setSortBy('podium')}
              className={`px-2 py-1 rounded-lg font-bold text-[11px] transition-colors cursor-pointer ${
                sortBy === 'podium' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              Podium %
            </button>
          </div>
        </div>
      </div>

      {/* Minimum Qualification Notice */}
      {tab === 'monthly' && (
        <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center space-x-3 text-xs text-amber-800 dark:text-amber-300">
          <Info className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>
            <strong className="font-bold text-amber-700 dark:text-amber-400">Minimum Qualification Rule:</strong> Players require at least{' '}
            <strong className="text-amber-800 dark:text-amber-300 underline underline-offset-2">{minQualThreshold} matches</strong> in a calendar month to qualify for the Monthly Championship.
            Qualified players rank above unqualified players in official standings.
          </span>
        </div>
      )}

      {/* Main Leaderboard Table */}
      <div className="bg-white dark:bg-zinc-900/80 rounded-3xl border border-zinc-200 dark:border-zinc-800/80 shadow-md dark:shadow-xl overflow-hidden transition-colors">
        {loading ? (
          <div className="py-12 text-center text-zinc-500 dark:text-zinc-400">
            <div className="inline-block w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-2"></div>
            <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Calculating official database rankings...</p>
          </div>
        ) : sortedDisplayItems.length === 0 || !sortedDisplayItems.some((item) => item.total_matches > 0) ? (
          <div className="py-16 text-center text-zinc-500 dark:text-zinc-400 space-y-2">
            <Trophy className="w-12 h-12 mx-auto text-zinc-400 dark:text-zinc-700" />
            <p className="text-base font-bold text-zinc-800 dark:text-zinc-300">No standings available for this period.</p>
            <p className="text-xs text-zinc-500">Record matches in this date window to view dynamic rankings.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400 font-extrabold uppercase tracking-wider text-[10px] border-b border-zinc-200 dark:border-zinc-800">
                  <th className="py-3 px-4 text-center whitespace-nowrap">Rank</th>
                  <th className="py-3 px-4 text-left whitespace-nowrap">Player</th>
                  <th className="py-3 px-4 text-center whitespace-nowrap">Played</th>
                  <th className="py-3 px-4 text-center whitespace-nowrap">1st (Wins)</th>
                  <th className="py-3 px-4 text-center whitespace-nowrap">2nd</th>
                  <th className="py-3 px-4 text-center whitespace-nowrap">3rd</th>
                  <th className="py-3 px-4 text-center whitespace-nowrap">Last</th>
                  <th className="py-3 px-4 text-center whitespace-nowrap bg-rose-500/10 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400">⚔️ Kills / 💀 Deaths</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Total Pts</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Avg Score</th>
                  <th className="py-3 px-4 text-center whitespace-nowrap">Avg Finish</th>
                  <th className="py-3 px-4 text-center whitespace-nowrap">Win %</th>
                  <th className="py-3 px-4 text-center whitespace-nowrap">Podium %</th>
                  <th className="py-3 px-4 text-center whitespace-nowrap">Qualification</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/60 font-medium text-zinc-800 dark:text-zinc-200">
                {sortedDisplayItems.map((item) => (
                  <tr
                    key={item.player_id}
                    onClick={() => onSelectPlayer(item.player_id)}
                    className="hover:bg-zinc-100/80 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors"
                  >
                    <td className="py-3.5 px-4 text-center font-black text-sm whitespace-nowrap">
                      {item.is_qualified && item.rank > 0 ? (
                        item.rank === 1 ? (
                          <span className="text-amber-600 dark:text-amber-400 font-black">🥇 1</span>
                        ) : item.rank === 2 ? (
                          <span className="text-zinc-600 dark:text-zinc-300 font-black">🥈 2</span>
                        ) : item.rank === 3 ? (
                          <span className="text-amber-700 dark:text-amber-600 font-black">🥉 3</span>
                        ) : (
                          <span className="text-zinc-500 dark:text-zinc-400 font-bold">#{item.rank}</span>
                        )
                      ) : (
                        <span className="text-zinc-400 dark:text-zinc-500 font-bold" title="Must reach minimum matches to qualify for rank">—</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-bold text-xs flex items-center justify-center shrink-0">
                          {item.full_name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center space-x-1.5">
                            <span>{item.full_name}</span>
                            {item.is_champion && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-bold">
                                🏆 Champion
                              </span>
                            )}
                          </div>
                          {item.nickname && (
                            <div className="text-[10px] text-zinc-500 dark:text-zinc-400">{item.nickname}</div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-center font-bold text-zinc-800 dark:text-zinc-200 whitespace-nowrap">{item.total_matches}</td>
                    <td className="py-3.5 px-4 text-center font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">{item.wins_1st}</td>
                    <td className="py-3.5 px-4 text-center text-zinc-700 dark:text-zinc-300 whitespace-nowrap">{item.pos_2nd}</td>
                    <td className="py-3.5 px-4 text-center text-zinc-700 dark:text-zinc-300 whitespace-nowrap">{item.pos_3rd}</td>
                    <td className="py-3.5 px-4 text-center text-red-600 dark:text-red-400 font-bold whitespace-nowrap">{item.last_place}</td>
                    
                    {/* Combat Stats Column */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap bg-rose-50/50 dark:bg-rose-950/10">
                      <div className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-lg bg-rose-100/80 dark:bg-rose-950/60 border border-rose-300/40 dark:border-rose-800/40 text-[11px] font-bold">
                        <span className="text-rose-600 dark:text-rose-400">⚔️ {item.total_kills || 0}</span>
                        <span className="text-zinc-400 font-normal">/</span>
                        <span className="text-zinc-500 dark:text-zinc-400">💀 {item.total_deaths || 0}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right font-bold text-zinc-800 dark:text-zinc-200 whitespace-nowrap">{item.total_points.toFixed(2)}</td>
                    <td className="py-3.5 px-4 text-right font-black text-amber-600 dark:text-amber-400 text-sm whitespace-nowrap">{item.average_score.toFixed(2)}</td>
                    <td className="py-3.5 px-4 text-center font-bold text-zinc-800 dark:text-zinc-200 whitespace-nowrap">{item.average_position.toFixed(2)}</td>
                    <td className="py-3.5 px-4 text-center font-bold text-zinc-800 dark:text-zinc-200 whitespace-nowrap">{item.win_pct}%</td>
                    <td className="py-3.5 px-4 text-center text-zinc-700 dark:text-zinc-300 whitespace-nowrap">{item.podium_pct}%</td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <span
                        className={`inline-block px-2.5 py-1 text-[10px] font-extrabold rounded-full border whitespace-nowrap ${
                          item.is_qualified
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800/80'
                            : 'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800/90 dark:text-zinc-400 dark:border-zinc-700/60'
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
    </div>
  );
};
