import React, { useState, useEffect, useMemo } from 'react';
import { Player } from '../types';
import { apiRequest } from '../api/client';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine
} from 'recharts';
import {
  BarChart3,
  TrendingUp,
  Calendar,
  Trophy,
  Award,
  Users,
  Flame,
  CheckCircle2,
  PieChart as PieIcon,
  Layers,
  Clock
} from 'lucide-react';

const PLAYER_PALETTE = [
  '#f59e0b', // Amber
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#f97316', // Orange
  '#14b8a6', // Teal
  '#6366f1', // Indigo
  '#84cc16'  // Lime
];

interface PlayerStatSummary {
  player_id: number;
  name: string;
  nickname: string | null;
  played: number;
  pos1: number;
  pos2: number;
  pos3: number;
  pos4: number;
  totalPoints: number;
  avgScore: number;
  winPct: number;
  podiumPct: number;
}

interface FormatDistribution {
  format: string;
  players: number;
  count: number;
  pct: number;
  pointsRule: string;
}

export const AnalyticsPage: React.FC<{ onSelectPlayer?: (playerId: number) => void }> = ({ onSelectPlayer }) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  const [filterMonth, setFilterMonth] = useState<string>('');
  const [chartData, setChartData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Toggle for activity volume view mode (weekly vs monthly vs day-of-week)
  const [activityViewMode, setActivityViewMode] = useState<'weekly' | 'monthly' | 'dayOfWeek'>('weekly');

  // Selected player lines to show in multi-line chart (defaults to all active players with data)
  const [visiblePlayers, setVisiblePlayers] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchPlayers();
  }, []);

  useEffect(() => {
    fetchChartsData();
  }, [selectedPlayerId, filterMonth]);

  const fetchPlayers = async () => {
    try {
      const res = await apiRequest<{ players: Player[] }>('/players?status=active');
      setPlayers(res.players || []);
    } catch (err) {
      console.error('Failed to fetch players:', err);
    }
  };

  const fetchChartsData = async () => {
    try {
      setLoading(true);
      let endpoint = '/stats/charts';
      const params: string[] = [];
      if (selectedPlayerId) params.push(`playerId=${selectedPlayerId}`);
      if (filterMonth) params.push(`month=${filterMonth}`);
      if (params.length > 0) endpoint += `?${params.join('&')}`;

      const res = await apiRequest(endpoint);
      setChartData(res);

      // By default, enable all active players for the multi-line chart
      if (res?.playerStatsSummary) {
        const topPlayers = res.playerStatsSummary.slice(0, 6).map((p: PlayerStatSummary) => p.name);
        setVisiblePlayers(new Set(topPlayers));
      }
    } catch (err) {
      console.error('Failed to load chart data:', err);
    } finally {
      setLoading(false);
    }
  };

  const togglePlayerVisibility = (name: string) => {
    setVisiblePlayers((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        if (next.size > 1) next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const selectAllPlayers = () => {
    if (chartData?.playerStatsSummary) {
      setVisiblePlayers(new Set(chartData.playerStatsSummary.map((p: PlayerStatSummary) => p.name)));
    }
  };

  const selectTopPlayers = (count: number) => {
    if (chartData?.playerStatsSummary) {
      setVisiblePlayers(new Set(chartData.playerStatsSummary.slice(0, count).map((p: PlayerStatSummary) => p.name)));
    }
  };

  // KPI highlights
  const topPlayer = useMemo(() => {
    if (!chartData?.playerStatsSummary?.length) return null;
    return chartData.playerStatsSummary[0];
  }, [chartData]);

  const mostWinsPlayer = useMemo(() => {
    if (!chartData?.playerStatsSummary?.length) return null;
    return [...chartData.playerStatsSummary].sort((a: PlayerStatSummary, b: PlayerStatSummary) => b.pos1 - a.pos1)[0];
  }, [chartData]);

  const peakDay = useMemo(() => {
    if (!chartData?.dayOfWeekVolume?.length) return null;
    return [...chartData.dayOfWeekVolume].sort((a: any, b: any) => b.count - a.count)[0];
  }, [chartData]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white dark:bg-zinc-900/80 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800/80 shadow-md dark:shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">Analytics & Visual Insights</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Player average score trajectories, finishing positions breakdown, and weekly match trends.
            </p>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Month Filter */}
          <div className="w-full sm:w-40">
            <label className="block text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
              Month Scope
            </label>
            <input
              type="month"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl font-bold text-zinc-900 dark:text-zinc-100 text-xs focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Player Selector */}
          <div className="w-full sm:w-56">
            <label className="block text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
              Player Filter
            </label>
            <select
              value={selectedPlayerId}
              onChange={(e) => setSelectedPlayerId(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl font-bold text-zinc-900 dark:text-zinc-100 text-xs focus:ring-2 focus:ring-amber-500"
            >
              <option value="">All League Players</option>
              {players.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name} {p.nickname ? `(${p.nickname})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards Summary */}
      {chartData && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white dark:bg-zinc-900/80 rounded-2xl p-4 border border-zinc-200 dark:border-zinc-800/80 shadow-xs">
            <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">Total Matches</span>
              <Layers className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl font-black text-zinc-900 dark:text-zinc-100">
              {chartData.totalMatches || 0}
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
              {chartData.totalPointsAwarded || 0} pts distributed
            </p>
          </div>

          <div className="bg-white dark:bg-zinc-900/80 rounded-2xl p-4 border border-zinc-200 dark:border-zinc-800/80 shadow-xs">
            <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">Highest Avg Score</span>
              <Trophy className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
              {topPlayer ? `${topPlayer.avgScore.toFixed(1)} pts` : '—'}
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 truncate font-semibold">
              {topPlayer ? topPlayer.name : 'No matches'}
            </p>
          </div>

          <div className="bg-white dark:bg-zinc-900/80 rounded-2xl p-4 border border-zinc-200 dark:border-zinc-800/80 shadow-xs">
            <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">Most 1st Places</span>
              <Award className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {mostWinsPlayer ? `${mostWinsPlayer.pos1} Wins` : '0'}
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 truncate font-semibold">
              {mostWinsPlayer ? `${mostWinsPlayer.name} (${mostWinsPlayer.winPct}% Win Rate)` : '—'}
            </p>
          </div>

          <div className="bg-white dark:bg-zinc-900/80 rounded-2xl p-4 border border-zinc-200 dark:border-zinc-800/80 shadow-xs">
            <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">Peak Match Day</span>
              <Calendar className="w-4 h-4 text-purple-500" />
            </div>
            <div className="text-2xl font-black text-purple-600 dark:text-purple-400">
              {peakDay && peakDay.count > 0 ? peakDay.fullDay : '—'}
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 font-semibold">
              {peakDay && peakDay.count > 0 ? `${peakDay.count} matches played` : 'No matches'}
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-900/80 rounded-3xl border border-zinc-200 dark:border-zinc-800/80">
          <div className="inline-block w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-2"></div>
          <p className="text-xs font-semibold">Generating visual analytics from database...</p>
        </div>
      ) : !chartData ? null : (
        <div className="space-y-6">
          {/* ========================================================================= */}
          {/* SECTION 1: PERSON POINTS AVERAGE PROGRESSION LINE GRAPH (REPLACES ROLLING AVG) */}
          {/* ========================================================================= */}
          <div className="bg-white dark:bg-zinc-900/80 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800/80 shadow-md dark:shadow-xl space-y-4 transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-200 dark:border-zinc-800/80 pb-4">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5 text-amber-500" />
                <div>
                  <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100">
                    {selectedPlayerId
                      ? `${players.find((p) => p.id === Number(selectedPlayerId))?.full_name || 'Player'} - Points Average Evolution`
                      : 'Player Points Average Progression (Running Average Trajectory)'}
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {selectedPlayerId
                      ? 'Progression of running average score (sum points ÷ matches played) and match scores over time.'
                      : 'Comparison of cumulative average points scored per player over match sequences.'}
                  </p>
                </div>
              </div>

              {!selectedPlayerId && chartData.playerStatsSummary?.length > 0 && (
                <div className="flex items-center space-x-2 text-xs">
                  <button
                    onClick={() => selectTopPlayers(4)}
                    className="px-2.5 py-1 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold rounded-lg cursor-pointer"
                  >
                    Top 4
                  </button>
                  <button
                    onClick={selectAllPlayers}
                    className="px-2.5 py-1 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold rounded-lg cursor-pointer"
                  >
                    All Players
                  </button>
                </div>
              )}
            </div>

            {/* Player Selection Pills when All Players is active */}
            {!selectedPlayerId && chartData.playerStatsSummary?.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] font-bold text-zinc-400 mr-1">Toggle Player Lines:</span>
                {chartData.playerStatsSummary.map((p: PlayerStatSummary, idx: number) => {
                  const isVisible = visiblePlayers.has(p.name);
                  const color = PLAYER_PALETTE[idx % PLAYER_PALETTE.length];
                  return (
                    <button
                      key={p.player_id}
                      onClick={() => togglePlayerVisibility(p.name)}
                      className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer border ${
                        isVisible
                          ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white border-zinc-300 dark:border-zinc-700 shadow-xs'
                          : 'bg-zinc-50 dark:bg-zinc-900/40 text-zinc-400 border-zinc-200 dark:border-zinc-800 opacity-60'
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                      <span>{p.name}</span>
                      <span className="text-[10px] text-zinc-500 font-normal">({p.avgScore.toFixed(1)} avg)</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Multi-Player Running Average Line Chart */}
            {!selectedPlayerId ? (
              chartData.playerCumulativeTrends?.length === 0 ? (
                <p className="text-xs text-zinc-500 py-12 text-center">No match data recorded yet.</p>
              ) : (
                <div className="h-80 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData.playerCumulativeTrends}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" opacity={0.3} />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 10, fill: '#71717a' }}
                        label={{ value: 'Chronological Match Sequence', position: 'insideBottomRight', offset: -5, fontSize: 10, fill: '#71717a' }}
                      />
                      <YAxis
                        domain={[0, 60]}
                        tick={{ fontSize: 10, fill: '#71717a' }}
                        label={{ value: 'Cumulative Avg Points', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#71717a' }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#18181b',
                          borderColor: '#27272a',
                          borderRadius: '16px',
                          color: '#f4f4f5',
                          fontSize: '12px',
                          boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', color: '#a1a1aa', paddingTop: '8px' }} />

                      {/* 25-Point Base Benchmark Line */}
                      <ReferenceLine
                        y={25.0}
                        stroke="#71717a"
                        strokeDasharray="4 4"
                        label={{ value: '25.0 Pts League Avg', fill: '#a1a1aa', fontSize: 10, position: 'right' }}
                      />

                      {/* Dynamic Player Lines */}
                      {chartData.playerStatsSummary?.map((p: PlayerStatSummary, idx: number) => {
                        if (!visiblePlayers.has(p.name)) return null;
                        const color = PLAYER_PALETTE[idx % PLAYER_PALETTE.length];
                        return (
                          <Line
                            key={p.player_id}
                            type="monotone"
                            dataKey={p.name}
                            name={`${p.name} (${p.avgScore.toFixed(1)})`}
                            stroke={color}
                            strokeWidth={2.5}
                            dot={{ r: 3, fill: color }}
                            activeDot={{ r: 6 }}
                            connectNulls
                          />
                        );
                      })}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )
            ) : (
              /* Single Player Detailed Trend */
              chartData.singlePlayerTrend?.length === 0 ? (
                <p className="text-xs text-zinc-500 py-12 text-center">No matches played by this player.</p>
              ) : (
                <div className="h-80 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData.singlePlayerTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" opacity={0.3} />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 10, fill: '#71717a' }}
                        label={{ value: 'Player Match Sequence', position: 'insideBottomRight', offset: -5, fontSize: 10, fill: '#71717a' }}
                      />
                      <YAxis
                        domain={[0, 100]}
                        tick={{ fontSize: 10, fill: '#71717a' }}
                        label={{ value: 'Points', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#71717a' }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#18181b',
                          borderColor: '#27272a',
                          borderRadius: '16px',
                          color: '#f4f4f5',
                          fontSize: '12px'
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', color: '#a1a1aa' }} />

                      <ReferenceLine
                        y={25.0}
                        stroke="#71717a"
                        strokeDasharray="4 4"
                        label={{ value: '25.0 Pts League Baseline', fill: '#a1a1aa', fontSize: 10, position: 'right' }}
                      />

                      {/* Cumulative Running Average Line */}
                      <Line
                        type="monotone"
                        dataKey="cumulative_average"
                        name="Cumulative Points Average"
                        stroke="#f59e0b"
                        strokeWidth={3}
                        dot={{ r: 4, fill: '#f59e0b' }}
                      />

                      {/* Individual Match Points Dots */}
                      <Line
                        type="linear"
                        dataKey="match_points"
                        name="Single Match Score (Points)"
                        stroke="#3b82f6"
                        strokeWidth={1.5}
                        strokeDasharray="3 3"
                        dot={{ r: 5, fill: '#3b82f6' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )
            )}
          </div>

          {/* ========================================================================= */}
          {/* SECTION 2: PLAYER FINISHING POSITIONS BREAKDOWN & AVERAGE SCORE COMPARISON */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 2A: Stacked Bar Chart of Finishing Positions (Replaces meaningless pie chart) */}
            <div className="bg-white dark:bg-zinc-900/80 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800/80 shadow-md dark:shadow-xl space-y-4 transition-colors">
              <div className="flex items-center space-x-2 border-b border-zinc-200 dark:border-zinc-800/80 pb-3">
                <Trophy className="w-5 h-5 text-amber-500" />
                <div>
                  <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100">
                    Player Finishing Positions Breakdown
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Distribution of 1st, 2nd, 3rd, and 4th place finishes per player.
                  </p>
                </div>
              </div>

              {chartData.playerStatsSummary?.length === 0 ? (
                <p className="text-xs text-zinc-500 py-12 text-center">No player finishes available.</p>
              ) : (
                <div className="h-72 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData.playerStatsSummary}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" opacity={0.3} />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#71717a' }} />
                      <YAxis tick={{ fontSize: 10, fill: '#71717a' }} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#18181b',
                          borderColor: '#27272a',
                          borderRadius: '16px',
                          color: '#f4f4f5',
                          fontSize: '12px'
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', color: '#a1a1aa' }} />
                      <Bar dataKey="pos1" name="🥇 1st Place (Wins)" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="pos2" name="🥈 2nd Place" stackId="a" fill="#94a3b8" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="pos3" name="🥉 3rd Place" stackId="a" fill="#d97706" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="pos4" name="4️⃣ 4th Place" stackId="a" fill="#ef4444" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Chart 2B: Player Average Points Comparison Bar Chart */}
            <div className="bg-white dark:bg-zinc-900/80 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800/80 shadow-md dark:shadow-xl space-y-4 transition-colors">
              <div className="flex items-center space-x-2 border-b border-zinc-200 dark:border-zinc-800/80 pb-3">
                <Award className="w-5 h-5 text-emerald-500" />
                <div>
                  <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100">
                    Player Average Points Comparison
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Average Score per match (Ranked from highest to lowest).
                  </p>
                </div>
              </div>

              {chartData.playerStatsSummary?.length === 0 ? (
                <p className="text-xs text-zinc-500 py-12 text-center">No player averages available.</p>
              ) : (
                <div className="h-72 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData.playerStatsSummary}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" opacity={0.3} />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#71717a' }} />
                      <YAxis domain={[0, 60]} tick={{ fontSize: 10, fill: '#71717a' }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#18181b',
                          borderColor: '#27272a',
                          borderRadius: '16px',
                          color: '#f4f4f5',
                          fontSize: '12px'
                        }}
                        formatter={(val: any) => [`${val} pts`, 'Average Score']}
                      />
                      <ReferenceLine
                        y={25.0}
                        stroke="#71717a"
                        strokeDasharray="4 4"
                        label={{ value: '25.0 Avg', fill: '#a1a1aa', fontSize: 10, position: 'right' }}
                      />
                      <Bar dataKey="avgScore" name="Average Points per Game" fill="#10b981" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* SECTION 3: MATCH ACTIVITY VOLUME (WEEKLY, MONTHLY, DAY-OF-WEEK) */}
          {/* ========================================================================= */}
          <div className="bg-white dark:bg-zinc-900/80 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800/80 shadow-md dark:shadow-xl space-y-4 transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800/80 pb-4">
              <div className="flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-blue-500" />
                <div>
                  <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100">
                    Match Activity Volume & Frequency
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Track activity trends across weeks, months, or day-of-week distribution.
                  </p>
                </div>
              </div>

              {/* Toggle Buttons */}
              <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl border border-zinc-200 dark:border-zinc-700">
                <button
                  onClick={() => setActivityViewMode('weekly')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                    activityViewMode === 'weekly'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  Weekly Activity
                </button>
                <button
                  onClick={() => setActivityViewMode('monthly')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                    activityViewMode === 'monthly'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  Monthly Activity
                </button>
                <button
                  onClick={() => setActivityViewMode('dayOfWeek')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                    activityViewMode === 'dayOfWeek'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  Day of Week
                </button>
              </div>
            </div>

            {/* Weekly View */}
            {activityViewMode === 'weekly' && (
              <div className="h-72 w-full pt-2">
                {chartData.matchVolumeWeekly?.length === 0 ? (
                  <p className="text-xs text-zinc-500 py-12 text-center">No weekly activity data.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData.matchVolumeWeekly}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" opacity={0.3} />
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#71717a' }} />
                      <YAxis tick={{ fontSize: 10, fill: '#71717a' }} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#18181b',
                          borderColor: '#27272a',
                          borderRadius: '16px',
                          color: '#f4f4f5',
                          fontSize: '12px'
                        }}
                      />
                      <Bar dataKey="match_count" name="Matches Played (Week)" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            )}

            {/* Monthly View */}
            {activityViewMode === 'monthly' && (
              <div className="h-72 w-full pt-2">
                {chartData.matchVolumeMonthly?.length === 0 ? (
                  <p className="text-xs text-zinc-500 py-12 text-center">No monthly activity data.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData.matchVolumeMonthly}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" opacity={0.3} />
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#71717a' }} />
                      <YAxis tick={{ fontSize: 10, fill: '#71717a' }} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#18181b',
                          borderColor: '#27272a',
                          borderRadius: '16px',
                          color: '#f4f4f5',
                          fontSize: '12px'
                        }}
                      />
                      <Bar dataKey="match_count" name="Matches Played (Month)" fill="#6366f1" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            )}

            {/* Day of Week View */}
            {activityViewMode === 'dayOfWeek' && (
              <div className="h-72 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData.dayOfWeekVolume}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" opacity={0.3} />
                    <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#71717a' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#71717a' }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#18181b',
                        borderColor: '#27272a',
                        borderRadius: '16px',
                        color: '#f4f4f5',
                        fontSize: '12px'
                      }}
                      formatter={(val: any, name: any, item: any) => [
                        `${val} matches`,
                        item.payload.fullDay
                      ]}
                    />
                    <Bar dataKey="count" name="Matches Played" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* SECTION 4: GAME FORMAT DISTRIBUTION & PERFORMANCE MATRIX */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Format Distribution Cards */}
            <div className="bg-white dark:bg-zinc-900/80 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800/80 shadow-md dark:shadow-xl space-y-4 lg:col-span-1 transition-colors">
              <div className="flex items-center space-x-2 border-b border-zinc-200 dark:border-zinc-800/80 pb-3">
                <Users className="w-5 h-5 text-indigo-500" />
                <div>
                  <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100">
                    Game Formats
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Proportion of 4P, 3P, and 2P games.
                  </p>
                </div>
              </div>

              <div className="space-y-3 pt-1">
                {chartData.formatDistribution?.map((f: FormatDistribution) => (
                  <div
                    key={f.format}
                    className="p-3.5 bg-zinc-50 dark:bg-zinc-800/60 rounded-2xl border border-zinc-200 dark:border-zinc-700/60 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-xs text-zinc-900 dark:text-zinc-100">
                        {f.format}
                      </span>
                      <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800/40">
                        {f.count} ({f.pct}%)
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div className="w-full bg-zinc-200 dark:bg-zinc-700 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${f.pct}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-zinc-500 dark:text-zinc-400 flex items-center justify-between">
                      <span>Points: {f.pointsRule}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Win Rate & Podium Share Table */}
            <div className="bg-white dark:bg-zinc-900/80 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800/80 shadow-md dark:shadow-xl space-y-4 lg:col-span-2 transition-colors">
              <div className="flex items-center space-x-2 border-b border-zinc-200 dark:border-zinc-800/80 pb-3">
                <Flame className="w-5 h-5 text-orange-500" />
                <div>
                  <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100">
                    Player Performance & Efficiency Matrix
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Win rate (🥇 1st %), Podium share (🥇+🥈+🥉 %), and points per game breakdown.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 font-extrabold uppercase tracking-wider text-[10px]">
                      <th className="py-2.5 px-3">Player</th>
                      <th className="py-2.5 px-2 text-center">Played</th>
                      <th className="py-2.5 px-2 text-center text-amber-500">1st (Wins)</th>
                      <th className="py-2.5 px-2 text-center text-emerald-500">Win Rate</th>
                      <th className="py-2.5 px-2 text-center text-blue-500">Podium %</th>
                      <th className="py-2.5 px-3 text-right text-amber-600 dark:text-amber-400 font-black">Avg Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/60 font-medium text-zinc-800 dark:text-zinc-300">
                    {chartData.playerStatsSummary?.map((p: PlayerStatSummary) => (
                      <tr
                        key={p.player_id}
                        onClick={() => onSelectPlayer && onSelectPlayer(p.player_id)}
                        className="hover:bg-zinc-100/70 dark:hover:bg-zinc-800/40 cursor-pointer transition-colors"
                      >
                        <td className="py-2.5 px-3 font-extrabold text-zinc-900 dark:text-white">
                          {p.name} {p.nickname && <span className="text-[10px] text-zinc-500 font-normal">({p.nickname})</span>}
                        </td>
                        <td className="py-2.5 px-2 text-center font-bold">{p.played}</td>
                        <td className="py-2.5 px-2 text-center font-black text-amber-600 dark:text-amber-400">{p.pos1}</td>
                        <td className="py-2.5 px-2 text-center">
                          <span className="font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                            {p.winPct}%
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <span className="font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-full">
                            {p.podiumPct}%
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-black text-amber-600 dark:text-amber-400 text-sm">
                          {p.avgScore.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
