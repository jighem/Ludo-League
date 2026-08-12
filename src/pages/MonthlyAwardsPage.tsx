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
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Monthly Awards & Champions</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Automatically calculated league honors and historical champions archive
            </p>
          </div>
        </div>

        <div>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
          />
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-400">
          <div className="inline-block w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-2"></div>
          <p className="text-xs font-semibold">Calculating monthly honors...</p>
        </div>
      ) : !awardsData ? (
        <div className="py-12 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
          <Trophy className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
          <p className="text-sm font-bold">No matches or awards calculated for {selectedMonth}.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Champion */}
          <div className="bg-gradient-to-tr from-amber-500 to-orange-600 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider bg-white/20 px-2.5 py-1 rounded-full">
                🏆 Monthly Champion
              </span>
              <Trophy className="w-8 h-8 text-amber-200" />
            </div>

            {awardsData.champions?.map((c: any) => (
              <div key={c.player_id} className="pt-2">
                <h3 className="text-2xl font-black tracking-tight">{c.full_name}</h3>
                <p className="text-xs text-amber-100 mt-1 font-semibold">
                  Avg Score: <span className="font-black text-white text-base">{c.average_score.toFixed(2)} pts</span> ({c.total_matches} matches)
                </p>
              </div>
            ))}
          </div>

          {/* Most Wins */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between text-orange-500">
              <span className="text-xs font-bold uppercase tracking-wider">🥇 Most Wins</span>
              <Flame className="w-6 h-6" />
            </div>
            {awardsData.mostWins && (
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">{awardsData.mostWins.full_name}</h3>
                <p className="text-xs font-bold text-orange-500 mt-1">
                  {awardsData.mostWins.wins_1st} First-Place Victories ({awardsData.mostWins.win_pct}% win rate)
                </p>
              </div>
            )}
          </div>

          {/* Best Win Rate */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between text-emerald-500">
              <span className="text-xs font-bold uppercase tracking-wider">⚡ Best Win Rate</span>
              <TrendingUp className="w-6 h-6" />
            </div>
            {awardsData.bestWinRate && (
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">{awardsData.bestWinRate.full_name}</h3>
                <p className="text-xs font-bold text-emerald-500 mt-1">
                  {awardsData.bestWinRate.win_pct}% Win Rate ({awardsData.bestWinRate.wins_1st} / {awardsData.bestWinRate.total_matches} games)
                </p>
              </div>
            )}
          </div>

          {/* Most Active */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between text-blue-500">
              <span className="text-xs font-bold uppercase tracking-wider">🏃 Most Active</span>
              <Calendar className="w-6 h-6" />
            </div>
            {awardsData.mostActive && (
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">{awardsData.mostActive.full_name}</h3>
                <p className="text-xs font-bold text-blue-500 mt-1">
                  {awardsData.mostActive.total_matches} Total Matches Played
                </p>
              </div>
            )}
          </div>

          {/* Most Improved */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between text-indigo-500">
              <span className="text-xs font-bold uppercase tracking-wider">📈 Most Improved</span>
              <TrendingUp className="w-6 h-6" />
            </div>
            {awardsData.mostImproved ? (
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">{awardsData.mostImproved.player.full_name}</h3>
                <p className="text-xs font-bold text-indigo-500 mt-1">
                  +{awardsData.mostImproved.improvement} pts increase (from {awardsData.mostImproved.prevAverage} to {awardsData.mostImproved.currAverage})
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-400">Requires sufficient match data in consecutive months.</p>
            )}
          </div>

          {/* Most Consistent */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between text-amber-500">
              <span className="text-xs font-bold uppercase tracking-wider">🎯 Most Consistent</span>
              <Target className="w-6 h-6" />
            </div>
            {awardsData.mostConsistent ? (
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">{awardsData.mostConsistent.player.full_name}</h3>
                <p className="text-xs font-bold text-amber-600 dark:text-amber-400 mt-1">
                  Std Dev: {awardsData.mostConsistent.stdDev} pts (Lowest variance in score per match)
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-400">Requires qualified matches in this month.</p>
            )}
          </div>
        </div>
      )}

      {/* Historical Champions Archive */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <h3 className="text-lg font-black text-slate-900 dark:text-white">Historical Champions Archive</h3>

        {historyData.length === 0 ? (
          <p className="text-xs text-slate-400">No past months archived yet.</p>
        ) : (
          <div className="space-y-3">
            {historyData.map((h) => (
              <div
                key={h.month}
                onClick={() => setSelectedMonth(h.month)}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between cursor-pointer hover:border-amber-400 transition-all"
              >
                <div>
                  <span className="font-mono font-extrabold text-sm text-slate-900 dark:text-white">{h.month}</span>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Total Matches: <strong className="text-slate-800 dark:text-slate-200">{h.totalMatches}</strong>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-bold text-amber-600 dark:text-amber-400">
                    🏆 {h.champions.map((c: any) => c.full_name).join(' & ') || 'No Champion'}
                  </div>
                  {h.champions[0] && (
                    <div className="text-[11px] text-slate-400">
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
