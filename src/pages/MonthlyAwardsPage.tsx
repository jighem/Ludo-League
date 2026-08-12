import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api/client';
import { Award, Trophy, Flame, TrendingUp, Target, Calendar, ChevronRight } from 'lucide-react';

export const MonthlyAwardsPage: React.FC = () => {
  const now = new Date();
  const currentMonthStr = now.toISOString().split('T')[0].substring(0, 7);

  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [awardsData, setAwardsData] = useState<any>(null);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAwards();
    fetchHistory();
  }, [selectedMonth]);

  const fetchAwards = async () => {
    try {
      setLoading(true);
      const res = await apiRequest(`/stats/monthly-awards?month=${selectedMonth}`);
      setAwardsData(res.awards);
    } catch (err) {
      console.error('Failed to load awards:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await apiRequest<{ history: any[] }>('/stats/monthly-history');
      setHistoryData(res.history);
    } catch (err) {
      console.error('Failed to load history:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-zinc-900/80 rounded-3xl p-6 border border-zinc-800/80 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-zinc-100 tracking-tight">Monthly Awards & Champions</h2>
            <p className="text-xs text-zinc-400">
              Automatically calculated league honors and historical champions archive
            </p>
          </div>
        </div>

        <div>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-bold text-zinc-100 focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-zinc-500 space-y-2">
          <div className="inline-block w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-2"></div>
          <p className="text-xs font-bold text-zinc-400">Calculating monthly honors...</p>
        </div>
      ) : !awardsData ? (
        <div className="py-12 text-center text-zinc-500 bg-zinc-900/80 rounded-3xl border border-zinc-800/80 shadow-xl">
          <Trophy className="w-12 h-12 mx-auto text-zinc-700 mb-2" />
          <p className="text-sm font-bold text-zinc-400">No matches or awards calculated for {selectedMonth}.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Champion */}
          <div className="bg-gradient-to-tr from-amber-500 via-amber-600 to-orange-600 text-zinc-950 rounded-3xl p-6 shadow-2xl relative overflow-hidden space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider bg-zinc-950/20 text-zinc-950 px-3 py-1 rounded-full border border-zinc-950/10">
                🏆 Monthly Champion
              </span>
              <Trophy className="w-8 h-8 text-zinc-950/80" />
            </div>

            {awardsData.champions?.map((c: any) => (
              <div key={c.player_id} className="pt-2">
                <h3 className="text-2xl font-black tracking-tight text-zinc-950">{c.full_name}</h3>
                <p className="text-xs text-zinc-900 mt-1 font-bold">
                  Avg Score: <span className="font-black text-zinc-950 text-base">{c.average_score.toFixed(2)} pts</span> ({c.total_matches} matches)
                </p>
              </div>
            ))}
          </div>

          {/* Most Wins */}
          <div className="bg-zinc-900/80 rounded-3xl p-6 border border-zinc-800/80 shadow-xl space-y-3">
            <div className="flex items-center justify-between text-orange-400">
              <span className="text-xs font-bold uppercase tracking-wider">🥇 Most Wins</span>
              <Flame className="w-6 h-6" />
            </div>
            {awardsData.mostWins && (
              <div>
                <h3 className="text-xl font-bold text-zinc-100">{awardsData.mostWins.full_name}</h3>
                <p className="text-xs font-bold text-orange-400 mt-1">
                  {awardsData.mostWins.wins_1st} First-Place Victories ({awardsData.mostWins.win_pct}% win rate)
                </p>
              </div>
            )}
          </div>

          {/* Best Win Rate */}
          <div className="bg-zinc-900/80 rounded-3xl p-6 border border-zinc-800/80 shadow-xl space-y-3">
            <div className="flex items-center justify-between text-emerald-400">
              <span className="text-xs font-bold uppercase tracking-wider">⚡ Best Win Rate</span>
              <TrendingUp className="w-6 h-6" />
            </div>
            {awardsData.bestWinRate && (
              <div>
                <h3 className="text-xl font-bold text-zinc-100">{awardsData.bestWinRate.full_name}</h3>
                <p className="text-xs font-bold text-emerald-400 mt-1">
                  {awardsData.bestWinRate.win_pct}% Win Rate ({awardsData.bestWinRate.wins_1st} / {awardsData.bestWinRate.total_matches} games)
                </p>
              </div>
            )}
          </div>

          {/* Most Active */}
          <div className="bg-zinc-900/80 rounded-3xl p-6 border border-zinc-800/80 shadow-xl space-y-3">
            <div className="flex items-center justify-between text-blue-400">
              <span className="text-xs font-bold uppercase tracking-wider">🏃 Most Active</span>
              <Calendar className="w-6 h-6" />
            </div>
            {awardsData.mostActive && (
              <div>
                <h3 className="text-xl font-bold text-zinc-100">{awardsData.mostActive.full_name}</h3>
                <p className="text-xs font-bold text-blue-400 mt-1">
                  {awardsData.mostActive.total_matches} Total Matches Played
                </p>
              </div>
            )}
          </div>

          {/* Most Improved */}
          <div className="bg-zinc-900/80 rounded-3xl p-6 border border-zinc-800/80 shadow-xl space-y-3">
            <div className="flex items-center justify-between text-indigo-400">
              <span className="text-xs font-bold uppercase tracking-wider">📈 Most Improved</span>
              <TrendingUp className="w-6 h-6" />
            </div>
            {awardsData.mostImproved ? (
              <div>
                <h3 className="text-xl font-bold text-zinc-100">{awardsData.mostImproved.player.full_name}</h3>
                <p className="text-xs font-bold text-indigo-400 mt-1">
                  +{awardsData.mostImproved.improvement} pts increase (from {awardsData.mostImproved.prevAverage} to {awardsData.mostImproved.currAverage})
                </p>
              </div>
            ) : (
              <p className="text-xs text-zinc-500 font-medium">Requires match data in consecutive months.</p>
            )}
          </div>

          {/* Most Consistent */}
          <div className="bg-zinc-900/80 rounded-3xl p-6 border border-zinc-800/80 shadow-xl space-y-3">
            <div className="flex items-center justify-between text-amber-400">
              <span className="text-xs font-bold uppercase tracking-wider">🎯 Most Consistent</span>
              <Target className="w-6 h-6" />
            </div>
            {awardsData.mostConsistent ? (
              <div>
                <h3 className="text-xl font-bold text-zinc-100">{awardsData.mostConsistent.player.full_name}</h3>
                <p className="text-xs font-bold text-amber-400 mt-1">
                  Std Dev: {awardsData.mostConsistent.stdDev} pts (Lowest variance in score per match)
                </p>
              </div>
            ) : (
              <p className="text-xs text-zinc-500 font-medium">Requires qualified matches in this month.</p>
            )}
          </div>
        </div>
      )}

      {/* Historical Champions Archive */}
      <div className="bg-zinc-900/80 rounded-3xl p-6 border border-zinc-800/80 shadow-xl space-y-4">
        <h3 className="text-base font-black text-zinc-100 tracking-tight">Historical Champions Archive</h3>

        {historyData.length === 0 ? (
          <p className="text-xs text-zinc-500">No past months archived yet.</p>
        ) : (
          <div className="space-y-3">
            {historyData.map((h) => (
              <div
                key={h.month}
                onClick={() => setSelectedMonth(h.month)}
                className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 flex items-center justify-between cursor-pointer hover:border-amber-500/40 transition-all"
              >
                <div>
                  <span className="font-mono font-extrabold text-sm text-zinc-100">{h.month}</span>
                  <div className="text-xs text-zinc-400 mt-0.5">
                    Total Matches: <strong className="text-zinc-200">{h.totalMatches}</strong>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-bold text-amber-400">
                    🏆 {h.champions.map((c: any) => c.full_name).join(' & ') || 'No Champion'}
                  </div>
                  {h.champions[0] && (
                    <div className="text-[11px] text-zinc-500 font-medium">
                      Avg Score: {h.champions[0].average_score.toFixed(2)} pts
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
