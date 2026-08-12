import React, { useState, useEffect } from 'react';
import { Match, Player } from '../types';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  History,
  Search,
  Filter,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Edit,
  Trash2,
  X,
  Plus,
  AlertTriangle,
  Trophy
} from 'lucide-react';

interface MatchHistoryProps {
  onSelectPlayer: (playerId: number) => void;
  onOpenNewMatch: () => void;
}

export const MatchHistory: React.FC<MatchHistoryProps> = ({ onSelectPlayer, onOpenNewMatch }) => {
  const { user } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
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

  useEffect(() => {
    fetchPlayers();
  }, []);

  useEffect(() => {
    fetchMatches();
  }, [page, selectedPlayerId, selectedPlayerCount, startDate, endDate]);

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
      setLoading(true);
      let endpoint = `/matches?page=${page}&limit=15`;
      if (selectedPlayerId) endpoint += `&playerId=${selectedPlayerId}`;
      if (selectedPlayerCount) endpoint += `&playerCount=${selectedPlayerCount}`;
      if (startDate) endpoint += `&startDate=${startDate}`;
      if (endDate) endpoint += `&endDate=${endDate}`;

      const res = await apiRequest<{ matches: Match[]; pagination: { totalPages: number } }>(endpoint);
      setMatches(res.matches);
      setTotalPages(res.pagination.totalPages || 1);
    } catch (err) {
      console.error('Failed to load match history:', err);
    } finally {
      setLoading(false);
    }
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
      fetchMatches();
    } catch (err: any) {
      setActionError(err.message || 'Failed to delete match.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-zinc-900/80 rounded-3xl p-6 border border-zinc-800/80 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-zinc-100 tracking-tight">Match History</h2>
            <p className="text-xs text-zinc-400">
              Audit log of all played matches and assigned points.
            </p>
          </div>
        </div>

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

      {/* Filters Bar */}
      <div className="bg-zinc-900/80 rounded-3xl p-4 border border-zinc-800/80 shadow-xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        {/* Player filter */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Filter Player
          </label>
          <select
            value={selectedPlayerId}
            onChange={(e) => {
              setSelectedPlayerId(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white"
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
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Game Size
          </label>
          <select
            value={selectedPlayerCount}
            onChange={(e) => {
              setSelectedPlayerCount(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white"
          >
            <option value="">All Sizes (2, 3, 4)</option>
            <option value="4">4 Players</option>
            <option value="3">3 Players</option>
            <option value="2">2 Players</option>
          </select>
        </div>

        {/* Start Date */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            From Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white"
          />
        </div>

        {/* End Date */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            To Date
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white"
          />
        </div>
      </div>

      {/* Match Cards List */}
      {loading ? (
        <div className="py-12 text-center text-slate-400">
          <div className="inline-block w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-2"></div>
          <p className="text-xs font-semibold">Loading matches from database...</p>
        </div>
      ) : matches.length === 0 ? (
        <div className="py-16 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-2">
          <History className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700" />
          <p className="text-base font-bold text-slate-700 dark:text-slate-300">No matches found.</p>
          <p className="text-xs text-slate-500">Try adjusting your search filters or record a new match.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {matches.map((m) => (
            <div
              key={m.id}
              className="bg-zinc-900/80 rounded-3xl p-5 border border-zinc-800/80 shadow-xl hover:border-amber-500/40 transition-all space-y-3"
            >
              {/* Match Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800 text-xs">
                <div className="flex items-center space-x-3">
                  <span className="font-mono font-black text-amber-600 dark:text-amber-400 text-sm">
                    {m.friendly_id}
                  </span>
                  <span className="text-slate-400">•</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    📅 {m.match_date} at {m.match_time}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-[10px]">
                    {m.player_count} Players
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  {m.created_by_name && (
                    <span className="text-[10px] text-slate-400">Recorded by {m.created_by_name}</span>
                  )}

                  {user?.role === 'admin' && (
                    <button
                      onClick={() => setDeletingMatchId(m.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                      title="Delete Match"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Match Results Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {m.results?.map((res) => (
                  <div
                    key={res.id}
                    onClick={() => onSelectPlayer(res.player_id)}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 cursor-pointer hover:border-amber-400 transition-all flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-2 min-w-0">
                      <span className="font-black text-sm shrink-0">
                        {res.position === 1 ? '🥇' : res.position === 2 ? '🥈' : res.position === 3 ? '🥉' : '4️⃣'}
                      </span>
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                          {res.player_name}
                        </div>
                        <div className="text-[10px] text-slate-400">Rank {res.position}</div>
                      </div>
                    </div>

                    <div className="font-black text-amber-600 dark:text-amber-400 text-xs shrink-0 pl-1">
                      +{res.points_awarded} pts
                    </div>
                  </div>
                ))}
              </div>

              {m.notes && (
                <div className="text-xs text-slate-500 italic bg-slate-50 dark:bg-slate-800/30 p-2 rounded-xl">
                  Note: {m.notes}
                </div>
              )}
            </div>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4 inline mr-1" />
                Previous
              </button>

              <span className="text-xs font-bold text-slate-500">
                Page {page} of {totalPages}
              </span>

              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 disabled:opacity-40"
              >
                Next
                <ChevronRight className="w-4 h-4 inline ml-1" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Delete Match Confirmation Modal */}
      {deletingMatchId && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-sm w-full space-y-4 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <div className="flex items-center space-x-2 text-red-600 dark:text-red-400 font-bold text-base">
              <AlertTriangle className="w-5 h-5" />
              <span>Confirm Match Deletion</span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Are you sure you want to delete this match? All dependent statistics and rankings will be recalculated automatically.
            </p>

            {actionError && <p className="text-xs text-red-500">{actionError}</p>}

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Reason for Deletion (Optional)</label>
              <input
                type="text"
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="e.g. Wrong rank assigned"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setDeletingMatchId(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded-xl"
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
    </div>
  );
};
