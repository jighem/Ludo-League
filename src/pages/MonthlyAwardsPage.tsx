import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api/client';
import { useLeague } from '../context/LeagueContext';
import { Award, Trophy, Flame, TrendingUp, Target, Calendar, ChevronRight, Crown, Swords, Crosshair, Skull, ShieldCheck, Zap } from 'lucide-react';

export const MonthlyAwardsPage: React.FC<{ onSelectPlayer?: (playerId: number) => void }> = ({ onSelectPlayer }) => {
  const { activeLeague, activeLeagueId, dataVersion } = useLeague();
  const now = new Date();
  const currentMonthStr = now.toISOString().split('T')[0].substring(0, 7);

  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [awardsData, setAwardsData] = useState<any>(null);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAwards();
    fetchHistory();
  }, [selectedMonth, activeLeagueId, dataVersion]);

  const fetchAwards = async () => {
    try {
      setLoading(true);
      const res = await apiRequest(`/stats/monthly-awards?month=${selectedMonth}&leagueId=${activeLeagueId || 1}`);
      setAwardsData(res.awards);
    } catch (err) {
      console.error('Failed to load awards:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await apiRequest<{ history: any[] }>(`/stats/monthly-history?leagueId=${activeLeagueId || 1}`);
      setHistoryData(res.history);
    } catch (err) {
      console.error('Failed to load history:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-zinc-900/80 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800/80 shadow-md dark:shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">Monthly Awards & Honors</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Automatically calculated prestige honors, combat records, and historical champions archive
            </p>
          </div>
        </div>

        <div>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3.5 py-2 bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-amber-500 cursor-pointer"
          />
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-zinc-500 space-y-2">
          <div className="inline-block w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-2"></div>
          <p className="text-xs font-bold text-zinc-600 dark:text-zinc-400">Calculating monthly honors & combat stats...</p>
        </div>
      ) : !awardsData ? (
        <div className="py-12 text-center text-zinc-500 bg-white dark:bg-zinc-900/80 rounded-3xl border border-zinc-200 dark:border-zinc-800/80 shadow-md">
          <Trophy className="w-12 h-12 mx-auto text-zinc-400 dark:text-zinc-700 mb-2" />
          <p className="text-sm font-bold text-zinc-700 dark:text-zinc-400">No matches or awards calculated for {selectedMonth}.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* 1. Champion */}
          <div className="bg-gradient-to-tr from-amber-500 via-amber-600 to-orange-600 text-zinc-950 rounded-3xl p-6 shadow-xl relative overflow-hidden space-y-3 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider bg-zinc-950/20 text-zinc-950 px-3 py-1 rounded-full border border-zinc-950/10 flex items-center space-x-1">
                <span>🏆</span>
                <span>Overall Champion</span>
              </span>
              <Trophy className="w-8 h-8 text-zinc-950/80" />
            </div>

            {awardsData.champions && awardsData.champions.length > 0 ? (
              awardsData.champions.map((c: any) => (
                <div
                  key={c.player_id}
                  onClick={() => onSelectPlayer && onSelectPlayer(c.player_id)}
                  className="pt-2 cursor-pointer hover:opacity-95 transition-opacity"
                >
                  <h3 className="text-2xl font-black tracking-tight text-zinc-950">{c.full_name}</h3>
                  <p className="text-xs text-zinc-900 mt-1 font-bold">
                    Avg Score: <span className="font-black text-zinc-950 text-base">{c.average_score.toFixed(2)} pts</span> ({c.total_matches} matches)
                  </p>
                  <div className="text-[11px] text-zinc-900/80 mt-1 font-semibold flex items-center space-x-2">
                    <span>🥇 {c.wins_1st} wins</span>
                    <span>•</span>
                    <span>⚔️ {c.total_kills || 0} kills</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-zinc-900 font-bold pt-2">No qualified champion yet this month.</p>
            )}
          </div>

          {/* 2. Killer of the Month (Apex Predator) */}
          <div className="bg-gradient-to-tr from-rose-950/40 via-zinc-900 to-zinc-900 rounded-3xl p-6 border border-rose-500/30 dark:border-rose-500/30 shadow-xl space-y-3 relative overflow-hidden">
            <div className="flex items-center justify-between text-rose-400">
              <span className="text-xs font-black uppercase tracking-wider bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20 flex items-center space-x-1.5">
                <Swords className="w-3.5 h-3.5" />
                <span>Killer of the Month</span>
              </span>
              <Crosshair className="w-7 h-7 text-rose-500/80" />
            </div>
            {awardsData.killerOfTheMonth ? (
              <div
                onClick={() => onSelectPlayer && onSelectPlayer(awardsData.killerOfTheMonth.player_id)}
                className="cursor-pointer group"
              >
                <h3 className="text-xl font-black text-zinc-100 group-hover:text-rose-400 transition-colors">
                  {awardsData.killerOfTheMonth.full_name}
                </h3>
                <p className="text-xs font-bold text-rose-400 mt-1 flex items-center space-x-2">
                  <span className="text-base font-black">⚔️ {awardsData.killerOfTheMonth.total_kills} Knockouts</span>
                  <span className="text-zinc-400 text-[11px]">• 💀 {awardsData.killerOfTheMonth.total_deaths} Deaths</span>
                </p>
                <div className="text-[11px] text-zinc-400 mt-1 font-medium">
                  Combat Efficiency: +{(awardsData.killerOfTheMonth.total_kills * 5)} Combat Pts ({awardsData.killerOfTheMonth.total_matches} games)
                </div>
              </div>
            ) : (
              <p className="text-xs text-zinc-500 font-medium">No combat kills recorded this month.</p>
            )}
          </div>

          {/* 3. Top Single-Match Kill Record */}
          <div className="bg-white dark:bg-zinc-900/80 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800/80 shadow-xl space-y-3">
            <div className="flex items-center justify-between text-rose-500 dark:text-rose-400">
              <span className="text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5">
                <Skull className="w-4 h-4" />
                <span>Single-Match Bloodbath</span>
              </span>
              <Zap className="w-5 h-5 text-amber-500" />
            </div>
            {awardsData.topSingleMatchKill ? (
              <div
                onClick={() => onSelectPlayer && onSelectPlayer(awardsData.topSingleMatchKill.player_id)}
                className="cursor-pointer group"
              >
                <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-rose-500 transition-colors">
                  {awardsData.topSingleMatchKill.full_name}
                </h3>
                <p className="text-xs font-bold text-rose-600 dark:text-rose-400 mt-1">
                  🔥 {awardsData.topSingleMatchKill.kills} Pawn Kills in a Single Game!
                </p>
                <div className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 font-mono">
                  Match {awardsData.topSingleMatchKill.friendly_id} ({awardsData.topSingleMatchKill.match_date})
                </div>
              </div>
            ) : (
              <p className="text-xs text-zinc-500 font-medium">No single-match records set.</p>
            )}
          </div>

          {/* 4. Most Wins */}
          <div className="bg-white dark:bg-zinc-900/80 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800/80 shadow-xl space-y-3">
            <div className="flex items-center justify-between text-orange-600 dark:text-orange-400">
              <span className="text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5">
                <span>🥇</span>
                <span>Most Wins of the Month</span>
              </span>
              <Flame className="w-6 h-6" />
            </div>
            {awardsData.mostWins ? (
              <div
                onClick={() => onSelectPlayer && onSelectPlayer(awardsData.mostWins.player_id)}
                className="cursor-pointer group"
              >
                <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-orange-500 transition-colors">
                  {awardsData.mostWins.full_name}
                </h3>
                <p className="text-xs font-bold text-orange-600 dark:text-orange-400 mt-1">
                  {awardsData.mostWins.wins_1st} First-Place Victories ({awardsData.mostWins.win_pct}% win rate)
                </p>
                <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                  Out of {awardsData.mostWins.total_matches} total matches played
                </div>
              </div>
            ) : (
              <p className="text-xs text-zinc-500 font-medium">No victories recorded.</p>
            )}
          </div>

          {/* 5. Best Podium Rate */}
          <div className="bg-white dark:bg-zinc-900/80 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800/80 shadow-xl space-y-3">
            <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
              <span className="text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5">
                <span>🥉</span>
                <span>Best Podium Rate</span>
              </span>
              <Award className="w-6 h-6" />
            </div>
            {awardsData.bestPodiumRate ? (
              <div
                onClick={() => onSelectPlayer && onSelectPlayer(awardsData.bestPodiumRate.player_id)}
                className="cursor-pointer group"
              >
                <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-amber-500 transition-colors">
                  {awardsData.bestPodiumRate.full_name}
                </h3>
                <p className="text-xs font-bold text-amber-600 dark:text-amber-400 mt-1">
                  {awardsData.bestPodiumRate.podium_pct}% Top-3 Finish Rate ({awardsData.bestPodiumRate.podium_finishes} podiums)
                </p>
                <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                  Reliable medal placement across {awardsData.bestPodiumRate.total_matches} matches
                </div>
              </div>
            ) : (
              <p className="text-xs text-zinc-500 font-medium">No podium finishers yet.</p>
            )}
          </div>

          {/* 6. Iron Wall / Survivor */}
          <div className="bg-white dark:bg-zinc-900/80 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800/80 shadow-xl space-y-3">
            <div className="flex items-center justify-between text-cyan-600 dark:text-cyan-400">
              <span className="text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5">
                <ShieldCheck className="w-4 h-4" />
                <span>Iron Wall (Survivor)</span>
              </span>
              <ShieldCheck className="w-6 h-6 text-cyan-500/80" />
            </div>
            {awardsData.survivor ? (
              <div
                onClick={() => onSelectPlayer && onSelectPlayer(awardsData.survivor.player_id)}
                className="cursor-pointer group"
              >
                <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-cyan-500 transition-colors">
                  {awardsData.survivor.full_name}
                </h3>
                <p className="text-xs font-bold text-cyan-600 dark:text-cyan-400 mt-1">
                  ⚔️ {awardsData.survivor.total_kills} Kills vs 💀 {awardsData.survivor.total_deaths} Deaths
                </p>
                <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                  Top survival ratio across {awardsData.survivor.total_matches} battles
                </div>
              </div>
            ) : (
              <p className="text-xs text-zinc-500 font-medium">Requires combat matches to calculate.</p>
            )}
          </div>

          {/* 7. Best Win Rate */}
          <div className="bg-white dark:bg-zinc-900/80 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800/80 shadow-xl space-y-3">
            <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
              <span className="text-xs font-bold uppercase tracking-wider">⚡ Best Win Rate</span>
              <TrendingUp className="w-6 h-6" />
            </div>
            {awardsData.bestWinRate && (
              <div
                onClick={() => onSelectPlayer && onSelectPlayer(awardsData.bestWinRate.player_id)}
                className="cursor-pointer group"
              >
                <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-emerald-500 transition-colors">
                  {awardsData.bestWinRate.full_name}
                </h3>
                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                  {awardsData.bestWinRate.win_pct}% Win Rate ({awardsData.bestWinRate.wins_1st} / {awardsData.bestWinRate.total_matches} games)
                </p>
              </div>
            )}
          </div>

          {/* 8. Total Points Leader */}
          <div className="bg-white dark:bg-zinc-900/80 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800/80 shadow-xl space-y-3">
            <div className="flex items-center justify-between text-purple-600 dark:text-purple-400">
              <span className="text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5">
                <Crown className="w-4 h-4" />
                <span>Points Dominator</span>
              </span>
              <Crown className="w-6 h-6" />
            </div>
            {awardsData.pointsLeader && (
              <div
                onClick={() => onSelectPlayer && onSelectPlayer(awardsData.pointsLeader.player_id)}
                className="cursor-pointer group"
              >
                <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-purple-500 transition-colors">
                  {awardsData.pointsLeader.full_name}
                </h3>
                <p className="text-xs font-bold text-purple-600 dark:text-purple-400 mt-1">
                  {awardsData.pointsLeader.total_points.toFixed(1)} Total League Points
                </p>
                <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                  Avg: {awardsData.pointsLeader.average_score.toFixed(2)} pts/match
                </div>
              </div>
            )}
          </div>

          {/* 9. Most Active Grinder */}
          <div className="bg-white dark:bg-zinc-900/80 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800/80 shadow-xl space-y-3">
            <div className="flex items-center justify-between text-blue-600 dark:text-blue-400">
              <span className="text-xs font-bold uppercase tracking-wider">🏃 Most Active Grinder</span>
              <Calendar className="w-6 h-6" />
            </div>
            {awardsData.mostActive && (
              <div
                onClick={() => onSelectPlayer && onSelectPlayer(awardsData.mostActive.player_id)}
                className="cursor-pointer group"
              >
                <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-blue-500 transition-colors">
                  {awardsData.mostActive.full_name}
                </h3>
                <p className="text-xs font-bold text-blue-600 dark:text-blue-400 mt-1">
                  {awardsData.mostActive.total_matches} Total Matches Played
                </p>
              </div>
            )}
          </div>

          {/* 10. Most Improved */}
          <div className="bg-white dark:bg-zinc-900/80 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800/80 shadow-xl space-y-3">
            <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400">
              <span className="text-xs font-bold uppercase tracking-wider">📈 Most Improved</span>
              <TrendingUp className="w-6 h-6" />
            </div>
            {awardsData.mostImproved ? (
              <div
                onClick={() => onSelectPlayer && onSelectPlayer(awardsData.mostImproved.player.player_id)}
                className="cursor-pointer group"
              >
                <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-500 transition-colors">
                  {awardsData.mostImproved.player.full_name}
                </h3>
                <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                  +{awardsData.mostImproved.improvement} pts increase (from {awardsData.mostImproved.prevAverage} to {awardsData.mostImproved.currAverage})
                </p>
              </div>
            ) : (
              <p className="text-xs text-zinc-500 font-medium">Requires match data in consecutive months.</p>
            )}
          </div>

          {/* 11. Most Consistent */}
          <div className="bg-white dark:bg-zinc-900/80 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800/80 shadow-xl space-y-3">
            <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
              <span className="text-xs font-bold uppercase tracking-wider">🎯 Most Consistent</span>
              <Target className="w-6 h-6" />
            </div>
            {awardsData.mostConsistent ? (
              <div
                onClick={() => onSelectPlayer && onSelectPlayer(awardsData.mostConsistent.player.player_id)}
                className="cursor-pointer group"
              >
                <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-amber-500 transition-colors">
                  {awardsData.mostConsistent.player.full_name}
                </h3>
                <p className="text-xs font-bold text-amber-600 dark:text-amber-400 mt-1">
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
      <div className="bg-white dark:bg-zinc-900/80 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800/80 shadow-xl space-y-4 transition-colors">
        <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100 tracking-tight">Historical Champions Archive</h3>

        {historyData.length === 0 ? (
          <p className="text-xs text-zinc-500">No past months archived yet.</p>
        ) : (
          <div className="space-y-3">
            {historyData.map((h) => (
              <div
                key={h.month}
                onClick={() => setSelectedMonth(h.month)}
                className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between cursor-pointer hover:border-amber-500/40 transition-all"
              >
                <div>
                  <span className="font-mono font-extrabold text-sm text-zinc-900 dark:text-zinc-100">{h.month}</span>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Total Matches: <strong className="text-zinc-800 dark:text-zinc-200">{h.totalMatches}</strong>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-bold text-amber-600 dark:text-amber-400">
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
