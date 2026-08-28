import React, { useState, useEffect, useMemo } from 'react';
import { Match, Player, ScoringRule } from '../types';
import { apiRequest } from '../api/client';
import { useLeague } from '../context/LeagueContext';
import { useAuth } from '../context/AuthContext';
import { AddPlayerModal } from './AddPlayerModal';
import {
  X,
  Plus,
  Trophy,
  AlertTriangle,
  Calendar,
  Clock,
  Crown,
  Edit2,
  Lock,
  Save,
  ShieldAlert
} from 'lucide-react';

interface EditMatchModalProps {
  match: Match | null;
  isOpen: boolean;
  onClose: () => void;
  onMatchUpdated: () => void;
}

export const EditMatchModal: React.FC<EditMatchModalProps> = ({
  match,
  isOpen,
  onClose,
  onMatchUpdated
}) => {
  const { user } = useAuth();
  const { leagues, triggerDataRefresh } = useLeague();

  // Determine available leagues for current user
  const availableLeagues = useMemo(() => {
    if (!user) return [];
    if (user.role === 'admin') {
      return leagues.filter((l) => l.is_active === 1 || (match && l.id === match.league_id));
    }
    if (user.allowed_leagues === null || user.allowed_leagues === undefined) {
      return leagues.filter((l) => l.is_active === 1 || (match && l.id === match.league_id));
    }
    let allowedIds: number[] = [];
    if (Array.isArray(user.allowed_leagues)) {
      allowedIds = user.allowed_leagues.map(Number);
    } else if (typeof user.allowed_leagues === 'string') {
      try {
        allowedIds = JSON.parse(user.allowed_leagues).map(Number);
      } catch {
        allowedIds = user.allowed_leagues.split(',').map(Number);
      }
    }
    return leagues.filter((l) => (l.is_active === 1 || (match && l.id === match.league_id)) && allowedIds.includes(l.id));
  }, [user, leagues, match]);

  const isUserAllowedForMatch = useMemo(() => {
    if (!user || !match) return false;
    if (user.role === 'admin') return true;
    if (user.role === 'operator') {
      if (match.created_by != null && Number(match.created_by) !== Number(user.id)) {
        return false;
      }
      if (user.allowed_leagues === null || user.allowed_leagues === undefined) {
        return true;
      }
      let allowedIds: number[] = [];
      if (Array.isArray(user.allowed_leagues)) {
        allowedIds = user.allowed_leagues.map(Number);
      } else if (typeof user.allowed_leagues === 'string') {
        try {
          allowedIds = JSON.parse(user.allowed_leagues).map(Number);
        } catch {
          allowedIds = user.allowed_leagues.split(',').map(Number);
        }
      }
      return allowedIds.includes(Number(match.league_id));
    }
    return false;
  }, [user, match]);

  const [selectedLeagueId, setSelectedLeagueId] = useState<number>(1);
  const [players, setPlayers] = useState<Player[]>([]);
  const [scoringRules, setScoringRules] = useState<Record<number, Record<number, number>>>({
    4: { 1: 50, 2: 30, 3: 20, 4: 0 },
    3: { 1: 62.5, 2: 37.5, 3: 0, 4: 0 },
    2: { 1: 100, 2: 0, 3: 0, 4: 0 }
  });

  const [matchDate, setMatchDate] = useState('');
  const [matchTime, setMatchTime] = useState('');
  const [playerCount, setPlayerCount] = useState<2 | 3 | 4>(4);
  const [notes, setNotes] = useState('');

  // Selected player IDs mapped to position (1, 2, 3, 4)
  const [selectedPlayers, setSelectedPlayers] = useState<Record<number, string>>({
    1: '',
    2: '',
    3: '',
    4: ''
  });

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [addPlayerModalOpen, setAddPlayerModalOpen] = useState(false);

  useEffect(() => {
    if (isOpen && match) {
      populateFromMatch(match);
      fetchInitialData();
    }
  }, [isOpen, match]);

  const populateFromMatch = (m: Match) => {
    setSelectedLeagueId(m.league_id || 1);
    setMatchDate(m.match_date ? m.match_date.split('T')[0] : '');
    setMatchTime(m.match_time || '');
    setPlayerCount((m.player_count as 2 | 3 | 4) || 4);
    setNotes(m.notes || '');

    const posMap: Record<number, string> = { 1: '', 2: '', 3: '', 4: '' };
    if (m.results && Array.isArray(m.results)) {
      m.results.forEach((r) => {
        if (r.position >= 1 && r.position <= 4) {
          posMap[r.position] = String(r.player_id);
        }
      });
    }
    setSelectedPlayers(posMap);
    setError('');
  };

  const fetchInitialData = async () => {
    try {
      const pRes = await apiRequest<{ players: Player[] }>('/players');
      setPlayers(pRes.players);

      const sRes = await apiRequest<{ scoringRules: ScoringRule[] }>('/settings');
      if (sRes.scoringRules) {
        const rulesMap: Record<number, Record<number, number>> = {};
        sRes.scoringRules.forEach((r) => {
          rulesMap[r.player_count] = {
            1: Number(r.pos1_points),
            2: Number(r.pos2_points),
            3: Number(r.pos3_points),
            4: Number(r.pos4_points)
          };
        });
        setScoringRules(rulesMap);
      }
    } catch (err) {
      console.error('Failed to load initial match data:', err);
    }
  };

  if (!isOpen || !match) return null;

  // Check if current user is allowed to edit this match
  const isAdmin = user?.role === 'admin';
  const isOwner = match.created_by != null && user?.id != null && Number(match.created_by) === Number(user.id);
  const canEdit = isAdmin || isOwner;

  const handlePlayerChange = (position: number, playerId: string) => {
    setSelectedPlayers((prev) => ({
      ...prev,
      [position]: playerId
    }));
  };

  const handlePlayerCountChange = (count: 2 | 3 | 4) => {
    setPlayerCount(count);
    if (count === 3) {
      setSelectedPlayers((prev) => ({ ...prev, 4: '' }));
    } else if (count === 2) {
      setSelectedPlayers((prev) => ({ ...prev, 3: '', 4: '' }));
    }
  };

  const validateForm = (): boolean => {
    setError('');
    if (!canEdit) {
      setError('Permission denied: Operators are only allowed to edit match entries recorded by themselves.');
      return false;
    }

    if (!selectedLeagueId) {
      setError('Please select a League for this match');
      return false;
    }

    for (let pos = 1; pos <= playerCount; pos++) {
      if (!selectedPlayers[pos]) {
        setError(`Please select a player for Position ${pos}`);
        return false;
      }
    }

    // Check unique players
    const chosenIds = [];
    for (let pos = 1; pos <= playerCount; pos++) {
      chosenIds.push(selectedPlayers[pos]);
    }
    const uniqueIds = new Set(chosenIds);
    if (uniqueIds.size !== playerCount) {
      setError('The same player cannot be selected twice in one match');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const results = [];
    for (let pos = 1; pos <= playerCount; pos++) {
      results.push({
        position: pos,
        player_id: Number(selectedPlayers[pos])
      });
    }

    try {
      setSubmitting(true);
      setError('');

      await apiRequest(`/matches/${match.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          match_date: matchDate,
          match_time: matchTime,
          player_count: playerCount,
          league_id: selectedLeagueId,
          notes,
          results
        })
      });

      triggerDataRefresh();
      onMatchUpdated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update match.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePlayerAddedInline = (newPlayer: Player) => {
    setPlayers((prev) => [newPlayer, ...prev]);
    for (let pos = 1; pos <= playerCount; pos++) {
      if (!selectedPlayers[pos]) {
        handlePlayerChange(pos, String(newPlayer.id));
        break;
      }
    }
  };

  const currentPoints = scoringRules[playerCount] || { 1: 50, 2: 30, 3: 20, 4: 0 };

  const positionBadges = [
    { pos: 1, label: '1st Place (Winner)', icon: '🥇', color: 'border-amber-400 bg-amber-50 dark:bg-amber-950/30' },
    { pos: 2, label: '2nd Place', icon: '🥈', color: 'border-zinc-300 bg-zinc-50 dark:bg-zinc-800/50' },
    { pos: 3, label: '3rd Place', icon: '🥉', color: 'border-amber-700/40 bg-amber-900/10' },
    { pos: 4, label: '4th Place', icon: '4️⃣', color: 'border-zinc-200 bg-zinc-50 dark:bg-zinc-800/30' }
  ];

  return (
    <>
      <div className="fixed inset-0 z-50 bg-zinc-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 max-w-xl w-full p-5 sm:p-6 relative my-auto">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-md shadow-orange-500/20">
                <Edit2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-lg font-black text-zinc-900 dark:text-white tracking-tight">
                    Edit Match <span className="font-mono text-amber-600 dark:text-amber-400">{match.friendly_id}</span>
                  </h3>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {match.created_by_name ? `Originally recorded by ${match.created_by_name}` : 'Modify match entries and rankings'}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {!canEdit ? (
            <div className="py-6 space-y-4">
              <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 flex items-start space-x-3 text-red-700 dark:text-red-300 text-xs">
                <Lock className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
                <div className="space-y-1">
                  <div className="font-bold">Edit Permission Restricted</div>
                  <div>
                    Operators are only authorized to edit match entries that they personally recorded.
                    This entry was recorded by <span className="font-bold">{match.created_by_name || 'another user'}</span>.
                    Only an administrator can edit or delete this entry.
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 font-bold rounded-xl text-xs cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 flex items-start space-x-2 text-red-700 dark:text-red-300 text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Ownership & League Rights confirmation banner */}
              {!isUserAllowedForMatch ? (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>
                    Permission denied: You cannot edit this match because you either did not record it or do not have permissions for this league.
                  </span>
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs flex items-center justify-between">
                  <span>
                    {isAdmin
                      ? '🛡️ Administrator Mode: You have full authority to modify this match.'
                      : '✅ Verified: You recorded this entry and hold rights for this league.'}
                  </span>
                </div>
              )}

              {/* League Selector */}
              <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-extrabold text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Crown className="w-3.5 h-3.5" /> Target Ludo League
                  </label>
                  {user?.role === 'operator' && (
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-semibold">
                      {availableLeagues.length} permitted league{availableLeagues.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <select
                  value={selectedLeagueId}
                  onChange={(e) => setSelectedLeagueId(Number(e.target.value))}
                  disabled={!isUserAllowedForMatch}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-900 dark:text-white focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
                >
                  {availableLeagues.map((lg) => (
                    <option key={lg.id} value={lg.id}>
                      {lg.name} ({lg.code}) {lg.is_default === 1 ? '— Default League' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Match Controls Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Date */}
                <div>
                  <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                    Match Date
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                    <input
                      type="date"
                      value={matchDate}
                      onChange={(e) => setMatchDate(e.target.value)}
                      className="w-full pl-9 pr-2 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white text-xs font-medium"
                      required
                    />
                  </div>
                </div>

                {/* Time */}
                <div>
                  <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                    Time
                  </label>
                  <div className="relative">
                    <Clock className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                    <input
                      type="time"
                      value={matchTime}
                      onChange={(e) => setMatchTime(e.target.value)}
                      className="w-full pl-9 pr-2 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white text-xs font-medium"
                      required
                    />
                  </div>
                </div>

                {/* Player Count */}
                <div>
                  <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                    Match Type
                  </label>
                  <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl border border-zinc-200 dark:border-zinc-700">
                    {([4, 3, 2] as const).map((cnt) => (
                      <button
                        key={cnt}
                        type="button"
                        onClick={() => handlePlayerCountChange(cnt)}
                        className={`flex-1 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                          playerCount === cnt
                            ? 'bg-amber-500 text-white shadow-xs'
                            : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                        }`}
                      >
                        {cnt} Players
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Player Finishing Ranks */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-zinc-900 dark:text-white uppercase tracking-wider">
                    Player Finishing Ranks
                  </span>
                  <button
                    type="button"
                    onClick={() => setAddPlayerModalOpen(true)}
                    className="inline-flex items-center space-x-1 text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add New Player</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {positionBadges.slice(0, playerCount).map((item) => {
                    const pts = currentPoints[item.pos as keyof typeof currentPoints] || 0;
                    return (
                      <div
                        key={item.pos}
                        className={`p-3 rounded-2xl border ${item.color} flex items-center justify-between gap-3 transition-all`}
                      >
                        <div className="flex items-center space-x-2 shrink-0">
                          <span className="text-2xl">{item.icon}</span>
                          <div>
                            <div className="text-xs font-bold text-zinc-900 dark:text-white">{item.label}</div>
                            <div className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                              +{pts} pts
                            </div>
                          </div>
                        </div>

                        <div className="grow max-w-xs">
                          <select
                            value={selectedPlayers[item.pos] || ''}
                            onChange={(e) => handlePlayerChange(item.pos, e.target.value)}
                            className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs font-semibold text-zinc-900 dark:text-white focus:ring-2 focus:ring-amber-500 shadow-xs"
                          >
                            <option value="">-- Select Player --</option>
                            {players.map((p) => {
                              const isSelectedElsewhere = Object.entries(selectedPlayers).some(
                                ([pos, pid]) => Number(pos) !== item.pos && pid === String(p.id)
                              );
                              return (
                                <option
                                  key={p.id}
                                  value={p.id}
                                  disabled={isSelectedElsewhere}
                                  className={isSelectedElsewhere ? 'text-zinc-400 bg-zinc-100 dark:bg-zinc-800' : ''}
                                >
                                  {p.full_name} {p.nickname ? `(${p.nickname})` : ''}
                                  {isSelectedElsewhere ? ' — [Selected]' : ''}
                                </option>
                              );
                            })}
                          </select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                  Match Notes (Optional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Nail-biting finish, tournament round 2"
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white text-xs"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !isUserAllowedForMatch}
                  className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-xs font-bold rounded-xl shadow-md shadow-orange-500/20 flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{submitting ? 'Saving...' : 'Save Match Changes'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {addPlayerModalOpen && (
        <AddPlayerModal
          isOpen={addPlayerModalOpen}
          onClose={() => setAddPlayerModalOpen(false)}
          onPlayerAdded={handlePlayerAddedInline}
        />
      )}
    </>
  );
};
