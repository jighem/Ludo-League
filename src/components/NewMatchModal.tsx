import React, { useState, useEffect } from 'react';
import { Player, ScoringRule } from '../types';
import { apiRequest } from '../api/client';
import { useLeague } from '../context/LeagueContext';
import { AddPlayerModal } from './AddPlayerModal';
import {
  X,
  Plus,
  Trophy,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Clock,
  RotateCcw,
  Crown
} from 'lucide-react';

interface NewMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMatchSaved: () => void;
}

export const NewMatchModal: React.FC<NewMatchModalProps> = ({ isOpen, onClose, onMatchSaved }) => {
  const { leagues, activeLeagueId } = useLeague();
  const [selectedLeagueId, setSelectedLeagueId] = useState<number>(activeLeagueId || 1);
  const [players, setPlayers] = useState<Player[]>([]);
  const [scoringRules, setScoringRules] = useState<Record<number, Record<number, number>>>({
    4: { 1: 50, 2: 30, 3: 20, 4: 0 },
    3: { 1: 62.5, 2: 37.5, 3: 0, 4: 0 },
    2: { 1: 100, 2: 0, 3: 0, 4: 0 }
  });

  const now = new Date();
  const defaultDate = now.toISOString().split('T')[0];
  const defaultTime = now.toTimeString().split(' ')[0].substring(0, 5);

  const [matchDate, setMatchDate] = useState(defaultDate);
  const [matchTime, setMatchTime] = useState(defaultTime);
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
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState<{ friendlyId: string; leagueName: string } | null>(null);

  const [addPlayerModalOpen, setAddPlayerModalOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedLeagueId(activeLeagueId || 1);
      fetchInitialData();
      resetForm();
    }
  }, [isOpen, activeLeagueId]);

  const fetchInitialData = async () => {
    try {
      const pRes = await apiRequest<{ players: Player[] }>('/players?status=active');
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

  const resetForm = () => {
    const freshNow = new Date();
    setMatchDate(freshNow.toISOString().split('T')[0]);
    setMatchTime(freshNow.toTimeString().split(' ')[0].substring(0, 5));
    setPlayerCount(4);
    setNotes('');
    setSelectedPlayers({ 1: '', 2: '', 3: '', 4: '' });
    setError('');
    setDuplicateWarning(null);
    setSavedSuccess(null);
  };

  if (!isOpen) return null;

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

  const handleCheckAndSubmit = async (overrideDuplicate = false) => {
    if (!validateForm()) return;

    const results = [];
    for (let pos = 1; pos <= playerCount; pos++) {
      results.push({
        position: pos,
        player_id: Number(selectedPlayers[pos])
      });
    }

    // Check for duplicate warning if not overridden
    if (!overrideDuplicate) {
      try {
        const dupRes = await apiRequest<{ isPossibleDuplicate: boolean; existingMatchId?: string }>('/matches/check-duplicate', {
          method: 'POST',
          body: JSON.stringify({
            match_date: matchDate,
            player_count: playerCount,
            results,
            league_id: selectedLeagueId
          })
        });

        if (dupRes.isPossibleDuplicate) {
          setDuplicateWarning(`A match with identical players and rankings (${dupRes.existingMatchId}) was recently recorded on this date. Confirm to proceed.`);
          return;
        }
      } catch (err) {
        // Continue if check fails
      }
    }

    // Save match
    try {
      setSubmitting(true);
      setError('');
      setDuplicateWarning(null);

      const res = await apiRequest<{ friendlyId: string }>('/matches', {
        method: 'POST',
        body: JSON.stringify({
          match_date: matchDate,
          match_time: matchTime,
          player_count: playerCount,
          league_id: selectedLeagueId,
          notes,
          results
        })
      });

      const currentLg = leagues.find((l) => l.id === selectedLeagueId);
      setSavedSuccess({
        friendlyId: res.friendlyId,
        leagueName: currentLg?.name || 'League'
      });
      onMatchSaved();
    } catch (err: any) {
      setError(err.message || 'Failed to save match.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePlayerAddedInline = (newPlayer: Player) => {
    setPlayers((prev) => [newPlayer, ...prev]);
    // Automatically select the new player in the first empty position
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
    { pos: 2, label: '2nd Place', icon: '🥈', color: 'border-slate-300 bg-slate-50 dark:bg-slate-800/50' },
    { pos: 3, label: '3rd Place', icon: '🥉', color: 'border-amber-700/40 bg-amber-900/10' },
    { pos: 4, label: '4th Place', icon: '4️⃣', color: 'border-slate-200 bg-slate-50 dark:bg-slate-800/30' }
  ];

  return (
    <>
      <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-xl w-full p-5 sm:p-6 relative my-auto">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-md shadow-orange-500/20">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Record Match</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Enter league, players & finishing ranks</p>
              </div>
            </div>

            <button
              id="btn-close-new-match"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Success Screen */}
          {savedSuccess ? (
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div>
                <h4 className="text-2xl font-black text-slate-900 dark:text-white">Match Recorded!</h4>
                <p className="text-sm font-semibold text-amber-600 dark:text-amber-400 mt-1">
                  Reference: <span className="underline">{savedSuccess.friendlyId}</span> in <span className="font-extrabold">{savedSuccess.leagueName}</span>
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 max-w-xs mx-auto">
                  Points have been dynamically updated in the leaderboard and analytics for this league.
                </p>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  id="btn-record-another-match"
                  onClick={resetForm}
                  className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold rounded-xl shadow-md shadow-orange-500/20 flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Record Another Match</span>
                </button>
                <button
                  id="btn-done-match"
                  onClick={onClose}
                  className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold rounded-xl cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 flex items-start space-x-2 text-red-700 dark:text-red-300 text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {duplicateWarning && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 space-y-2">
                  <div className="flex items-start space-x-2 text-amber-800 dark:text-amber-300 text-xs font-semibold">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                    <span>{duplicateWarning}</span>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => setDuplicateWarning(null)}
                      className="px-3 py-1 text-xs font-bold text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      id="btn-confirm-duplicate-save"
                      onClick={() => handleCheckAndSubmit(true)}
                      className="px-3 py-1 text-xs font-bold text-white bg-amber-600 rounded-lg shadow-xs"
                    >
                      Yes, Save Match
                    </button>
                  </div>
                </div>
              )}

              {/* League Selector in Match Modal */}
              <div className="p-3 rounded-2xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20">
                <label className="block text-[11px] font-extrabold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5" /> Target Ludo League
                </label>
                <select
                  id="select-match-league"
                  value={selectedLeagueId}
                  onChange={(e) => setSelectedLeagueId(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-amber-500/30 rounded-xl text-xs font-black text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                >
                  {leagues.map((lg) => (
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
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Match Date
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      id="input-match-date"
                      type="date"
                      value={matchDate}
                      onChange={(e) => setMatchDate(e.target.value)}
                      className="w-full pl-9 pr-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs font-medium"
                      required
                    />
                  </div>
                </div>

                {/* Time */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Time
                  </label>
                  <div className="relative">
                    <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      id="input-match-time"
                      type="time"
                      value={matchTime}
                      onChange={(e) => setMatchTime(e.target.value)}
                      className="w-full pl-9 pr-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs font-medium"
                      required
                    />
                  </div>
                </div>

                {/* Player Count */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Match Type
                  </label>
                  <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                    {([4, 3, 2] as const).map((cnt) => (
                      <button
                        key={cnt}
                        type="button"
                        onClick={() => handlePlayerCountChange(cnt)}
                        className={`flex-1 py-1 text-xs font-bold rounded-lg transition-all ${
                          playerCount === cnt
                            ? 'bg-amber-500 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        {cnt} Players
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Player Rankings Assignment Cards */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                    Player Finishing Ranks
                  </span>
                  <button
                    id="btn-quick-add-player"
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
                            <div className="text-xs font-bold text-slate-900 dark:text-white">{item.label}</div>
                            <div className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                              +{pts} pts
                            </div>
                          </div>
                        </div>

                        <div className="grow max-w-xs">
                          <select
                            id={`select-player-pos-${item.pos}`}
                            value={selectedPlayers[item.pos] || ''}
                            onChange={(e) => handlePlayerChange(item.pos, e.target.value)}
                            className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 shadow-xs"
                          >
                            <option value="">-- Select Player --</option>
                            {players.map((p) => {
                              // Check if selected in another position
                              const isSelectedElsewhere = Object.entries(selectedPlayers).some(
                                ([pos, pid]) => Number(pos) !== item.pos && pid === String(p.id)
                              );
                              return (
                                <option key={p.id} value={p.id} disabled={isSelectedElsewhere}>
                                  {p.full_name} {p.nickname ? `(${p.nickname})` : ''} {isSelectedElsewhere ? '✓' : ''}
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

              {/* Optional Notes */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Match Notes (Optional)
                </label>
                <input
                  id="input-match-notes"
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Final match of the night"
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Total Points Distributed: <span className="font-bold text-amber-600 dark:text-amber-400">100.00 pts</span>
                </div>

                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    id="btn-save-match-submit"
                    onClick={() => handleCheckAndSubmit(false)}
                    disabled={submitting}
                    className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 rounded-xl shadow-md shadow-orange-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? 'Saving Match...' : 'Save Match'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Add Player Modal */}
      <AddPlayerModal
        isOpen={addPlayerModalOpen}
        onClose={() => setAddPlayerModalOpen(false)}
        onPlayerAdded={handlePlayerAddedInline}
      />
    </>
  );
};
