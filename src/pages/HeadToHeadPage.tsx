import React, { useState, useEffect } from 'react';
import { Player } from '../types';
import { apiRequest } from '../api/client';
import { formatDateStr } from '../utils/date';
import { useLeague } from '../context/LeagueContext';
import { Swords, Users, Trophy, ChevronRight, BarChart2 } from 'lucide-react';

export const HeadToHeadPage: React.FC = () => {
  const { dataVersion } = useLeague();
  const [mode, setMode] = useState<'h2h' | 'multi'>('h2h');
  const [players, setPlayers] = useState<Player[]>([]);

  // H2H state
  const [p1Id, setP1Id] = useState<string>('');
  const [p2Id, setP2Id] = useState<string>('');
  const [h2hData, setH2hData] = useState<any>(null);
  const [h2hLoading, setH2hLoading] = useState(false);

  // Multi-player state
  const [selectedMultiIds, setSelectedMultiIds] = useState<number[]>([]);
  const [multiData, setMultiData] = useState<any[]>([]);
  const [multiLoading, setMultiLoading] = useState(false);

  useEffect(() => {
    fetchPlayers();
  }, [dataVersion]);

  const fetchPlayers = async () => {
    try {
      const res = await apiRequest<{ players: Player[] }>('/players?status=active');
      setPlayers(res.players);
      if (res.players.length >= 2) {
        setP1Id(String(res.players[0].id));
        setP2Id(String(res.players[1].id));
        setSelectedMultiIds(res.players.slice(0, 4).map((p) => p.id));
      }
    } catch (err) {
      console.error('Failed to load players for comparison:', err);
    }
  };

  useEffect(() => {
    if (mode === 'h2h' && p1Id && p2Id && p1Id !== p2Id) {
      fetchH2H();
    }
  }, [p1Id, p2Id, mode]);

  useEffect(() => {
    if (mode === 'multi' && selectedMultiIds.length > 0) {
      fetchMulti();
    }
  }, [selectedMultiIds, mode]);

  const fetchH2H = async () => {
    try {
      setH2hLoading(true);
      const res = await apiRequest(`/stats/head-to-head?player1Id=${p1Id}&player2Id=${p2Id}`);
      setH2hData(res);
    } catch (err) {
      console.error('Failed to load head-to-head stats:', err);
    } finally {
      setH2hLoading(false);
    }
  };

  const fetchMulti = async () => {
    try {
      setMultiLoading(true);
      const idsStr = selectedMultiIds.join(',');
      const res = await apiRequest<{ comparison: any[] }>(`/stats/multi-player?playerIds=${idsStr}`);
      setMultiData(res.comparison);
    } catch (err) {
      console.error('Failed to load multi-player comparison:', err);
    } finally {
      setMultiLoading(false);
    }
  };

  const toggleMultiPlayer = (id: number) => {
    if (selectedMultiIds.includes(id)) {
      if (selectedMultiIds.length > 1) {
        setSelectedMultiIds(selectedMultiIds.filter((x) => x !== id));
      }
    } else {
      if (selectedMultiIds.length < 4) {
        setSelectedMultiIds([...selectedMultiIds, id]);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-zinc-900/80 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800/80 shadow-md dark:shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Swords className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">Rivalry & Comparisons</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Analyze head-to-head records when players play in the same game
            </p>
          </div>
        </div>

        {/* Mode Switcher */}
        <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl border border-zinc-200 dark:border-zinc-700/50">
          <button
            onClick={() => setMode('h2h')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              mode === 'h2h' ? 'bg-amber-500 text-zinc-950 shadow-md font-extrabold' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            Head-to-Head (1v1)
          </button>
          <button
            onClick={() => setMode('multi')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              mode === 'multi' ? 'bg-amber-500 text-zinc-950 shadow-md font-extrabold' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            Multi-Player (Up to 4)
          </button>
        </div>
      </div>

      {mode === 'h2h' ? (
        <div className="space-y-6">
          {/* Player Selectors */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Player 1</label>
              <select
                value={p1Id}
                onChange={(e) => setP1Id(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white text-xs"
              >
                {players.map((p) => (
                  <option key={p.id} value={p.id} disabled={String(p.id) === p2Id}>
                    {p.full_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Player 2</label>
              <select
                value={p2Id}
                onChange={(e) => setP2Id(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white text-xs"
              >
                {players.map((p) => (
                  <option key={p.id} value={p.id} disabled={String(p.id) === p1Id}>
                    {p.full_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* H2H Results Display */}
          {h2hLoading ? (
            <div className="py-12 text-center text-slate-400">
              <div className="inline-block w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-2"></div>
              <p className="text-xs font-semibold">Comparing head-to-head record...</p>
            </div>
          ) : !h2hData ? null : (
            <div className="space-y-6">
              {/* Rivalry Scoreboard Card */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
                <div className="grid grid-cols-3 gap-4 items-center text-center">
                  {/* Player 1 */}
                  <div>
                    <div className="w-16 h-16 rounded-3xl bg-amber-500/10 text-amber-600 dark:text-amber-400 font-black text-2xl flex items-center justify-center mx-auto mb-2">
                      {h2hData.player1.full_name.charAt(0)}
                    </div>
                    <h3 className="font-extrabold text-base text-slate-900 dark:text-white">{h2hData.player1.full_name}</h3>
                  </div>

                  {/* Shared Matches Score */}
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Games Together</span>
                    <div className="text-3xl font-black text-amber-600 dark:text-amber-400">
                      {h2hData.headToHead.matchesTogether}
                    </div>
                    <div className="text-xs font-bold text-slate-500">
                      Ahead: {h2hData.headToHead.player1AheadCount} vs {h2hData.headToHead.player2AheadCount}
                    </div>
                  </div>

                  {/* Player 2 */}
                  <div>
                    <div className="w-16 h-16 rounded-3xl bg-orange-500/10 text-orange-600 dark:text-orange-400 font-black text-2xl flex items-center justify-center mx-auto mb-2">
                      {h2hData.player2.full_name.charAt(0)}
                    </div>
                    <h3 className="font-extrabold text-base text-slate-900 dark:text-white">{h2hData.player2.full_name}</h3>
                  </div>
                </div>

                {/* Comparative Metrics Table */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl text-center">
                    <div className="text-[10px] text-slate-400 uppercase font-bold">1st Place Wins</div>
                    <div className="font-black text-base mt-1">
                      {h2hData.headToHead.player1WinsCount} vs {h2hData.headToHead.player2WinsCount}
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl text-center">
                    <div className="text-[10px] text-slate-400 uppercase font-bold">Average Score</div>
                    <div className="font-black text-base text-amber-600 dark:text-amber-400 mt-1">
                      {h2hData.headToHead.player1AvgScore} vs {h2hData.headToHead.player2AvgScore}
                    </div>
                  </div>

                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-center">
                    <div className="text-[10px] text-rose-400 uppercase font-bold">Combat Kills ⚔️</div>
                    <div className="font-black text-base text-rose-400 mt-1">
                      {h2hData.headToHead.player1TotalKills || 0} vs {h2hData.headToHead.player2TotalKills || 0}
                    </div>
                    <div className="text-[9px] text-zinc-500 mt-0.5">
                      Deaths: {h2hData.headToHead.player1TotalDeaths || 0} vs {h2hData.headToHead.player2TotalDeaths || 0}
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl text-center">
                    <div className="text-[10px] text-slate-400 uppercase font-bold">Average Position</div>
                    <div className="font-black text-base mt-1">
                      {h2hData.headToHead.player1AvgPosition} vs {h2hData.headToHead.player2AvgPosition}
                    </div>
                  </div>
                </div>
              </div>

              {/* Shared Matches History Table */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">Recent Shared Matches & Combat Stats</h4>

                {h2hData.headToHead.latestEncounters.length === 0 ? (
                  <p className="text-xs text-slate-400">These two players have not participated in a match together yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-extrabold uppercase text-[10px]">
                          <th className="py-2.5 px-3">Match</th>
                          <th className="py-2.5 px-3">Date</th>
                          <th className="py-2.5 px-3 text-center">{h2hData.player1.full_name}</th>
                          <th className="py-2.5 px-3 text-center">{h2hData.player2.full_name}</th>
                          <th className="py-2.5 px-3 text-center">Outcome</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                        {h2hData.headToHead.latestEncounters.map((enc: any) => {
                          const p1Pos = Number(enc.p1_pos);
                          const p2Pos = Number(enc.p2_pos);
                          const winner = p1Pos < p2Pos ? h2hData.player1.full_name : h2hData.player2.full_name;

                          return (
                            <tr key={enc.id}>
                              <td className="py-3 px-3 font-mono font-bold text-amber-600">{enc.friendly_id}</td>
                              <td className="py-3 px-3 text-slate-500">{formatDateStr(enc.match_date)}</td>
                              <td className="py-3 px-3 text-center">
                                <div className="font-bold">
                                  {p1Pos === 1 ? '🥇 1st' : p1Pos === 2 ? '🥈 2nd' : p1Pos === 3 ? '🥉 3rd' : '4th'} (+{enc.p1_pts} pts)
                                </div>
                                <div className="text-[10px] text-zinc-400 font-bold mt-0.5">
                                  <span className="text-rose-400">⚔️ {enc.p1_kills || 0}</span> / <span>💀 {enc.p1_deaths || 0}</span>
                                </div>
                              </td>
                              <td className="py-3 px-3 text-center">
                                <div className="font-bold">
                                  {p2Pos === 1 ? '🥇 1st' : p2Pos === 2 ? '🥈 2nd' : p2Pos === 3 ? '🥉 3rd' : '4th'} (+{enc.p2_pts} pts)
                                </div>
                                <div className="text-[10px] text-zinc-400 font-bold mt-0.5">
                                  <span className="text-rose-400">⚔️ {enc.p2_kills || 0}</span> / <span>💀 {enc.p2_deaths || 0}</span>
                                </div>
                              </td>
                              <td className="py-3 px-3 text-center font-black text-amber-600 dark:text-amber-400">
                                {winner} Ahead
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Multi-Player Comparison View */
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
            <label className="block text-[10px] font-bold uppercase text-slate-400">Select Up to 4 Players to Compare</label>
            <div className="flex flex-wrap gap-2">
              {players.map((p) => {
                const isSelected = selectedMultiIds.includes(p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => toggleMultiPlayer(p.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {p.full_name} {isSelected ? '✓' : ''}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Comparison Cards Grid */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs">
            <h3 className="text-base font-black text-slate-900 dark:text-white mb-4">Multi-Player Breakdown & Combat Metrics</h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-extrabold uppercase text-[10px]">
                    <th className="py-3 px-4">Player</th>
                    <th className="py-3 px-4 text-center">Matches</th>
                    <th className="py-3 px-4 text-center">Wins</th>
                    <th className="py-3 px-4 text-center">Win %</th>
                    <th className="py-3 px-4 text-center">Combat (K/D)</th>
                    <th className="py-3 px-4 text-right">Net Combat</th>
                    <th className="py-3 px-4 text-right">Total Points</th>
                    <th className="py-3 px-4 text-right">Avg Score</th>
                    <th className="py-3 px-4 text-center">Avg Finish</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {multiData.map((item) => (
                    <tr key={item.player.id}>
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">{item.player.full_name}</td>
                      <td className="py-3.5 px-4 text-center font-bold">{item.total_matches}</td>
                      <td className="py-3.5 px-4 text-center font-bold text-emerald-600">{item.wins}</td>
                      <td className="py-3.5 px-4 text-center font-bold">{item.win_pct}%</td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-bold text-rose-500">⚔️ {item.total_kills || 0}</span>
                        <span className="text-zinc-400 mx-1">/</span>
                        <span className="font-bold text-zinc-500">💀 {item.total_deaths || 0}</span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold">
                        <span className={(item.net_combat_points || 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'}>
                          {(item.net_combat_points || 0) >= 0 ? `+${item.net_combat_points || 0}` : item.net_combat_points} pts
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold">{item.total_points.toFixed(2)}</td>
                      <td className="py-3.5 px-4 text-right font-black text-amber-600 dark:text-amber-400 text-sm">{item.average_score.toFixed(2)}</td>
                      <td className="py-3.5 px-4 text-center font-bold">{item.average_position.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
