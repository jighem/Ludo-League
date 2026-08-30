import React, { useState, useEffect, useMemo } from 'react';
import { Player, ScoringRule } from '../types';
import { apiRequest } from '../api/client';
import { useLeague } from '../context/LeagueContext';
import { useAuth } from '../context/AuthContext';
import { AddPlayerModal } from './AddPlayerModal';
import { LudoRulesModal } from './ludo/LudoRulesModal';
import { queuePendingMatch, isBrowserOnline } from '../utils/ludoOfflineSync';
import {
  X,
  Plus,
  Trophy,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Clock,
  RotateCcw,
  Crown,
  ShieldAlert,
  BookOpen,
  WifiOff,
  Swords,
  Skull
} from 'lucide-react';

interface NewMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMatchSaved: () => void;
}

export const NewMatchModal: React.FC<NewMatchModalProps> = ({ isOpen, onClose, onMatchSaved }) => {
  const { user } = useAuth();
  const { leagues, activeLeagueId, setActiveLeagueId, triggerDataRefresh } = useLeague();
  
  // Determine available leagues for current user
  const availableLeagues = useMemo(() => {
    if (!user) return [];
    if (user.role === 'admin') {
      return leagues.filter((l) => l.is_active === 1);
    }
    if (user.allowed_leagues === null || user.allowed_leagues === undefined) {
      return leagues.filter((l) => l.is_active === 1);
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
    return leagues.filter((l) => l.is_active === 1 && allowedIds.includes(l.id));
  }, [user, leagues]);

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

  // Combat Stats (Kills and Deaths) mapped to position (1, 2, 3, 4)
  const [combatStats, setCombatStats] = useState<Record<number, { kills: number; deaths: number }>>({
    1: { kills: 0, deaths: 0 },
    2: { kills: 0, deaths: 0 },
    3: { kills: 0, deaths: 0 },
    4: { kills: 0, deaths: 0 }
  });

  const [error, setError] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState<{
    friendlyId: string;
    leagueName: string;
    breakdown: { pos: number; name: string; pts: number; icon: string }[];
  } | null>(null);

  const [addPlayerModalOpen, setAddPlayerModalOpen] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Pick activeLeagueId if permitted, otherwise first permitted league
      const isPermitted = availableLeagues.some((l) => l.id === activeLeagueId);
      if (isPermitted) {
        setSelectedLeagueId(activeLeagueId || availableLeagues[0]?.id || 1);
      } else if (availableLeagues.length > 0) {
        setSelectedLeagueId(availableLeagues[0].id);
      }
      fetchInitialData();
      resetForm();
    }
  }, [isOpen, activeLeagueId, availableLeagues]);

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
    setCombatStats({
      1: { kills: 0, deaths: 0 },
      2: { kills: 0, deaths: 0 },
      3: { kills: 0, deaths: 0 },
      4: { kills: 0, deaths: 0 }
    });
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

  const handleCombatChange = (position: number, field: 'kills' | 'deaths', val: number) => {
    setCombatStats((prev) => ({
      ...prev,
      [position]: {
        ...prev[position],
        [field]: Math.max(0, val)
      }
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
        player_id: Number(selectedPlayers[pos]),
        kills: Number(combatStats[pos]?.kills || 0),
        deaths: Number(combatStats[pos]?.deaths || 0)
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

      const matchPayload = {
        match_date: matchDate,
        match_time: matchTime,
        player_count: playerCount,
        league_id: selectedLeagueId,
        notes,
        results
      };

      const currentLg = leagues.find((l) => l.id === selectedLeagueId);
      const breakdown = results.map((r) => {
        const found = players.find((p) => p.id === r.player_id);
        const basePts = currentPoints[r.position as keyof typeof currentPoints] || 0;
        const kills = r.kills || 0;
        const deaths = r.deaths || 0;
        const combatDiff = (kills * 5) - (deaths * 5);
        const pts = Math.max(0, basePts + combatDiff);
        const icon = r.position === 1 ? '🥇' : r.position === 2 ? '🥈' : r.position === 3 ? '🥉' : '4️⃣';
        return {
          pos: r.position,
          name: found ? `${found.full_name}${found.nickname ? ` (${found.nickname})` : ''}` : `Player ${r.player_id}`,
          pts,
          icon
        };
      });

      if (!isBrowserOnline()) {
        queuePendingMatch(matchPayload);
        setSavedSuccess({
          friendlyId: 'OFFLINE-QUEUED (Auto-syncs on reconnect)',
          leagueName: currentLg?.name || 'League',
          breakdown
        });
        if (selectedLeagueId && selectedLeagueId !== activeLeagueId) {
          setActiveLeagueId(selectedLeagueId);
        }
        onMatchSaved();
        return;
      }

      try {
        const res = await apiRequest<{ friendlyId: string }>('/matches', {
          method: 'POST',
          body: JSON.stringify(matchPayload)
        });

        setSavedSuccess({
          friendlyId: res.friendlyId,
          leagueName: currentLg?.name || 'League',
          breakdown
        });

        if (selectedLeagueId && selectedLeagueId !== activeLeagueId) {
          setActiveLeagueId(selectedLeagueId);
        }

        triggerDataRefresh();
        onMatchSaved();
      } catch (networkErr: any) {
        console.warn('Network error, queueing match offline:', networkErr);
        queuePendingMatch(matchPayload);
        setSavedSuccess({
          friendlyId: 'OFFLINE-QUEUED (Auto-syncs on reconnect)',
          leagueName: currentLg?.name || 'League',
          breakdown
        });
        if (selectedLeagueId && selectedLeagueId !== activeLeagueId) {
          setActiveLeagueId(selectedLeagueId);
        }
        onMatchSaved();
      }
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
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                  Points have been dynamically distributed and saved to the league leaderboard.
                </p>
              </div>

              {/* Ranks and Scores Breakdown for 1st, 2nd, 3rd, 4th */}
              {savedSuccess.breakdown && savedSuccess.breakdown.length > 0 && (
                <div className="max-w-md mx-auto space-y-2 text-left pt-2">
                  <div className="text-[11px] font-black uppercase tracking-wider text-slate-400 text-center mb-1">
                    Standings & Awarded Points
                  </div>
                  {savedSuccess.breakdown.map((item) => (
                    <div
                      key={item.pos}
                      className={`p-3 rounded-2xl border flex items-center justify-between ${
                        item.pos === 1
                          ? 'bg-amber-500/10 border-amber-400 text-slate-900 dark:text-white ring-1 ring-amber-400/30'
                          : item.pos === 2
                          ? 'bg-slate-100 dark:bg-slate-800/60 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white'
                          : item.pos === 3
                          ? 'bg-amber-900/10 border-amber-700/40 text-slate-900 dark:text-white'
                          : 'bg-slate-50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-xl">{item.icon}</span>
                        <div>
                          <div className="text-xs font-black">{item.name}</div>
                          <div className="text-[10px] text-slate-400 font-bold">
                            {item.pos === 1 ? '1st Place Winner' : `${item.pos === 2 ? '2nd' : item.pos === 3 ? '3rd' : '4th'} Place`}
                          </div>
                        </div>
                      </div>
                      <div className="text-xs font-black text-amber-600 dark:text-amber-400 px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20">
                        +{item.pts} pts
                      </div>
                    </div>
                  ))}
                </div>
              )}

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

                {availableLeagues.length === 0 ? (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>You do not have recording rights for any active league. Contact an administrator to assign league permissions.</span>
                  </div>
                ) : (
                  <select
                    id="select-match-league"
                    value={selectedLeagueId}
                    onChange={(e) => setSelectedLeagueId(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-amber-500/30 rounded-xl text-xs font-black text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                  >
                    {availableLeagues.map((lg) => (
                      <option key={lg.id} value={lg.id}>
                        {lg.name} ({lg.code}) {lg.is_default === 1 ? '— Default League' : ''}
                      </option>
                    ))}
                  </select>
                )}
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
                  <div className="flex items-center space-x-3">
                    <button
                      id="btn-view-rules-modal-in-newmatch"
                      type="button"
                      onClick={() => setShowRulesModal(true)}
                      className="inline-flex items-center space-x-1 text-xs font-bold text-slate-500 hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-400 cursor-pointer"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Rules & Points</span>
                    </button>
                    <button
                      id="btn-quick-add-player"
                      onClick={() => setAddPlayerModalOpen(true)}
                      className="inline-flex items-center space-x-1 text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add New Player</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {positionBadges.slice(0, playerCount).map((item) => {
                    const basePts = currentPoints[item.pos as keyof typeof currentPoints] || 0;
                    const kills = combatStats[item.pos]?.kills || 0;
                    const deaths = combatStats[item.pos]?.deaths || 0;
                    const combatDiff = (kills * 5) - (deaths * 5);
                    const totalPts = Math.max(0, basePts + combatDiff);

                    return (
                      <div
                        key={item.pos}
                        className={`p-3 rounded-2xl border ${item.color} space-y-2 transition-all`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                          <div className="flex items-center space-x-2 shrink-0">
                            <span className="text-2xl">{item.icon}</span>
                            <div>
                              <div className="text-xs font-bold text-slate-900 dark:text-white">{item.label}</div>
                              <div className="flex items-center gap-1.5 text-[10px]">
                                <span className="text-slate-500 dark:text-slate-400 font-semibold">
                                  Base: +{basePts}
                                </span>
                                {combatDiff !== 0 && (
                                  <span className={`font-bold ${combatDiff > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                    Combat: {combatDiff > 0 ? `+${combatDiff}` : combatDiff}
                                  </span>
                                )}
                                <span className="font-extrabold text-amber-600 dark:text-amber-400 ml-0.5">
                                  = {totalPts.toFixed(1)} pts
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="grow max-w-full sm:max-w-xs">
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

                        {/* Combat Kills & Deaths Inputs */}
                        <div className="flex items-center justify-between sm:justify-end gap-3 pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60 text-xs">
                          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 sm:mr-auto">
                            Combat Stats:
                          </span>
                          
                          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-xl border border-emerald-200 dark:border-emerald-900/60">
                            <Swords className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">Kills:</span>
                            <input
                              type="number"
                              min="0"
                              max="99"
                              value={kills}
                              onChange={(e) => handleCombatChange(item.pos, 'kills', parseInt(e.target.value) || 0)}
                              className="w-12 text-center text-xs font-black bg-transparent text-slate-900 dark:text-white border-0 p-0 focus:ring-0 focus:outline-hidden"
                            />
                            <span className="text-[9px] text-emerald-600 font-semibold">(+5 ea)</span>
                          </div>

                          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-xl border border-rose-200 dark:border-rose-900/60">
                            <Skull className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                            <span className="text-[10px] font-bold text-rose-700 dark:text-rose-400">Deaths:</span>
                            <input
                              type="number"
                              min="0"
                              max="99"
                              value={deaths}
                              onChange={(e) => handleCombatChange(item.pos, 'deaths', parseInt(e.target.value) || 0)}
                              className="w-12 text-center text-xs font-black bg-transparent text-slate-900 dark:text-white border-0 p-0 focus:ring-0 focus:outline-hidden"
                            />
                            <span className="text-[9px] text-rose-600 font-semibold">(-5 ea)</span>
                          </div>
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
                    disabled={submitting || availableLeagues.length === 0}
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

      {/* Rules Modal */}
      <LudoRulesModal
        isOpen={showRulesModal}
        onClose={() => setShowRulesModal(false)}
      />
    </>
  );
};
