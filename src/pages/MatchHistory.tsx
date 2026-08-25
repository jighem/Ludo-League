import React, { useState, useEffect, useMemo } from 'react';
import { Match, Player } from '../types';
import { apiRequest } from '../api/client';
import { formatDateStr } from '../utils/date';
import { useAuth } from '../context/AuthContext';
import { useLeague } from '../context/LeagueContext';
import { EditMatchModal } from '../components/EditMatchModal';
import {
  History,
  Search,
  Filter,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Edit2,
  Lock,
  Plus,
  AlertTriangle,
  Trophy,
  Table as TableIcon,
  LayoutGrid,
  Download,
  Calculator,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Crown,
  RefreshCw
} from 'lucide-react';

interface MatchHistoryProps {
  onSelectPlayer: (playerId: number) => void;
  onOpenNewMatch: () => void;
}

export const MatchHistory: React.FC<MatchHistoryProps> = ({ onSelectPlayer, onOpenNewMatch }) => {
  const { user } = useAuth();
  const { activeLeague, activeLeagueId, dataVersion, triggerDataRefresh } = useLeague();
  const [matches, setMatches] = useState<Match[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalMatchesCount, setTotalMatchesCount] = useState(0);

  // View Mode: 'table' (default for auditing/tallying) vs 'cards'
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [showTallyMatrix, setShowTallyMatrix] = useState(true);

  // Filters
  const [filterMonth, setFilterMonth] = useState<string>('');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  const [selectedPlayerCount, setSelectedPlayerCount] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Modals
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [deletingMatchId, setDeletingMatchId] = useState<number | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState('');

  // Permission helpers
  const canEditMatch = (m: Match) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (user.role === 'operator' && m.created_by != null && Number(m.created_by) === Number(user.id)) {
      return true;
    }
    return false;
  };

  useEffect(() => {
    fetchPlayers();
  }, [dataVersion]);

  useEffect(() => {
    fetchMatches();
  }, [page, limit, filterMonth, selectedPlayerId, selectedPlayerCount, startDate, endDate, activeLeagueId, dataVersion]);

  const fetchPlayers = async () => {
    try {
      const res = await apiRequest<{ players: Player[] }>('/players');
      setPlayers(res.players);
    } catch (err) {
      // ignore
    }
  };

  const fetchMatches = async () => {
    try {
      if (matches.length === 0) setLoading(true);
      setIsRefreshing(true);
      let endpoint = `/matches?page=${page}&limit=${limit}`;
      if (activeLeagueId) endpoint += `&leagueId=${activeLeagueId}`;
      if (filterMonth) endpoint += `&month=${filterMonth}`;
      if (selectedPlayerId) endpoint += `&playerId=${selectedPlayerId}`;
      if (selectedPlayerCount) endpoint += `&playerCount=${selectedPlayerCount}`;
      if (startDate) endpoint += `&startDate=${startDate}`;
      if (endDate) endpoint += `&endDate=${endDate}`;

      const res = await apiRequest<{ matches: Match[]; pagination: { totalPages: number; total?: number } }>(endpoint);
      setMatches(res.matches || []);
      setTotalPages(res.pagination.totalPages || 1);
      setTotalMatchesCount(res.pagination.total || res.matches?.length || 0);
    } catch (err) {
      console.error('Failed to load match history:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleResetFilters = () => {
    setFilterMonth('');
    setSelectedPlayerId('');
    setSelectedPlayerCount('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const handleDeleteMatch = async () => {
    if (!deletingMatchId) return;
    try {
      setSubmitting(true);
      setActionError('');
      await apiRequest(`/matches/${deletingMatchId}`, {
        method: 'DELETE',
        body: JSON.stringify({ reason: deleteReason })
      });
      setDeletingMatchId(null);
      setDeleteReason('');
      triggerDataRefresh();
      fetchMatches();
    } catch (err: any) {
      setActionError(err.message || 'Failed to delete match.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportCSV = () => {
    let url = `/api/stats/export?type=matches&leagueId=${activeLeagueId || 1}`;
    if (filterMonth) url += `&month=${filterMonth}`;
    if (startDate) url += `&startDate=${startDate}`;
    if (endDate) url += `&endDate=${endDate}`;
    if (selectedPlayerId) url += `&playerId=${selectedPlayerId}`;
    if (selectedPlayerCount) url += `&playerCount=${selectedPlayerCount}`;
    window.open(url, '_blank');
  };

  // Compute live tally breakdown across currently loaded matches for instant verification
  const playerTallyStats = useMemo(() => {
    const tallyMap = new Map<number, {
      player_id: number;
      name: string;
      nickname: string | null;
      played: number;
      pos1: number;
      pos2: number;
      pos3: number;
      pos4: number;
      totalPoints: number;
    }>();

    // Initialize with players
    players.forEach((p) => {
      tallyMap.set(p.id, {
        player_id: p.id,
        name: p.full_name,
        nickname: p.nickname || null,
        played: 0,
        pos1: 0,
        pos2: 0,
        pos3: 0,
        pos4: 0,
        totalPoints: 0
      });
    });

    matches.forEach((m) => {
      m.results?.forEach((r) => {
        let entry = tallyMap.get(r.player_id);
        if (!entry) {
          entry = {
            player_id: r.player_id,
            name: r.player_name || `Player #${r.player_id}`,
            nickname: r.player_nickname || null,
            played: 0,
            pos1: 0,
            pos2: 0,
            pos3: 0,
            pos4: 0,
            totalPoints: 0
          };
          tallyMap.set(r.player_id, entry);
        }
        entry.played += 1;
        if (r.position === 1) entry.pos1 += 1;
        else if (r.position === 2) entry.pos2 += 1;
        else if (r.position === 3) entry.pos3 += 1;
        else if (r.position === 4) entry.pos4 += 1;
        entry.totalPoints += Number(r.points_awarded) || 0;
      });
    });

    // Only return players who have played at least 1 match in this list, sorted by total points
    return Array.from(tallyMap.values())
      .filter((t) => t.played > 0)
      .sort((a, b) => {
        const avgB = b.played > 0 ? b.totalPoints / b.played : 0;
        const avgA = a.played > 0 ? a.totalPoints / a.played : 0;
        if (avgB !== avgA) return avgB - avgA;
        return b.totalPoints - a.totalPoints;
      });
  }, [matches, players]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white dark:bg-zinc-900/80 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800/80 shadow-md dark:shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">Match Results & Tally Audit</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Detailed breakdown of every recorded match and score to tally and verify standings.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl border border-zinc-200 dark:border-zinc-700">
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-amber-500 text-zinc-950 shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
              title="Table View (Tally Sheet)"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-amber-500 text-zinc-950 shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
              title="Card Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Cards</span>
            </button>
          </div>

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold rounded-xl text-xs transition-all cursor-pointer border border-zinc-200 dark:border-zinc-700"
            title="Download CSV of current results"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            id="btn-match-history-refresh"
            onClick={() => {
              triggerDataRefresh();
              fetchMatches();
            }}
            disabled={isRefreshing}
            className="inline-flex items-center space-x-1.5 px-3 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold rounded-xl text-xs transition-all cursor-pointer border border-zinc-200 dark:border-zinc-700 disabled:opacity-50"
            title="Refresh Matches & Tally Sheet"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-amber-500' : ''}`} />
            <span className="hidden sm:inline">{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          {(user?.role === 'admin' || user?.role === 'operator') && (
            <button
              onClick={onOpenNewMatch}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-extrabold rounded-xl text-xs shadow-md shadow-amber-500/10 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Record Match</span>
            </button>
          )}
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white dark:bg-zinc-900/80 rounded-3xl p-4 border border-zinc-200 dark:border-zinc-800/80 shadow-md dark:shadow-xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs transition-colors">
        {/* Month shortcut */}
        <div>
          <label className="block text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
            Month Filter
          </label>
          <input
            type="month"
            value={filterMonth}
            onChange={(e) => {
              setFilterMonth(e.target.value);
              setStartDate('');
              setEndDate('');
              setPage(1);
            }}
            className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl font-medium text-zinc-900 dark:text-white"
          />
        </div>

        {/* Player filter */}
        <div>
          <label className="block text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
            Filter Player
          </label>
          <select
            value={selectedPlayerId}
            onChange={(e) => {
              setSelectedPlayerId(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl font-medium text-zinc-900 dark:text-white"
          >
            <option value="">All Players</option>
            {players.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name}
              </option>
            ))}
          </select>
        </div>

        {/* Game Size Filter */}
        <div>
          <label className="block text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
            Game Size
          </label>
          <select
            value={selectedPlayerCount}
            onChange={(e) => {
              setSelectedPlayerCount(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl font-medium text-zinc-900 dark:text-white"
          >
            <option value="">All Sizes (2, 3, 4)</option>
            <option value="4">4 Players (50 / 30 / 20 / 0)</option>
            <option value="3">3 Players (62.5 / 37.5 / 0)</option>
            <option value="2">2 Players (100 / 0)</option>
          </select>
        </div>

        {/* Rows Per Page */}
        <div>
          <label className="block text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
            Page Size
          </label>
          <select
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setPage(1);
            }}
            className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl font-medium text-zinc-900 dark:text-white"
          >
            <option value="15">15 matches per page</option>
            <option value="25">25 matches per page</option>
            <option value="50">50 matches per page</option>
            <option value="100">100 matches per page</option>
          </select>
        </div>

        {/* Reset Filter Button */}
        <div className="flex items-end">
          <button
            onClick={handleResetFilters}
            className="w-full py-2 px-3 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold rounded-xl border border-zinc-200 dark:border-zinc-700 flex items-center justify-center space-x-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Filters</span>
          </button>
        </div>
      </div>

      {/* Live Tally Verification Matrix Panel */}
      {playerTallyStats.length > 0 && (
        <div className="bg-white dark:bg-zinc-900/80 rounded-3xl border border-zinc-200 dark:border-zinc-800/80 shadow-md dark:shadow-xl overflow-hidden transition-colors">
          <button
            onClick={() => setShowTallyMatrix(!showTallyMatrix)}
            className="w-full px-6 py-3.5 bg-zinc-50/80 dark:bg-zinc-800/40 border-b border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between cursor-pointer hover:bg-zinc-100/80 dark:hover:bg-zinc-800/60 transition-colors"
          >
            <div className="flex items-center space-x-2 text-left">
              <Calculator className="w-4 h-4 text-amber-500" />
              <div>
                <span className="font-extrabold text-xs text-zinc-900 dark:text-zinc-100">
                  Player Tally Summary & Score Verification Matrix
                </span>
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 ml-2 font-medium">
                  (Aggregates {matches.length} matches shown below)
                </span>
              </div>
            </div>
            {showTallyMatrix ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
          </button>

          {showTallyMatrix && (
            <div className="p-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 font-extrabold uppercase tracking-wider text-[10px] bg-zinc-50 dark:bg-transparent">
                    <th className="py-2 px-3">Player</th>
                    <th className="py-2 px-3 text-center">Played</th>
                    <th className="py-2 px-3 text-center text-emerald-600 dark:text-emerald-400">🥇 1st</th>
                    <th className="py-2 px-3 text-center text-zinc-600 dark:text-zinc-400">🥈 2nd</th>
                    <th className="py-2 px-3 text-center text-amber-700 dark:text-amber-500">🥉 3rd</th>
                    <th className="py-2 px-3 text-center text-zinc-400">4️⃣ 4th</th>
                    <th className="py-2 px-3 text-right">Sum Points</th>
                    <th className="py-2 px-3 text-right text-amber-600 dark:text-amber-400 font-black">Avg Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/60 font-medium text-zinc-800 dark:text-zinc-300">
                  {playerTallyStats.map((t) => {
                    const avg = t.played > 0 ? (t.totalPoints / t.played).toFixed(2) : '0.00';
                    return (
                      <tr
                        key={t.player_id}
                        onClick={() => onSelectPlayer(t.player_id)}
                        className="hover:bg-zinc-100/70 dark:hover:bg-zinc-800/40 cursor-pointer transition-colors"
                      >
                        <td className="py-2.5 px-3">
                          <span className="font-extrabold text-zinc-900 dark:text-white hover:text-amber-500">
                            {t.name}
                          </span>
                          {t.nickname && (
                            <span className="text-[10px] text-zinc-500 ml-1.5">({t.nickname})</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold">{t.played}</td>
                        <td className="py-2.5 px-3 text-center font-bold text-emerald-600 dark:text-emerald-400">{t.pos1}</td>
                        <td className="py-2.5 px-3 text-center font-bold text-zinc-600 dark:text-zinc-400">{t.pos2}</td>
                        <td className="py-2.5 px-3 text-center font-bold text-amber-700 dark:text-amber-500">{t.pos3}</td>
                        <td className="py-2.5 px-3 text-center font-bold text-zinc-400">{t.pos4}</td>
                        <td className="py-2.5 px-3 text-right font-bold">{t.totalPoints.toFixed(2)}</td>
                        <td className="py-2.5 px-3 text-right font-black text-amber-600 dark:text-amber-400 text-sm">
                          {avg}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="mt-2 text-[11px] text-zinc-500 dark:text-zinc-400 italic">
                Formula: Avg Score = Sum Points ÷ Played. This mathematically reconciles directly with the Leaderboards.
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Matches Content (Table or Cards) */}
      {loading ? (
        <div className="py-16 text-center text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-900/80 rounded-3xl border border-zinc-200 dark:border-zinc-800/80">
          <div className="inline-block w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-2"></div>
          <p className="text-xs font-semibold">Loading match results from live database...</p>
        </div>
      ) : matches.length === 0 ? (
        <div className="py-16 text-center text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-900/80 rounded-3xl border border-zinc-200 dark:border-zinc-800/80 space-y-2">
          <History className="w-12 h-12 mx-auto text-zinc-400 dark:text-zinc-700" />
          <p className="text-base font-bold text-zinc-800 dark:text-zinc-300">No matches found in database.</p>
          <p className="text-xs text-zinc-500">Try adjusting your filters or click "Record Match" to add game results.</p>
        </div>
      ) : viewMode === 'table' ? (
        /* ======================== TABULAR VIEW (AUDIT SHEET) ======================== */
        <div className="bg-white dark:bg-zinc-900/80 rounded-3xl border border-zinc-200 dark:border-zinc-800/80 shadow-md dark:shadow-xl overflow-hidden transition-colors">
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800/80 flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-zinc-500 dark:text-zinc-400">
            <span>
              Showing {matches.length} matches (Page {page} of {totalPages})
            </span>
            <span className="text-[11px] font-medium text-zinc-400">
              Points: 4P (50/30/20/0) • 3P (62.5/37.5/0) • 2P (100/0)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 font-extrabold uppercase tracking-wider text-[10px] bg-zinc-50 dark:bg-zinc-900/40">
                  <th className="py-3 px-3.5 whitespace-nowrap">Match ID</th>
                  <th className="py-3 px-3 whitespace-nowrap">Date & Time</th>
                  <th className="py-3 px-2.5 text-center whitespace-nowrap">Format</th>
                  <th className="py-3 px-3 text-emerald-600 dark:text-emerald-400 whitespace-nowrap">🥇 1st Place (Winner)</th>
                  <th className="py-3 px-3 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">🥈 2nd Place</th>
                  <th className="py-3 px-3 text-amber-700 dark:text-amber-500 whitespace-nowrap">🥉 3rd Place</th>
                  <th className="py-3 px-3 text-zinc-400 whitespace-nowrap">4️⃣ 4th Place</th>
                  <th className="py-3 px-3 text-center whitespace-nowrap">Total Pts</th>
                  <th className="py-3 px-3 whitespace-nowrap">Notes</th>
                  {(user?.role === 'admin' || user?.role === 'operator') && (
                    <th className="py-3 px-3 text-center whitespace-nowrap">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/60 font-medium text-zinc-800 dark:text-zinc-300">
                {matches.map((m) => {
                  const p1 = m.results?.find((r) => r.position === 1);
                  const p2 = m.results?.find((r) => r.position === 2);
                  const p3 = m.results?.find((r) => r.position === 3);
                  const p4 = m.results?.find((r) => r.position === 4);
                  const matchTotal = m.results?.reduce((acc, curr) => acc + Number(curr.points_awarded), 0) || 0;
                  const isEditable = canEditMatch(m);

                  return (
                    <tr
                      key={m.id}
                      className="hover:bg-zinc-100/70 dark:hover:bg-zinc-800/40 transition-colors"
                    >
                      {/* Match Friendly ID */}
                      <td className="py-3 px-3.5 whitespace-nowrap font-mono font-black text-amber-600 dark:text-amber-400">
                        {m.friendly_id}
                      </td>

                      {/* Date & Time */}
                      <td className="py-3 px-3 whitespace-nowrap text-zinc-700 dark:text-zinc-300 font-semibold">
                        <div>{formatDateStr(m.match_date)}</div>
                        <div className="text-[10px] text-zinc-400">{m.match_time}</div>
                      </td>

                      {/* Format Badge */}
                      <td className="py-3 px-2.5 text-center whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold text-[10px] border border-zinc-200 dark:border-zinc-700">
                          {m.player_count}P
                        </span>
                      </td>

                      {/* 1st Place */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {p1 ? (
                          <div
                            onClick={() => onSelectPlayer(p1.player_id)}
                            className="cursor-pointer group flex items-center space-x-1.5"
                          >
                            <span className="font-extrabold text-zinc-900 dark:text-white group-hover:text-amber-500 transition-colors">
                              {p1.player_name}
                            </span>
                            <span className="font-black text-emerald-600 dark:text-emerald-400 text-[11px] bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-300/40 dark:border-emerald-800/40">
                              +{p1.points_awarded} pts
                            </span>
                          </div>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>

                      {/* 2nd Place */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {p2 ? (
                          <div
                            onClick={() => onSelectPlayer(p2.player_id)}
                            className="cursor-pointer group flex items-center space-x-1.5"
                          >
                            <span className="font-medium text-zinc-800 dark:text-zinc-300 group-hover:text-amber-500 transition-colors">
                              {p2.player_name}
                            </span>
                            <span className="font-bold text-zinc-600 dark:text-zinc-400 text-[11px] bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                              +{p2.points_awarded} pts
                            </span>
                          </div>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>

                      {/* 3rd Place */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {p3 ? (
                          <div
                            onClick={() => onSelectPlayer(p3.player_id)}
                            className="cursor-pointer group flex items-center space-x-1.5"
                          >
                            <span className="font-medium text-zinc-800 dark:text-zinc-300 group-hover:text-amber-500 transition-colors">
                              {p3.player_name}
                            </span>
                            <span className="font-bold text-amber-700 dark:text-amber-500 text-[11px] bg-amber-50 dark:bg-amber-950/30 px-1.5 py-0.5 rounded border border-amber-300/30 dark:border-amber-800/30">
                              +{p3.points_awarded} pts
                            </span>
                          </div>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>

                      {/* 4th Place */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {p4 ? (
                          <div
                            onClick={() => onSelectPlayer(p4.player_id)}
                            className="cursor-pointer group flex items-center space-x-1.5"
                          >
                            <span className="font-medium text-zinc-700 dark:text-zinc-400 group-hover:text-amber-500 transition-colors">
                              {p4.player_name}
                            </span>
                            <span className="font-medium text-zinc-400 text-[11px] bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                              +{p4.points_awarded} pts
                            </span>
                          </div>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>

                      {/* Total Points Check */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span className="font-mono font-bold text-[11px] text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/60 px-2 py-0.5 rounded">
                          {matchTotal.toFixed(0)} pts
                        </span>
                      </td>

                      {/* Notes / Recorder */}
                      <td className="py-3 px-3 text-zinc-500 dark:text-zinc-400 text-[11px] max-w-[160px] truncate">
                        {m.notes ? m.notes : m.created_by_name ? `By ${m.created_by_name}` : '—'}
                      </td>

                      {/* Actions */}
                      {(user?.role === 'admin' || user?.role === 'operator') && (
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center space-x-1">
                            {isEditable ? (
                              <button
                                onClick={() => setEditingMatch(m)}
                                className="p-1.5 text-zinc-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded-lg transition-colors cursor-pointer"
                                title={user?.role === 'admin' ? 'Edit Match (Admin)' : 'Edit Match (Your Recorded Entry)'}
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            ) : user?.role === 'operator' ? (
                              <span
                                className="p-1.5 text-zinc-300 dark:text-zinc-700 cursor-not-allowed"
                                title={`Recorded by ${m.created_by_name || 'another operator'} — Operators can only edit entries created by themselves`}
                              >
                                <Lock className="w-3.5 h-3.5" />
                              </span>
                            ) : null}

                            {user?.role === 'admin' && (
                              <button
                                onClick={() => setDeletingMatchId(m.id)}
                                className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer"
                                title="Delete Match (Admin Only)"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ======================== CARD VIEW ======================== */
        <div className="space-y-3">
          {matches.map((m) => {
            const isEditable = canEditMatch(m);
            return (
              <div
                key={m.id}
                className="bg-white dark:bg-zinc-900/80 rounded-3xl p-5 border border-zinc-200 dark:border-zinc-800/80 shadow-md dark:shadow-xl hover:border-amber-500/40 transition-all space-y-3"
              >
                {/* Match Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-zinc-100 dark:border-zinc-800 text-xs">
                  <div className="flex items-center space-x-3">
                    <span className="font-mono font-black text-amber-600 dark:text-amber-400 text-sm">
                      {m.friendly_id}
                    </span>
                    <span className="text-zinc-400">•</span>
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                      📅 {formatDateStr(m.match_date)} at {m.match_time}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold text-[10px]">
                      {m.player_count} Players
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    {m.created_by_name && (
                      <span className="text-[10px] text-zinc-500 dark:text-zinc-400">Recorded by {m.created_by_name}</span>
                    )}

                    {(user?.role === 'admin' || user?.role === 'operator') && (
                      <div className="flex items-center space-x-1 pl-2 border-l border-zinc-200 dark:border-zinc-800">
                        {isEditable ? (
                          <button
                            onClick={() => setEditingMatch(m)}
                            className="p-1.5 text-zinc-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded-lg transition-colors cursor-pointer"
                            title={user?.role === 'admin' ? 'Edit Match (Admin)' : 'Edit Match (Your Recorded Entry)'}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        ) : user?.role === 'operator' ? (
                          <span
                            className="p-1.5 text-zinc-300 dark:text-zinc-700 cursor-not-allowed"
                            title={`Recorded by ${m.created_by_name || 'another operator'} — Operators can only edit entries created by themselves`}
                          >
                            <Lock className="w-3.5 h-3.5" />
                          </span>
                        ) : null}

                        {user?.role === 'admin' && (
                          <button
                            onClick={() => setDeletingMatchId(m.id)}
                            className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer"
                            title="Delete Match (Admin Only)"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

              {/* Match Results Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {m.results?.map((res) => (
                  <div
                    key={res.id}
                    onClick={() => onSelectPlayer(res.player_id)}
                    className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 cursor-pointer hover:border-amber-400 transition-all flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-2 min-w-0">
                      <span className="font-black text-sm shrink-0">
                        {res.position === 1 ? '🥇' : res.position === 2 ? '🥈' : res.position === 3 ? '🥉' : '4️⃣'}
                      </span>
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-zinc-900 dark:text-white truncate">
                          {res.player_name}
                        </div>
                        <div className="text-[10px] text-zinc-500 dark:text-zinc-400">Rank {res.position}</div>
                      </div>
                    </div>

                    <div className="font-black text-amber-600 dark:text-amber-400 text-xs shrink-0 pl-1">
                      +{res.points_awarded} pts
                    </div>
                  </div>
                ))}
              </div>

              {m.notes && (
                <div className="text-xs text-zinc-500 dark:text-zinc-400 italic bg-zinc-50 dark:bg-zinc-800/30 p-2 rounded-xl">
                  Note: {m.notes}
                </div>
              )}
            </div>
          );
        })}
      </div>
    )}

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white dark:bg-zinc-900/80 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800/80 shadow-xs">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-3.5 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-700 dark:text-zinc-300 disabled:opacity-40 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4 inline mr-1" />
            Previous
          </button>

          <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400">
            Page {page} of {totalPages}
          </span>

          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="px-3.5 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-700 dark:text-zinc-300 disabled:opacity-40 cursor-pointer"
          >
            Next
            <ChevronRight className="w-4 h-4 inline ml-1" />
          </button>
        </div>
      )}

      {/* Delete Match Confirmation Modal */}
      {deletingMatchId && (
        <div className="fixed inset-0 z-50 bg-zinc-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 max-w-sm w-full space-y-4 border border-zinc-200 dark:border-zinc-800 shadow-2xl">
            <div className="flex items-center space-x-2 text-red-600 dark:text-red-400 font-bold text-base">
              <AlertTriangle className="w-5 h-5" />
              <span>Confirm Match Deletion</span>
            </div>

            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Are you sure you want to delete this match? All dependent statistics and rankings will be recalculated automatically in the database.
            </p>

            {actionError && <p className="text-xs text-red-500">{actionError}</p>}

            <div>
              <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">Reason for Deletion (Optional)</label>
              <input
                type="text"
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="e.g. Incorrect score recorded"
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setDeletingMatchId(null)}
                className="px-4 py-2 text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteMatch}
                disabled={submitting}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-md cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Deleting...' : 'Delete Match'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Match Modal */}
      {editingMatch && (
        <EditMatchModal
          isOpen={Boolean(editingMatch)}
          match={editingMatch}
          onClose={() => setEditingMatch(null)}
          onMatchUpdated={fetchMatches}
        />
      )}
    </div>
  );
};
