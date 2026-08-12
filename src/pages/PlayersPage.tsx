import React, { useState, useEffect } from 'react';
import { Player } from '../types';
import { apiRequest } from '../api/client';
import { formatDateStr } from '../utils/date';
import { useAuth } from '../context/AuthContext';
import { AddPlayerModal } from '../components/AddPlayerModal';
import {
  Users,
  Search,
  Plus,
  UserCheck,
  UserX,
  Edit,
  Mail,
  Phone,
  Calendar,
  AlertCircle
} from 'lucide-react';

interface PlayersPageProps {
  onSelectPlayer: (playerId: number) => void;
}

export const PlayersPage: React.FC<PlayersPageProps> = ({ onSelectPlayer }) => {
  const { user } = useAuth();
  const [players, setPlayers] = useState<Player[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [loading, setLoading] = useState(true);

  // Modals
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editNickname, setEditNickname] = useState('');
  const [editMobile, setEditMobile] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    fetchPlayers();
  }, [search, statusFilter]);

  const fetchPlayers = async () => {
    try {
      setLoading(true);
      let endpoint = `/players?search=${encodeURIComponent(search)}`;
      if (statusFilter !== 'all') endpoint += `&status=${statusFilter}`;
      const res = await apiRequest<{ players: Player[] }>(endpoint);
      setPlayers(res.players);
    } catch (err) {
      console.error('Failed to load players:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEdit = (p: Player) => {
    setEditingPlayer(p);
    setEditFullName(p.full_name);
    setEditNickname(p.nickname || '');
    setEditMobile(p.mobile_number || '');
    setEditEmail(p.email || '');
    setEditIsActive(Boolean(p.is_active));
    setActionError('');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlayer) return;
    try {
      setSubmitting(true);
      setActionError('');
      await apiRequest(`/players/${editingPlayer.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          full_name: editFullName.trim(),
          nickname: editNickname.trim() || null,
          mobile_number: editMobile.trim() || null,
          email: editEmail.trim() || null,
          date_joined: editingPlayer.date_joined,
          is_active: editIsActive
        })
      });
      setEditingPlayer(null);
      fetchPlayers();
    } catch (err: any) {
      setActionError(err.message || 'Failed to update player.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-zinc-900/80 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800/80 shadow-md dark:shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">Player Management</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Register, manage, and view player statistics
            </p>
          </div>
        </div>

        {(user?.role === 'admin' || user?.role === 'operator') && (
          <button
            id="btn-add-player-page"
            onClick={() => setAddModalOpen(true)}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-extrabold rounded-xl text-xs shadow-md shadow-amber-500/10 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Add Player</span>
          </button>
        )}
      </div>

      {/* Search & Status Filter */}
      <div className="bg-white dark:bg-zinc-900/80 rounded-3xl p-4 border border-zinc-200 dark:border-zinc-800/80 shadow-md dark:shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs transition-colors">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search players by name..."
            className="w-full pl-9 pr-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white font-medium"
          />
        </div>

        <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl w-full sm:w-auto border border-zinc-200 dark:border-zinc-700/50">
          {(['all', 'active', 'inactive'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 text-xs font-bold capitalize rounded-lg transition-all cursor-pointer ${
                statusFilter === st ? 'bg-amber-500 text-zinc-950 shadow-xs font-extrabold' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Players Grid */}
      {loading ? (
        <div className="py-12 text-center text-zinc-500 dark:text-zinc-400">
          <div className="inline-block w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-2"></div>
          <p className="text-xs font-semibold">Loading players from database...</p>
        </div>
      ) : players.length === 0 ? (
        <div className="py-16 text-center text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-900/80 rounded-3xl border border-zinc-200 dark:border-zinc-800/80 space-y-2">
          <Users className="w-12 h-12 mx-auto text-zinc-400 dark:text-zinc-700" />
          <p className="text-base font-bold text-zinc-800 dark:text-zinc-300">No players registered yet.</p>
          <p className="text-xs text-zinc-500">Click "Add Player" above to register your first Ludo player!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {players.map((p) => (
            <div
              key={p.id}
              className="bg-white dark:bg-zinc-900/80 rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800/80 shadow-md dark:shadow-xl hover:border-amber-500/40 transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white font-extrabold text-lg flex items-center justify-center shadow-md shadow-orange-500/20">
                      {p.full_name.charAt(0)}
                    </div>
                    <div>
                      <h3
                        onClick={() => onSelectPlayer(p.id)}
                        className="font-bold text-zinc-900 dark:text-white hover:text-amber-600 dark:hover:text-amber-400 cursor-pointer transition-colors"
                      >
                        {p.full_name}
                      </h3>
                      {p.nickname && <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">"{p.nickname}"</p>}
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 text-[10px] font-extrabold rounded-full ${
                      p.is_active
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                        : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
                    }`}
                  >
                    {p.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="space-y-1 text-xs text-zinc-500 dark:text-zinc-400 pt-1">
                  {p.mobile_number && (
                    <div className="flex items-center space-x-2">
                      <Phone className="w-3.5 h-3.5 text-zinc-400" />
                      <span>{p.mobile_number}</span>
                    </div>
                  )}
                  {p.email && (
                    <div className="flex items-center space-x-2">
                      <Mail className="w-3.5 h-3.5 text-zinc-400" />
                      <span>{p.email}</span>
                    </div>
                  )}
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Joined: {formatDateStr(p.date_joined)}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                  {p.total_matches || 0} Matches Played
                </span>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => onSelectPlayer(p.id)}
                    className="px-3 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold rounded-lg text-xs"
                  >
                    View Stats
                  </button>

                  {(user?.role === 'admin' || user?.role === 'operator') && (
                    <button
                      onClick={() => handleOpenEdit(p)}
                      className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg"
                      title="Edit Player"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Player Modal */}
      <AddPlayerModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onPlayerAdded={() => fetchPlayers()}
      />

      {/* Edit Player Modal */}
      {editingPlayer && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full space-y-4 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Edit Player</h3>

            {actionError && <p className="text-xs text-red-500">{actionError}</p>}

            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Full Name</label>
                <input
                  type="text"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Nickname</label>
                <input
                  type="text"
                  value={editNickname}
                  onChange={(e) => setEditNickname(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Mobile</label>
                <input
                  type="text"
                  value={editMobile}
                  onChange={(e) => setEditMobile(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Email</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="chk-edit-active"
                  checked={editIsActive}
                  onChange={(e) => setEditIsActive(e.target.checked)}
                  className="w-4 h-4 text-amber-500 rounded"
                />
                <label htmlFor="chk-edit-active" className="font-bold text-slate-800 dark:text-slate-200">
                  Active Status (Uncheck to archive player without deleting match history)
                </label>
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingPlayer(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-xl cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
