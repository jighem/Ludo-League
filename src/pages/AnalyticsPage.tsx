import React, { useState, useEffect } from 'react';
import { Player } from '../types';
import { apiRequest } from '../api/client';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';
import { BarChart3, TrendingUp, PieChart as PieIcon, Calendar } from 'lucide-react';

const COLORS = ['#f59e0b', '#94a3b8', '#d97706', '#ef4444'];

export const AnalyticsPage: React.FC = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  const [chartData, setChartData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlayers();
  }, []);

  useEffect(() => {
    fetchChartsData();
  }, [selectedPlayerId]);

  const fetchPlayers = async () => {
    try {
      const res = await apiRequest<{ players: Player[] }>('/players?status=active');
      setPlayers(res.players);
    } catch (err) {
      // ignore
    }
  };

  const fetchChartsData = async () => {
    try {
      setLoading(true);
      let endpoint = '/stats/charts';
      if (selectedPlayerId) endpoint += `?playerId=${selectedPlayerId}`;
      const res = await apiRequest(endpoint);
      setChartData(res);
    } catch (err) {
      console.error('Failed to load chart data:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-zinc-900/80 rounded-3xl p-6 border border-zinc-800/80 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-zinc-100 tracking-tight">Analytics & Visual Charts</h2>
            <p className="text-xs text-zinc-400">
              Visualizing performance trends, match volume, and rank distributions
            </p>
          </div>
        </div>

        {/* Filter Player for charts */}
        <div className="w-full sm:w-64">
          <select
            value={selectedPlayerId}
            onChange={(e) => setSelectedPlayerId(e.target.value)}
            className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl font-bold text-zinc-100 text-xs focus:ring-2 focus:ring-amber-500"
          >
            <option value="">All League Players</option>
            {players.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-400">
          <div className="inline-block w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-2"></div>
          <p className="text-xs font-semibold">Generating visual analytics from database...</p>
        </div>
      ) : !chartData ? null : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 1: Average Score Trend Line Chart */}
          <div className="bg-zinc-900/80 rounded-3xl p-6 border border-zinc-800/80 shadow-xl space-y-4 lg:col-span-2">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-extrabold text-zinc-100">
                Rolling Average Score Trend (5-Game Moving Average)
              </h3>
            </div>

            {chartData.rollingTrend.length === 0 ? (
              <p className="text-xs text-zinc-500 py-8 text-center">No trend data available.</p>
            ) : (
              <div className="h-72 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData.rollingTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.6} />
                    <XAxis dataKey="friendly_id" tick={{ fontSize: 10, fill: '#71717a' }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#71717a' }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '16px', color: '#f4f4f5', fontSize: '12px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', color: '#a1a1aa' }} />
                    <Line type="monotone" dataKey="points" name="Match Points" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="rolling_avg" name="5-Match Rolling Avg" stroke="#10b981" strokeWidth={3} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Chart 2: Monthly Match Volume Bar Chart */}
          <div className="bg-zinc-900/80 rounded-3xl p-6 border border-zinc-800/80 shadow-xl space-y-4">
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-blue-400" />
              <h3 className="text-base font-extrabold text-zinc-100">Monthly Match Activity Volume</h3>
            </div>

            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.matchVolume}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.6} />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#71717a' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#71717a' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '16px', color: '#f4f4f5', fontSize: '12px' }}
                  />
                  <Bar dataKey="match_count" name="Matches Played" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 3: Position Distribution Pie Chart */}
          <div className="bg-zinc-900/80 rounded-3xl p-6 border border-zinc-800/80 shadow-xl space-y-4">
            <div className="flex items-center space-x-2">
              <PieIcon className="w-5 h-5 text-orange-400" />
              <h3 className="text-base font-extrabold text-zinc-100">Finishing Position Breakdown</h3>
            </div>

            <div className="h-64 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData.positionDistribution}
                    dataKey="count"
                    nameKey="position"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={(entry) => `Pos ${entry.position}: ${entry.count}`}
                  >
                    {chartData.positionDistribution.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
