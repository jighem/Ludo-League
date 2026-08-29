import React, { useState, useEffect, useRef, useMemo } from 'react';
import confetti from 'canvas-confetti';
import {
  LudoColor,
  LudoPlayer,
  LudoToken,
  canTokenMove,
  getMovableTokens,
  COLOR_CONFIG,
  COLOR_START_INDICES,
  isTrackIndexSafe
} from '../utils/ludoEngine';
import { ludoAudio } from '../utils/ludoAudio';
import { LudoBoard } from '../components/ludo/LudoBoard';
import { LudoDice } from '../components/ludo/LudoDice';
import { LudoRulesModal } from '../components/ludo/LudoRulesModal';
import { DiceFairnessModal } from '../components/ludo/DiceFairnessModal';
import { rollFairDice } from '../utils/diceEngine';
import { useLeague } from '../context/LeagueContext';
import { useAuth } from '../context/AuthContext';
import { Player, ScoringRule } from '../types';
import { apiRequest } from '../api/client';
import {
  saveActiveLudoSession,
  loadActiveLudoSession,
  clearActiveLudoSession,
  queuePendingMatch,
  getPendingMatches,
  syncPendingMatches,
  isBrowserOnline,
  initNetworkAutoSync,
  LudoSavedSession
} from '../utils/ludoOfflineSync';
import {
  Trophy,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  Crown,
  Bot,
  User,
  Users,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Flame,
  Gamepad2,
  Sparkles,
  Info,
  LogIn,
  Lock,
  BookOpen,
  HelpCircle,
  Swords,
  Shield,
  Dice5,
  Zap,
  Target,
  Wifi,
  WifiOff,
  RefreshCw,
  Cloud,
  HardDrive
} from 'lucide-react';

type GameMode = 'classic' | 'quick'; // Classic = 4 tokens home, Quick = 1 token home

export const PlayLudoPage: React.FC<{
  onNavigateTab?: (tab: string) => void;
  onOpenNewMatch?: () => void;
  onOpenLogin?: () => void;
}> = ({ onNavigateTab, onOpenLogin }) => {
  const { user } = useAuth();
  const { leagues, activeLeagueId, setActiveLeagueId, triggerDataRefresh } = useLeague();

  // League Roster Players & Scoring
  const [rosterPlayers, setRosterPlayers] = useState<Player[]>([]);
  const [scoringRules, setScoringRules] = useState<Record<number, Record<number, number>>>({
    4: { 1: 50, 2: 30, 3: 20, 4: 0 },
    3: { 1: 62.5, 2: 37.5, 3: 0, 4: 0 },
    2: { 1: 100, 2: 0, 3: 0, 4: 0 }
  });

  // Game Setup State
  const [gameState, setGameState] = useState<'setup' | 'playing' | 'gameover'>('setup');
  const [gameMode, setGameMode] = useState<GameMode>('classic');
  const [playerCount, setPlayerCount] = useState<2 | 3 | 4>(4);
  const [targetLeagueId, setTargetLeagueId] = useState<number>(activeLeagueId || 1);
  const [isMuted, setIsMuted] = useState<boolean>(ludoAudio.getMuted());

  // Player Seat Assignments
  const [seatConfig, setSeatConfig] = useState<Record<LudoColor, {
    type: 'player' | 'bot' | 'guest';
    playerId: string;
    guestName: string;
  }>>({
    red: { type: 'player', playerId: '', guestName: 'Player 1' },
    green: { type: 'bot', playerId: '', guestName: 'Bot Green' },
    yellow: { type: 'bot', playerId: '', guestName: 'Bot Yellow' },
    blue: { type: 'bot', playerId: '', guestName: 'Bot Blue' }
  });

  // Live Game Board State
  const [players, setPlayers] = useState<LudoPlayer[]>([]);
  const [turnColor, setTurnColor] = useState<LudoColor>('red');
  const [diceValue, setDiceValue] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState<boolean>(false);
  const [waitingForMove, setWaitingForMove] = useState<boolean>(false);
  const [walkingTokenKey, setWalkingTokenKey] = useState<string | null>(null);
  const [gameLogs, setGameLogs] = useState<string[]>([]);
  const [activeTurnNotice, setActiveTurnNotice] = useState<string>('Game started! Red rolls first.');

  // Game End & League Auto-Record State
  const [rankings, setRankings] = useState<Array<{ rank: number; player: LudoPlayer }>>([]);
  const [isSubmittingMatch, setIsSubmittingMatch] = useState<boolean>(false);
  const [matchSubmittedSuccess, setMatchSubmittedSuccess] = useState<{ friendlyId: string } | null>(null);
  const [submissionError, setSubmissionError] = useState<string>('');
  const [showRulesModal, setShowRulesModal] = useState<boolean>(false);
  const [showOnPageRules, setShowOnPageRules] = useState<boolean>(true);
  const [showDiceDiagnostics, setShowDiceDiagnostics] = useState<boolean>(false);

  // Offline & Auto-Recovery State
  const [isOnline, setIsOnline] = useState<boolean>(() => isBrowserOnline());
  const [pendingOfflineCount, setPendingOfflineCount] = useState<number>(() => getPendingMatches().length);
  const [isSyncingOffline, setIsSyncingOffline] = useState<boolean>(false);
  const [resumedFromCache, setResumedFromCache] = useState<boolean>(false);

  // Dedicated independent timers to prevent cross-cancellation
  const botRollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const botMoveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const turnTransitionTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Single-roll atomic result storage (separates Dice Engine from Rules Engine)
  const pendingRollValueRef = useRef<number | null>(null);

  // Synchronized state refs to eliminate React closure stale state issues
  const playersRef = useRef<LudoPlayer[]>(players);
  const turnColorRef = useRef<LudoColor>(turnColor);
  const isRollingRef = useRef<boolean>(isRolling);
  const waitingForMoveRef = useRef<boolean>(waitingForMove);
  const walkingTokenKeyRef = useRef<string | null>(walkingTokenKey);
  const diceValueRef = useRef<number | null>(diceValue);
  const gameStateRef = useRef<'setup' | 'playing' | 'gameover'>(gameState);

  useEffect(() => { playersRef.current = players; }, [players]);
  useEffect(() => { turnColorRef.current = turnColor; }, [turnColor]);
  useEffect(() => { isRollingRef.current = isRolling; }, [isRolling]);
  useEffect(() => { waitingForMoveRef.current = waitingForMove; }, [waitingForMove]);
  useEffect(() => { walkingTokenKeyRef.current = walkingTokenKey; }, [walkingTokenKey]);
  useEffect(() => { diceValueRef.current = diceValue; }, [diceValue]);
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);

  // Clear all pending timeouts
  const clearAllTimers = () => {
    if (botRollTimerRef.current) {
      clearTimeout(botRollTimerRef.current);
      botRollTimerRef.current = null;
    }
    if (botMoveTimerRef.current) {
      clearTimeout(botMoveTimerRef.current);
      botMoveTimerRef.current = null;
    }
    if (turnTransitionTimerRef.current) {
      clearTimeout(turnTransitionTimerRef.current);
      turnTransitionTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      clearAllTimers();
    };
  }, []);

  // Attempt auto-recovery of in-progress match from offline cache on mount
  useEffect(() => {
    try {
      const saved = loadActiveLudoSession();
      if (saved && saved.gameState === 'playing' && saved.players && saved.players.length > 0) {
        setGameMode(saved.gameMode || 'classic');
        setPlayerCount(saved.playerCount || 4);
        if (saved.targetLeagueId) setTargetLeagueId(saved.targetLeagueId);
        if (saved.seatConfig) setSeatConfig(saved.seatConfig);
        setPlayers(saved.players);
        playersRef.current = saved.players;
        setTurnColor(saved.turnColor);
        turnColorRef.current = saved.turnColor;
        setDiceValue(saved.diceValue);
        diceValueRef.current = saved.diceValue;
        setWaitingForMove(saved.waitingForMove);
        waitingForMoveRef.current = saved.waitingForMove;
        setGameLogs(saved.gameLogs || ['Match automatically resumed from cache.']);
        setActiveTurnNotice(saved.activeTurnNotice || 'Match resumed from offline storage.');
        setRankings(saved.rankings || []);
        setGameState('playing');
        gameStateRef.current = 'playing';
        setResumedFromCache(true);
      }
    } catch (e) {
      console.warn('Could not restore session:', e);
    }

    const handleNetworkChange = () => {
      setIsOnline(isBrowserOnline());
      setPendingOfflineCount(getPendingMatches().length);
    };

    window.addEventListener('online', handleNetworkChange);
    window.addEventListener('offline', handleNetworkChange);

    const unsubSync = initNetworkAutoSync(() => {
      setPendingOfflineCount(getPendingMatches().length);
      triggerDataRefresh();
    });

    return () => {
      window.removeEventListener('online', handleNetworkChange);
      window.removeEventListener('offline', handleNetworkChange);
      unsubSync();
    };
  }, []);

  // Continuous Offline Auto-Save on every single game state change
  useEffect(() => {
    if (gameState === 'playing' && players.length > 0) {
      saveActiveLudoSession({
        id: 'session_active',
        gameMode,
        playerCount,
        targetLeagueId,
        seatConfig,
        players,
        turnColor,
        diceValue,
        waitingForMove,
        gameLogs,
        activeTurnNotice,
        rankings,
        gameState
      });
    }
  }, [
    players,
    turnColor,
    diceValue,
    waitingForMove,
    gameLogs,
    activeTurnNotice,
    rankings,
    gameState,
    gameMode,
    playerCount,
    targetLeagueId,
    seatConfig
  ]);

  // Fetch registered roster players on mount
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const pRes = await apiRequest<{ players: Player[] }>('/players?status=active');
        setRosterPlayers(pRes.players);

        if (pRes.players.length > 0) {
          // Pre-populate human seats with first few players
          setSeatConfig((prev) => ({
            ...prev,
            red: { ...prev.red, playerId: String(pRes.players[0].id) },
            green: { ...prev.green, playerId: pRes.players[1] ? String(pRes.players[1].id) : '' },
            yellow: { ...prev.yellow, playerId: pRes.players[2] ? String(pRes.players[2].id) : '' },
            blue: { ...prev.blue, playerId: pRes.players[3] ? String(pRes.players[3].id) : '' }
          }));
        }

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
        console.error('Failed to load initial players for Ludo game:', err);
      }
    };
    loadInitialData();
  }, []);

  // Update targetLeagueId if activeLeagueId changes
  useEffect(() => {
    if (activeLeagueId) {
      setTargetLeagueId(activeLeagueId);
    }
  }, [activeLeagueId]);

  // Audio mute toggle helper
  const handleToggleSound = () => {
    const muted = ludoAudio.toggleMute();
    setIsMuted(muted);
  };

  // Determine active colors based on player count
  const activeColors: LudoColor[] = useMemo(() => {
    if (playerCount === 2) return ['red', 'yellow'];
    if (playerCount === 3) return ['red', 'green', 'yellow'];
    return ['red', 'green', 'yellow', 'blue'];
  }, [playerCount]);

  // Validation to ensure all active human seats have valid, non-duplicate players
  const setupValidation = useMemo(() => {
    const errors: string[] = [];
    const usedPlayerIds: Record<string, LudoColor[]> = {};

    activeColors.forEach((color) => {
      const cfg = seatConfig[color];
      if (cfg.type === 'player') {
        if (!cfg.playerId) {
          errors.push(`Please choose a player for ${COLOR_CONFIG[color].name} seat.`);
        } else {
          if (!usedPlayerIds[cfg.playerId]) {
            usedPlayerIds[cfg.playerId] = [];
          }
          usedPlayerIds[cfg.playerId].push(color);
        }
      } else if (cfg.type === 'guest') {
        if (!cfg.guestName.trim()) {
          errors.push(`Please enter a name for the guest in ${COLOR_CONFIG[color].name} seat.`);
        }
      }
    });

    // Check for duplicates
    Object.entries(usedPlayerIds).forEach(([pId, colors]) => {
      if (colors.length > 1) {
        const found = rosterPlayers.find((p) => String(p.id) === pId);
        const pName = found?.full_name || 'Player';
        const colorNames = colors.map((c) => COLOR_CONFIG[c].name).join(' and ');
        errors.push(`Duplicate player: "${pName}" is selected for both ${colorNames} seats. Each seat must have a unique player.`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }, [activeColors, seatConfig, rosterPlayers]);

  // Handle switching seat type (player, bot, guest)
  const handleSeatTypeChange = (color: LudoColor, newType: 'player' | 'bot' | 'guest') => {
    setSeatConfig((prev) => {
      let newPlayerId = prev[color].playerId;

      if (newType === 'player') {
        // Collect player IDs already assigned to other active human seats
        const assignedOtherIds = new Set(
          activeColors
            .filter((c) => c !== color && prev[c].type === 'player' && prev[c].playerId)
            .map((c) => prev[c].playerId)
        );

        // If current playerId is empty or already in use elsewhere, assign first available unique player
        if (!newPlayerId || assignedOtherIds.has(newPlayerId)) {
          const available = rosterPlayers.find((p) => !assignedOtherIds.has(String(p.id)));
          newPlayerId = available ? String(available.id) : '';
        }
      }

      return {
        ...prev,
        [color]: {
          ...prev[color],
          type: newType,
          playerId: newPlayerId
        }
      };
    });
  };

  // Handle selecting player from dropdown for a seat
  const handleSeatPlayerChange = (color: LudoColor, newPlayerId: string) => {
    setSeatConfig((prev) => {
      const updated = { ...prev };

      // If another active seat was holding this player, reassign or clear that seat to prevent duplicate
      activeColors.forEach((otherColor) => {
        if (otherColor !== color && updated[otherColor].type === 'player' && updated[otherColor].playerId === newPlayerId) {
          const usedIds = new Set(
            activeColors
              .filter((c) => c !== otherColor)
              .map((c) => (c === color ? newPlayerId : updated[c].playerId))
              .filter(Boolean)
          );
          const replacement = rosterPlayers.find((p) => !usedIds.has(String(p.id)));
          updated[otherColor] = {
            ...updated[otherColor],
            playerId: replacement ? String(replacement.id) : ''
          };
        }
      });

      updated[color] = {
        ...updated[color],
        playerId: newPlayerId
      };

      return updated;
    });
  };

  // Start new Game
  const handleStartGame = () => {
    if (!user) {
      if (onOpenLogin) onOpenLogin();
      return;
    }
    if (!setupValidation.isValid) return;
    clearAllTimers();

    const initialPlayers: LudoPlayer[] = activeColors.map((color) => {
      const cfg = seatConfig[color];
      let displayName = cfg.guestName;
      let leaguePlayerId: number | undefined;

      if (cfg.type === 'player' && cfg.playerId) {
        const found = rosterPlayers.find((p) => String(p.id) === cfg.playerId);
        if (found) {
          displayName = found.full_name;
          leaguePlayerId = found.id;
        }
      } else if (cfg.type === 'bot') {
        displayName = `Bot ${COLOR_CONFIG[color].name}`;
      }

      const tokens: LudoToken[] = [0, 1, 2, 3].map((id) => ({
        id,
        color,
        step: -1,
        hasWon: false
      }));

      return {
        id: `player-${color}`,
        color,
        name: displayName || COLOR_CONFIG[color].name,
        leaguePlayerId,
        isBot: cfg.type === 'bot',
        tokens,
        hasFinished: false,
        consecutiveSixes: 0,
        kills: 0,
        deaths: 0
      };
    });

    const firstColor = activeColors[0];
    setPlayers(initialPlayers);
    playersRef.current = initialPlayers;
    setTurnColor(firstColor);
    turnColorRef.current = firstColor;
    setDiceValue(null);
    diceValueRef.current = null;
    setIsRolling(false);
    isRollingRef.current = false;
    setWaitingForMove(false);
    waitingForMoveRef.current = false;
    setRankings([]);
    setMatchSubmittedSuccess(null);
    setSubmissionError('');
    setGameLogs([`Match began in ${gameMode === 'classic' ? 'Classic' : 'Quick'} mode!`]);
    setActiveTurnNotice(`${initialPlayers[0].name} (${COLOR_CONFIG[initialPlayers[0].color].name})'s turn to roll.`);
    setGameState('playing');
    gameStateRef.current = 'playing';

    ludoAudio.playTurnAlert();

    if (initialPlayers[0].isBot) {
      botRollTimerRef.current = setTimeout(() => {
        handleRollDice(firstColor);
      }, 850);
    }
  };

  // Turn rotation helper to find next active unfinished player
  const getNextTurnColor = (current: LudoColor, currentPlayers: LudoPlayer[]): LudoColor | null => {
    const unfinished = currentPlayers.filter((p) => !p.hasFinished);
    if (unfinished.length <= 1) return null; // Game Over

    const colors = activeColors;
    const curIdx = colors.indexOf(current);
    if (curIdx === -1) return colors[0];

    for (let i = 1; i <= colors.length; i++) {
      const nextColor = colors[(curIdx + i) % colors.length];
      const targetPlayer = currentPlayers.find((p) => p.color === nextColor);
      if (targetPlayer && !targetPlayer.hasFinished) {
        return nextColor;
      }
    }
    return null;
  };

  // Add event to live log
  const logEvent = (msg: string) => {
    setGameLogs((prev) => [msg, ...prev.slice(0, 20)]);
  };

  // Helper sleep for animations
  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  // Roll Dice Action - Strictly Fair & Unbiased Generation
  const handleRollDice = (targetColor?: LudoColor | unknown) => {
    // 1. Strict atomic lock against double-clicks, rapid tapping, and race conditions
    if (
      isRollingRef.current ||
      waitingForMoveRef.current ||
      walkingTokenKeyRef.current ||
      gameStateRef.current !== 'playing'
    ) {
      return;
    }

    const validColor =
      typeof targetColor === 'string' && ['red', 'green', 'yellow', 'blue'].includes(targetColor)
        ? (targetColor as LudoColor)
        : turnColorRef.current;

    const currentPlayer = playersRef.current.find((p) => p.color === validColor);
    if (!currentPlayer || currentPlayer.hasFinished) return;

    clearAllTimers();

    // 2. Sequence Step 1: Generate fair random result ONCE via Centralized Dice Engine
    const generatedRoll = rollFairDice();
    pendingRollValueRef.current = generatedRoll;

    // 3. Sequence Step 2: Lock state and trigger visual animation
    setIsRolling(true);
    isRollingRef.current = true;
    setWaitingForMove(false);
    waitingForMoveRef.current = false;
    ludoAudio.playDiceRoll();

    // 4. Sequence Step 3: Play fixed duration visual animation (650ms)
    setTimeout(() => {
      if (gameStateRef.current !== 'playing') return;

      // 5. Sequence Step 4: Display the already-generated stored result
      const rolled = pendingRollValueRef.current ?? generatedRoll;
      pendingRollValueRef.current = null;
      setDiceValue(rolled);
      diceValueRef.current = rolled;
      setIsRolling(false);
      isRollingRef.current = false;

      // 6. Sequence Step 5: Ludo Rules Engine processes rules based on the rolled value
      // Check 4 consecutive sixes rule
      let newConsecutiveSixes = rolled === 6 ? currentPlayer.consecutiveSixes + 1 : 0;
      if (newConsecutiveSixes === 4) {
        logEvent(`⚠️ ${currentPlayer.name} rolled four 6s in a row! Turn skipped.`);
        setActiveTurnNotice(`Four consecutive 6s! Turn forfeited.`);
        
        // Reset player consecutive sixes and pass turn
        const updatedPlayers = playersRef.current.map((p) =>
          p.color === validColor ? { ...p, consecutiveSixes: 0 } : p
        );
        setPlayers(updatedPlayers);
        playersRef.current = updatedPlayers;

        turnTransitionTimerRef.current = setTimeout(() => {
          advanceToNextTurn(validColor, updatedPlayers);
        }, 1200);
        return;
      }

      // Update consecutive count on player
      const updatedPlayers = playersRef.current.map((p) =>
        p.color === validColor ? { ...p, consecutiveSixes: newConsecutiveSixes } : p
      );
      setPlayers(updatedPlayers);
      playersRef.current = updatedPlayers;

      const updatedCurrentPlayer = updatedPlayers.find((p) => p.color === validColor)!;
      const legalMoves = getMovableTokens(updatedCurrentPlayer, rolled);

      if (legalMoves.length === 0) {
        logEvent(`${updatedCurrentPlayer.name} rolled a ${rolled}. No legal moves.`);
        setActiveTurnNotice(`${updatedCurrentPlayer.name} rolled ${rolled}. No moves available.`);

        turnTransitionTimerRef.current = setTimeout(() => {
          advanceToNextTurn(validColor, updatedPlayers);
        }, 1000);
      } else if (updatedCurrentPlayer.isBot) {
        // Bot plays automatically
        setWaitingForMove(true);
        waitingForMoveRef.current = true;
        setActiveTurnNotice(`Bot ${COLOR_CONFIG[updatedCurrentPlayer.color].name} is thinking...`);
        botMoveTimerRef.current = setTimeout(() => {
          handleBotMove(updatedCurrentPlayer, rolled, legalMoves, updatedPlayers);
        }, 750);
      } else if (legalMoves.length === 1) {
        // Auto-move single legal option for human player for smooth flow
        logEvent(`${updatedCurrentPlayer.name} rolled a ${rolled}. Auto-moving Token ${legalMoves[0].id + 1}.`);
        setActiveTurnNotice(`${updatedCurrentPlayer.name} moving Token ${legalMoves[0].id + 1}...`);
        setTimeout(() => {
          executeMove(legalMoves[0], rolled, updatedPlayers);
        }, 400);
      } else {
        // Human player has multiple choices
        setWaitingForMove(true);
        waitingForMoveRef.current = true;
        setActiveTurnNotice(`${updatedCurrentPlayer.name}: Tap a glowing token to move ${rolled} step${rolled > 1 ? 's' : ''}!`);
      }
    }, 650);
  };

  // Bot AI intelligent token selection
  const handleBotMove = (
    botPlayer: LudoPlayer,
    rolled: number,
    legalMoves: LudoToken[],
    currentPlayers: LudoPlayer[]
  ) => {
    clearAllTimers();

    if (legalMoves.length === 0) {
      advanceToNextTurn(botPlayer.color, currentPlayers);
      return;
    }

    // 1. Priority: Can capture an opponent?
    for (const token of legalMoves) {
      if (token.step !== -1) {
        const nextStep = token.step + rolled;
        if (nextStep <= 50) {
          const startIdx = COLOR_START_INDICES[botPlayer.color];
          const targetTrackIdx = (startIdx + nextStep) % 52;
          if (!isTrackIndexSafe(targetTrackIdx)) {
            const hasOpponent = currentPlayers.some(
              (p) =>
                p.color !== botPlayer.color &&
                p.tokens.some((ot) => {
                  if (ot.step === -1 || ot.step > 50) return false;
                  const otTrackIdx = (COLOR_START_INDICES[ot.color] + ot.step) % 52;
                  return otTrackIdx === targetTrackIdx;
                })
            );
            if (hasOpponent) {
              executeMove(token, rolled, currentPlayers);
              return;
            }
          }
        }
      }
    }

    // 2. Priority: Bring token home (step 56)
    const homeMove = legalMoves.find((t) => t.step + rolled === 56);
    if (homeMove) {
      executeMove(homeMove, rolled, currentPlayers);
      return;
    }

    // 3. Priority: Unlock new token with 6 if base has tokens
    if (rolled === 6) {
      const baseToken = legalMoves.find((t) => t.step === -1);
      if (baseToken) {
        executeMove(baseToken, rolled, currentPlayers);
        return;
      }
    }

    // 4. Default: Move furthest advanced token
    const sorted = [...legalMoves].sort((a, b) => b.step - a.step);
    executeMove(sorted[0], rolled, currentPlayers);
  };

  // Execute token move, step-by-step grid walking, handle captures, check win conditions, and bonus turns
  const executeMove = async (
    tokenToMove: LudoToken,
    steps: number,
    currentPlayers: LudoPlayer[]
  ) => {
    clearAllTimers();
    setWaitingForMove(false);
    waitingForMoveRef.current = false;

    const player = currentPlayers.find((p) => p.color === tokenToMove.color);
    if (!player || !canTokenMove(tokenToMove, steps)) return;

    const tokenKey = `${tokenToMove.color}-${tokenToMove.id}`;
    setWalkingTokenKey(tokenKey);
    walkingTokenKeyRef.current = tokenKey;

    let currentStep = tokenToMove.step;
    let didReachHome = false;
    let didCapture = false;

    if (currentStep === -1) {
      // Releasing token from base/yard onto start cell (step 0)
      currentStep = 0;
      ludoAudio.playTokenOut();
      logEvent(`🚀 ${player.name} released Token ${tokenToMove.id + 1} onto the track!`);

      const updated = playersRef.current.map((p) =>
        p.color === player.color
          ? {
              ...p,
              tokens: p.tokens.map((t) =>
                t.id === tokenToMove.id ? { ...t, step: 0 } : t
              )
            }
          : p
      );
      setPlayers(updated);
      playersRef.current = updated;

      await sleep(260);
    } else {
      // Walk on grid step-by-step along the track and home stretch
      logEvent(`🚶 ${player.name} moving Token ${tokenToMove.id + 1} (${steps} steps)...`);

      for (let i = 1; i <= steps; i++) {
        if (gameStateRef.current !== 'playing') {
          setWalkingTokenKey(null);
          walkingTokenKeyRef.current = null;
          return;
        }

        currentStep += 1;
        ludoAudio.playPawnHop();

        const updated = playersRef.current.map((p) =>
          p.color === player.color
            ? {
                ...p,
                tokens: p.tokens.map((t) =>
                  t.id === tokenToMove.id
                    ? { ...t, step: currentStep, hasWon: currentStep === 56 }
                    : t
                )
              }
            : p
        );
        setPlayers(updated);
        playersRef.current = updated;

        // Give each single grid step time to animate its hop
        await sleep(170);
      }
    }

    setWalkingTokenKey(null);
    walkingTokenKeyRef.current = null;

    const finalStep = currentStep;
    if (finalStep === 56) {
      didReachHome = true;
      ludoAudio.playHomeIn();
      logEvent(`🎯 Token ${tokenToMove.id + 1} reached HOME for ${player.name}!`);
    }

    let updatedPlayers = playersRef.current;

    // Check Capture on outer track (steps 0..50)
    if (finalStep >= 0 && finalStep <= 50) {
      const playerStartIdx = COLOR_START_INDICES[player.color];
      const landingTrackIdx = (playerStartIdx + finalStep) % 52;

      if (!isTrackIndexSafe(landingTrackIdx)) {
        // Look for opponent pawns on this track index
        let totalCapturedTokens = 0;

        updatedPlayers = updatedPlayers.map((otherPlayer) => {
          if (otherPlayer.color === player.color) return otherPlayer;

          const otherStartIdx = COLOR_START_INDICES[otherPlayer.color];
          let victimsCount = 0;
          const capturedTokens = otherPlayer.tokens.map((ot) => {
            if (ot.step >= 0 && ot.step <= 50) {
              const otTrackIdx = (otherStartIdx + ot.step) % 52;
              if (otTrackIdx === landingTrackIdx) {
                didCapture = true;
                victimsCount++;
                totalCapturedTokens++;
                logEvent(`💥 ${player.name} knocked out ${otherPlayer.name}'s token! (+5 pts / -5 pts)`);
                return { ...ot, step: -1 }; // Sent back to yard
              }
            }
            return ot;
          });

          if (victimsCount > 0) {
            return {
              ...otherPlayer,
              tokens: capturedTokens,
              deaths: (otherPlayer.deaths || 0) + victimsCount
            };
          }

          return { ...otherPlayer, tokens: capturedTokens };
        });

        if (didCapture && totalCapturedTokens > 0) {
          ludoAudio.playCapture();
          // Update attacker's kills
          updatedPlayers = updatedPlayers.map((p) => {
            if (p.color === player.color) {
              return {
                ...p,
                kills: (p.kills || 0) + totalCapturedTokens
              };
            }
            return p;
          });
        }
      }
    }

    // Check if player has finished the game
    const updatedCurrentPlayer = updatedPlayers.find((p) => p.color === player.color)!;
    const tokensHome = updatedCurrentPlayer.tokens.filter((t) => t.hasWon || t.step === 56).length;
    const isFinished =
      gameMode === 'classic'
        ? tokensHome === 4
        : tokensHome >= 1; // Quick mode

    if (isFinished && !player.hasFinished) {
      const nextRank = rankings.length + 1;
      const finishedPlayer = { ...updatedCurrentPlayer, hasFinished: true, rank: nextRank };
      
      updatedPlayers = updatedPlayers.map((p) =>
        p.color === player.color ? finishedPlayer : p
      );

      let newRankings = [...rankings, { rank: nextRank, player: finishedPlayer }];
      logEvent(`🏆 ${player.name} FINISHED in Rank ${nextRank}!`);
      
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
      ludoAudio.playVictory();

      // Check if Game Over (either quick mode finished or 1 or fewer players unfinished in classic mode)
      const remainingUnfinished = updatedPlayers.filter((p) => !p.hasFinished);
      const isGameOver = (gameMode === 'quick' && nextRank >= 1) || remainingUnfinished.length <= 1;

      if (isGameOver) {
        // Sort remaining unfinished players by:
        // 1. Tokens reached home (descending)
        // 2. Furthest token progress steps sum (descending)
        // 3. Number of kills (descending)
        const sortedRemaining = [...remainingUnfinished].sort((a, b) => {
          const aHome = a.tokens.filter((t) => t.hasWon || t.step === 56).length;
          const bHome = b.tokens.filter((t) => t.hasWon || t.step === 56).length;
          if (bHome !== aHome) return bHome - aHome;

          const aSteps = a.tokens.reduce((acc, t) => acc + (t.step >= 0 ? t.step : 0), 0);
          const bSteps = b.tokens.reduce((acc, t) => acc + (t.step >= 0 ? t.step : 0), 0);
          if (bSteps !== aSteps) return bSteps - aSteps;

          return (b.kills || 0) - (a.kills || 0);
        });

        // Assign ranks to all remaining unfinished players
        sortedRemaining.forEach((remPlayer) => {
          const assignedRank = newRankings.length + 1;
          const finalizedPlayer = {
            ...remPlayer,
            hasFinished: true,
            rank: assignedRank
          };
          newRankings.push({ rank: assignedRank, player: finalizedPlayer });
          updatedPlayers = updatedPlayers.map((p) =>
            p.color === finalizedPlayer.color ? finalizedPlayer : p
          );
        });

        setRankings(newRankings);
        setPlayers(updatedPlayers);
        playersRef.current = updatedPlayers;
        setGameState('gameover');
        gameStateRef.current = 'gameover';
        confetti({
          particleCount: 150,
          spread: 100,
          origin: { y: 0.5 }
        });
        return;
      }

      setRankings(newRankings);
    }

    setPlayers(updatedPlayers);
    playersRef.current = updatedPlayers;

    // Bonus Turn Logic: (Rolled 6 OR Captured Opponent OR Reached Home)
    const hasBonusTurn = (steps === 6 || didCapture || didReachHome) && !isFinished;

    if (hasBonusTurn) {
      setActiveTurnNotice(`Bonus Roll for ${player.name}! 🎲`);
      setDiceValue(null);
      diceValueRef.current = null;
      setWaitingForMove(false);
      waitingForMoveRef.current = false;

      if (player.isBot) {
        botRollTimerRef.current = setTimeout(() => {
          handleRollDice(player.color);
        }, 800);
      }
    } else {
      turnTransitionTimerRef.current = setTimeout(() => {
        advanceToNextTurn(player.color, updatedPlayers);
      }, 700);
    }
  };

  // Advance turn to next unfinished player
  const advanceToNextTurn = (fromColor: LudoColor, currentPlayers: LudoPlayer[]) => {
    clearAllTimers();

    // Reset consecutive sixes for departing player
    const cleanedPlayers = currentPlayers.map((p) =>
      p.color === fromColor ? { ...p, consecutiveSixes: 0 } : p
    );

    const nextColor = getNextTurnColor(fromColor, cleanedPlayers);
    if (!nextColor) {
      setPlayers(cleanedPlayers);
      playersRef.current = cleanedPlayers;
      setGameState('gameover');
      gameStateRef.current = 'gameover';
      return;
    }

    setPlayers(cleanedPlayers);
    playersRef.current = cleanedPlayers;
    setTurnColor(nextColor);
    turnColorRef.current = nextColor;
    setDiceValue(null);
    diceValueRef.current = null;
    setIsRolling(false);
    isRollingRef.current = false;
    setWaitingForMove(false);
    waitingForMoveRef.current = false;

    const nextPlayer = cleanedPlayers.find((p) => p.color === nextColor)!;
    setActiveTurnNotice(`${nextPlayer.name}'s turn (${COLOR_CONFIG[nextPlayer.color].name})`);
    ludoAudio.playTurnAlert();

    // If next player is Bot, trigger auto roll
    if (nextPlayer.isBot) {
      botRollTimerRef.current = setTimeout(() => {
        handleRollDice(nextColor);
      }, 850);
    }
  };

  // Auto-recovery watcher for bot turns: ensure bot never stays idle
  useEffect(() => {
    if (gameState === 'playing' && !isRolling && !waitingForMove && diceValue === null) {
      const cur = players.find((p) => p.color === turnColor);
      if (cur && cur.isBot && !cur.hasFinished) {
        if (!botRollTimerRef.current) {
          botRollTimerRef.current = setTimeout(() => {
            botRollTimerRef.current = null;
            handleRollDice(turnColor);
          }, 850);
        }
      }
    }
  }, [turnColor, gameState, isRolling, waitingForMove, diceValue, players]);

  // Direct Match Submission to League Master (with offline outbox fallback)
  const handleSaveToLeagueMaster = async () => {
    if (rankings.length === 0 || isSubmittingMatch) return;

    try {
      setIsSubmittingMatch(true);
      setSubmissionError('');

      const now = new Date();
      const matchDate = now.toISOString().split('T')[0];
      const matchTime = now.toTimeString().split(' ')[0].substring(0, 5);

      // Build results array
      const results = rankings.map((item) => {
        let pId = item.player.leaguePlayerId;
        if (!pId) {
          // If bot or guest, fallback to first available or create guest entry
          pId = rosterPlayers[0]?.id || 1;
        }
        return {
          position: item.rank,
          player_id: pId,
          kills: item.player.kills || 0,
          deaths: item.player.deaths || 0
        };
      });

      const matchPayload = {
        match_date: matchDate,
        match_time: matchTime,
        player_count: playerCount,
        league_id: targetLeagueId,
        notes: `Ludo Play Match (${gameMode === 'classic' ? 'Classic' : 'Quick'} Mode)`,
        results
      };

      // If browser is currently offline, queue immediately into offline cache
      if (!isBrowserOnline()) {
        queuePendingMatch(matchPayload);
        clearActiveLudoSession();
        setPendingOfflineCount(getPendingMatches().length);
        setMatchSubmittedSuccess({ friendlyId: 'OFFLINE-QUEUED (Auto-syncs on reconnect)' });
        return;
      }

      try {
        const res = await apiRequest<{ friendlyId: string }>('/matches', {
          method: 'POST',
          body: JSON.stringify(matchPayload)
        });

        clearActiveLudoSession();
        setMatchSubmittedSuccess({ friendlyId: res.friendlyId });
        triggerDataRefresh();
      } catch (networkErr: any) {
        console.warn('Network issue during match save, storing offline locally:', networkErr);
        // Fallback gracefully so the match result is NEVER lost
        queuePendingMatch(matchPayload);
        clearActiveLudoSession();
        setPendingOfflineCount(getPendingMatches().length);
        setMatchSubmittedSuccess({ friendlyId: 'OFFLINE-QUEUED (Auto-syncs on reconnect)' });
      }
    } catch (err: any) {
      console.error('Failed to submit Ludo match:', err);
      setSubmissionError(err.message || 'Failed to submit match to league.');
    } finally {
      setIsSubmittingMatch(false);
    }
  };

  // Manual trigger to sync pending offline matches
  const handleManualSyncOffline = async () => {
    if (isSyncingOffline) return;
    try {
      setIsSyncingOffline(true);
      const res = await syncPendingMatches(() => {
        triggerDataRefresh();
      });
      setPendingOfflineCount(getPendingMatches().length);
      if (res.synced > 0) {
        logEvent(`☁️ Auto-synced ${res.synced} offline match(es) to League Master!`);
      }
    } catch (err) {
      console.error('Error syncing offline matches:', err);
    } finally {
      setIsSyncingOffline(false);
    }
  };

  const currentPoints = scoringRules[playerCount] || { 1: 50, 2: 30, 3: 20, 4: 0 };
  const currentActivePlayer = players.find((p) => p.color === turnColor);
  const targetLeague = leagues.find((l) => l.id === targetLeagueId);

  // ================= RENDER =================

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-amber-500 via-orange-600 to-amber-700 rounded-3xl p-5 sm:p-6 text-zinc-950 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-zinc-950/90 text-amber-400 p-2 border border-amber-300 flex items-center justify-center shadow-lg">
              <Gamepad2 className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white drop-shadow-xs">
                  Play Ludo King
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-zinc-950 text-amber-400 text-[10px] font-black uppercase tracking-wider">
                  Live Board
                </span>
              </div>
              <p className="text-xs sm:text-sm font-bold text-amber-100 mt-0.5">
                Play on the interactive board with offline-proof auto-saving & sync directly into {targetLeague?.name || 'League Master'}.
              </p>
            </div>
          </div>

          {/* Sound & Controls & Offline Status */}
          <div className="flex items-center space-x-2 flex-wrap gap-y-2">
            {/* Offline / Online Real-Time Status Pill */}
            {!isOnline ? (
              <div
                className="px-3 py-2 rounded-2xl bg-zinc-950/85 text-amber-300 border border-amber-400/40 shadow-md flex items-center gap-1.5 text-xs font-bold"
                title="Internet connection is broken, but the game is 100% running locally and auto-saved!"
              >
                <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="hidden sm:inline">Offline Mode (Auto-Saved)</span>
                <span className="sm:hidden">Offline Safe</span>
              </div>
            ) : pendingOfflineCount > 0 ? (
              <button
                id="btn-sync-offline-matches"
                onClick={handleManualSyncOffline}
                disabled={isSyncingOffline}
                className="px-3 py-2 rounded-2xl bg-blue-950/90 hover:bg-blue-900 text-blue-300 border border-blue-400/50 shadow-md flex items-center gap-1.5 text-xs font-bold cursor-pointer transition-all"
                title="Click to sync locally stored offline matches to the leaderboard"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${isSyncingOffline ? 'animate-spin' : ''}`} />
                <span>Sync ({pendingOfflineCount}) Offline</span>
              </button>
            ) : (
              <div
                className="px-3 py-2 rounded-2xl bg-zinc-950/70 text-emerald-300 border border-emerald-400/30 shadow-xs flex items-center gap-1.5 text-xs font-bold"
                title="Connected to cloud with continuous local backup"
              >
                <Cloud className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="hidden sm:inline">Offline-Protected</span>
                <span className="sm:hidden">Protected</span>
              </div>
            )}

            <button
              id="btn-open-ludo-rules"
              onClick={() => setShowRulesModal(true)}
              className="px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-2xl bg-zinc-950/80 hover:bg-zinc-950 text-amber-300 border border-amber-300/40 shadow-md transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold"
              title="View Official Rules & Scoring Guide"
            >
              <BookOpen className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Rules & Scoring</span>
              <span className="sm:hidden">Rules</span>
            </button>

            <button
              id="btn-toggle-ludo-sound"
              onClick={handleToggleSound}
              className="p-2 sm:p-2.5 rounded-2xl bg-zinc-950/80 hover:bg-zinc-950 text-amber-400 border border-amber-300/40 shadow-md transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold"
              title={isMuted ? 'Unmute Sound FX' : 'Mute Sound FX'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-amber-400" />}
              <span className="hidden sm:inline">{isMuted ? 'Muted' : 'Sound ON'}</span>
            </button>

            {user && gameState === 'playing' && (
              <button
                id="btn-restart-game"
                onClick={() => {
                  clearAllTimers();
                  clearActiveLudoSession();
                  setResumedFromCache(false);
                  setGameState('setup');
                }}
                className="px-3.5 py-2.5 rounded-2xl bg-zinc-950/80 hover:bg-zinc-950 text-white border border-white/20 shadow-md transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                <span>New Match</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ================= 1. PRE-GAME SETUP VIEW ================= */}
      {gameState === 'setup' && (
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 sm:p-7 border border-zinc-200 dark:border-zinc-800 shadow-xl space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
            <div>
              <h2 className="text-lg font-black text-zinc-900 dark:text-white">Match Setup & Player Seats</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Configure players, bots, game mode and league target</p>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-extrabold border border-amber-500/20">
              <Crown className="w-3.5 h-3.5" />
              <span>{targetLeague?.name || 'League Master'}</span>
            </div>
          </div>

          {/* Authentication Requirement Banner when not logged in */}
          {!user && (
            <div className="p-4 bg-amber-500/10 dark:bg-amber-950/30 border-2 border-amber-500/40 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-amber-800 dark:text-amber-300">
                    Authentication Required to Start Match
                  </h4>
                  <p className="text-[11px] text-zinc-600 dark:text-zinc-400 font-medium">
                    You must be logged in as an administrator or operator to start and record matches.
                  </p>
                </div>
              </div>
              {onOpenLogin && (
                <button
                  id="btn-login-to-start-setup"
                  type="button"
                  onClick={onOpenLogin}
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-zinc-950 text-xs font-black rounded-xl shadow-md active:scale-95 transition-all cursor-pointer shrink-0 flex items-center gap-1.5"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Log In to Play</span>
                </button>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Target League Selector */}
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5">
                Target League
              </label>
              <select
                id="select-ludo-target-league"
                value={targetLeagueId}
                onChange={(e) => setTargetLeagueId(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl text-xs font-bold text-zinc-900 dark:text-white"
              >
                {leagues.map((lg) => (
                  <option key={lg.id} value={lg.id}>
                    {lg.name} ({lg.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Game Mode Selector */}
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5">
                Game Mode
              </label>
              <div className="grid grid-cols-2 gap-2 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-2xl border border-zinc-200 dark:border-zinc-700">
                <button
                  type="button"
                  onClick={() => setGameMode('classic')}
                  className={`py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
                    gameMode === 'classic'
                      ? 'bg-amber-500 text-zinc-950 shadow-md'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  Classic (4 Pawns)
                </button>
                <button
                  type="button"
                  onClick={() => setGameMode('quick')}
                  className={`py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
                    gameMode === 'quick'
                      ? 'bg-amber-500 text-zinc-950 shadow-md'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  ⚡ Quick (1 Pawn)
                </button>
              </div>
            </div>

            {/* Player Count */}
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5">
                Player Count
              </label>
              <div className="grid grid-cols-3 gap-2 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-2xl border border-zinc-200 dark:border-zinc-700">
                {([4, 3, 2] as const).map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => setPlayerCount(cnt)}
                    className={`py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
                      playerCount === cnt
                        ? 'bg-amber-500 text-zinc-950 shadow-md'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                    }`}
                  >
                    {cnt} Players
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Seat Color Cards Configuration */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-400">
              Color Seat Assignments
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {activeColors.map((color) => {
                const cfg = COLOR_CONFIG[color];
                const seat = seatConfig[color];

                return (
                  <div
                    key={color}
                    className={`p-4 rounded-3xl border-2 ${cfg.borderClass} ${cfg.lightBg} space-y-3 transition-all`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div
                          className="w-5 h-5 rounded-full border border-white shadow-sm"
                          style={{ background: cfg.bgHex }}
                        />
                        <span className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white">
                          {cfg.name} Seat
                        </span>
                      </div>

                      {/* Seat Type Toggle (Roster Player vs Bot vs Guest) */}
                      <div className="flex bg-white dark:bg-zinc-900 p-0.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-[11px]">
                        <button
                          type="button"
                          onClick={() => handleSeatTypeChange(color, 'player')}
                          className={`px-2 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                            seat.type === 'player'
                              ? 'bg-amber-500 text-zinc-950'
                              : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                          }`}
                        >
                          Roster
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSeatTypeChange(color, 'bot')}
                          className={`px-2 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                            seat.type === 'bot'
                              ? 'bg-amber-500 text-zinc-950'
                              : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                          }`}
                        >
                          AI Bot
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSeatTypeChange(color, 'guest')}
                          className={`px-2 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                            seat.type === 'guest'
                              ? 'bg-amber-500 text-zinc-950'
                              : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                          }`}
                        >
                          Guest
                        </button>
                      </div>
                    </div>

                    {/* Dynamic Input based on Type */}
                    {seat.type === 'player' ? (
                      <select
                        id={`select-seat-player-${color}`}
                        value={seat.playerId}
                        onChange={(e) => handleSeatPlayerChange(color, e.target.value)}
                        className={`w-full px-3 py-2 bg-white dark:bg-zinc-900 border rounded-xl text-xs font-bold text-zinc-900 dark:text-white transition-all ${
                          !seat.playerId
                            ? 'border-amber-500 ring-2 ring-amber-500/20'
                            : 'border-zinc-300 dark:border-zinc-700'
                        }`}
                      >
                        <option value="">-- Choose League Player --</option>
                        {rosterPlayers.map((p) => {
                          const isAssignedInOtherSeat = activeColors.some(
                            (otherColor) =>
                              otherColor !== color &&
                              seatConfig[otherColor].type === 'player' &&
                              seatConfig[otherColor].playerId === String(p.id)
                          );
                          const otherColorKey = isAssignedInOtherSeat
                            ? activeColors.find(
                                (otherColor) =>
                                  otherColor !== color &&
                                  seatConfig[otherColor].type === 'player' &&
                                  seatConfig[otherColor].playerId === String(p.id)
                              )
                            : null;

                          return (
                            <option
                              key={p.id}
                              value={p.id}
                              disabled={isAssignedInOtherSeat}
                              className={isAssignedInOtherSeat ? 'text-zinc-400 bg-zinc-100 dark:bg-zinc-800' : ''}
                            >
                              {p.full_name} {p.nickname ? `(${p.nickname})` : ''}
                              {isAssignedInOtherSeat && otherColorKey
                                ? ` [Already in ${COLOR_CONFIG[otherColorKey].name} Seat]`
                                : ''}
                            </option>
                          );
                        })}
                      </select>
                    ) : seat.type === 'bot' ? (
                      <div className="px-3 py-2 bg-white/60 dark:bg-zinc-900/60 rounded-xl text-xs font-bold text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                        <Bot className="w-4 h-4 text-amber-500" />
                        <span>Automated AI Bot will play automatically</span>
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={seat.guestName}
                        onChange={(e) =>
                          setSeatConfig((prev) => ({
                            ...prev,
                            [color]: { ...prev[color], guestName: e.target.value }
                          }))
                        }
                        placeholder="Enter Guest Player Name"
                        className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-900 dark:text-white"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Setup Validation Alerts */}
          {!setupValidation.isValid && (
            <div className="p-3.5 bg-amber-500/10 dark:bg-amber-950/30 border border-amber-500/40 rounded-2xl space-y-1.5 text-xs text-amber-800 dark:text-amber-300 font-bold">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-black">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Seat Assignment Validation</span>
              </div>
              <ul className="list-disc list-inside space-y-1 pl-1 text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                {setupValidation.errors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Launch Button & Dynamic Full Scoring Breakdown */}
          <div className="pt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-zinc-100 dark:border-zinc-800">
            <div className="text-xs text-zinc-500 dark:text-zinc-400 flex flex-wrap items-center gap-1.5">
              <span className="font-bold text-zinc-600 dark:text-zinc-300">Scoring:</span>
              {Array.from({ length: playerCount }, (_, i) => i + 1).map((pos) => {
                const pts = currentPoints[pos] ?? 0;
                const suffix = pos === 1 ? '1st' : pos === 2 ? '2nd' : pos === 3 ? '3rd' : `${pos}th`;
                return (
                  <span
                    key={pos}
                    className="inline-flex items-center px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800/80 text-[11px] font-extrabold text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700/60"
                  >
                    <span className={pos === 1 ? 'text-amber-500 font-black' : pos === 2 ? 'text-zinc-400 font-black' : pos === 3 ? 'text-amber-700 dark:text-amber-400 font-black' : 'text-zinc-500'}>
                      {suffix}
                    </span>
                    <span className="ml-1 text-amber-600 dark:text-amber-400 font-black">
                      (+{pts} pts)
                    </span>
                  </span>
                );
              })}
            </div>

            {user ? (
              <button
                id="btn-start-ludo-game"
                onClick={handleStartGame}
                disabled={!setupValidation.isValid}
                className="px-6 py-3 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-700 text-zinc-950 font-black rounded-2xl shadow-lg shadow-orange-500/25 active:scale-95 transition-all cursor-pointer flex items-center space-x-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
              >
                <Play className="w-4 h-4 fill-zinc-950" />
                <span>Start Ludo Match</span>
              </button>
            ) : (
              <button
                id="btn-start-ludo-game-login"
                type="button"
                onClick={onOpenLogin}
                className="px-6 py-3 bg-zinc-900 hover:bg-zinc-800 text-amber-400 border border-amber-500/40 font-black rounded-2xl shadow-lg active:scale-95 transition-all cursor-pointer flex items-center space-x-2 text-sm"
              >
                <LogIn className="w-4 h-4 text-amber-400" />
                <span>Log In to Start Match</span>
              </button>
            )}
          </div>

          {/* ================= ON-PAGE RULES & SCORING QUICK GUIDE ================= */}
          <div className="pt-5 border-t border-zinc-100 dark:border-zinc-800">
            <div className="bg-gradient-to-br from-zinc-50 via-amber-50/20 to-zinc-50 dark:from-zinc-900/90 dark:via-zinc-950 dark:to-zinc-900 rounded-2xl p-4 sm:p-5 border border-zinc-200 dark:border-zinc-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-black text-zinc-900 dark:text-white uppercase tracking-wider">
                      Official Game & Tournament Rules
                    </h3>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      Standard competitive rules enforced during this match
                    </p>
                  </div>
                </div>

                <button
                  id="btn-expand-full-rules-setup"
                  onClick={() => setShowRulesModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-black border border-amber-500/30 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <span>Open Full Rulebook</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* 4 Quick Rules Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                {/* Rule 1: Dice & Releases */}
                <div className="p-3 rounded-xl bg-white dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-750 space-y-1">
                  <div className="font-black text-zinc-900 dark:text-white flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400">
                    <Dice5 className="w-3.5 h-3.5" />
                    <span>Roll 6 to Release</span>
                  </div>
                  <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-snug">
                    Tokens start in the Yard. Rolling a <strong>6</strong> releases 1 token and awards a <strong>bonus roll</strong>. 4 consecutive 6s forfeit the turn.
                  </p>
                </div>

                {/* Rule 2: Knockouts */}
                <div className="p-3 rounded-xl bg-white dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-750 space-y-1">
                  <div className="font-black text-zinc-900 dark:text-white flex items-center gap-1.5 text-[11px] text-red-500">
                    <Swords className="w-3.5 h-3.5" />
                    <span>Combat & Knockouts</span>
                  </div>
                  <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-snug">
                    Landing on an opponent knocks them back to base yard! Awards <strong>+5 Kills pts</strong> to attacker, <strong>-5 pts penalty</strong> to defender + extra roll.
                  </p>
                </div>

                {/* Rule 3: Safe Zones */}
                <div className="p-3 rounded-xl bg-white dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-750 space-y-1">
                  <div className="font-black text-zinc-900 dark:text-white flex items-center gap-1.5 text-[11px] text-emerald-500">
                    <Shield className="w-3.5 h-3.5" />
                    <span>Star Safe Zones</span>
                  </div>
                  <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-snug">
                    Tokens resting on <strong>⭐ Star Squares</strong> and starting colored tiles are completely immune and cannot be captured.
                  </p>
                </div>

                {/* Rule 4: Reaching Home */}
                <div className="p-3 rounded-xl bg-white dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-750 space-y-1">
                  <div className="font-black text-zinc-900 dark:text-white flex items-center gap-1.5 text-[11px] text-amber-500">
                    <Trophy className="w-3.5 h-3.5" />
                    <span>Exact Roll for Home</span>
                  </div>
                  <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-snug">
                    Tokens navigate their colored home strip and require the <strong>exact roll count</strong> to step into the center home triangle.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= 2. ACTIVE GAMEPLAY VIEW ================= */}
      {gameState === 'playing' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Main Board & Center Stage */}
          <div className="lg:col-span-8 space-y-4">
            
            {/* Interactive Ludo Board */}
            <div className="flex justify-center">
              <LudoBoard
                players={players}
                activeColor={turnColor}
                diceValue={diceValue}
                isRolling={isRolling}
                waitingForMove={waitingForMove}
                walkingTokenKey={walkingTokenKey}
                onSelectToken={(token) => {
                  if (diceValue && waitingForMove && !isRolling && !walkingTokenKey) {
                    executeMove(token, diceValue, players);
                  }
                }}
              />
            </div>

            {/* ================= MERGED CURRENT TURN & DICE CONTROLLER CARD ================= */}
            <div
              id="ludo-turn-and-dice-panel"
              className={`bg-white dark:bg-zinc-900 rounded-3xl p-4 sm:p-5 border-2 shadow-xl transition-all ${
                COLOR_CONFIG[turnColor].borderClass
              } ring-2 ring-amber-400/20`}
            >
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                {/* Player Info & Turn Status */}
                <div className="flex items-center space-x-3.5 w-full sm:w-auto min-w-0">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-lg font-black shadow-md shrink-0 border border-white/20"
                    style={{ background: COLOR_CONFIG[turnColor].bgHex }}
                  >
                    {currentActivePlayer?.isBot ? (
                      <Bot className="w-6 h-6" />
                    ) : (
                      <User className="w-6 h-6" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                        {COLOR_CONFIG[turnColor].name} Turn
                      </span>
                      {diceValue && !isRolling && (
                        <span className="text-xs font-black text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                          Rolled: {diceValue}
                        </span>
                      )}
                    </div>
                    <div className="text-base sm:text-lg font-black text-zinc-900 dark:text-white truncate mt-0.5">
                      {currentActivePlayer?.name}
                    </div>
                    <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mt-0.5">
                      {waitingForMove ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                          ✨ Tap a highlighted token on the board to move
                        </span>
                      ) : currentActivePlayer?.isBot ? (
                        <span className="text-zinc-500 dark:text-zinc-400">
                          🤖 AI Bot is rolling automatically...
                        </span>
                      ) : (
                        <span className="text-amber-600 dark:text-amber-400 font-bold">
                          {activeTurnNotice || 'Tap the dice or roll button to roll'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Dice Controller */}
                <div className="flex items-center justify-center shrink-0">
                  <LudoDice
                    value={diceValue}
                    isRolling={isRolling}
                    canRoll={!waitingForMove && !isRolling && !currentActivePlayer?.isBot}
                    color={turnColor}
                    playerName={currentActivePlayer?.name}
                    onRoll={() => handleRollDice()}
                    isBot={currentActivePlayer?.isBot}
                    hideSubtext={true}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Side Panel: Player Cards & Live Log */}
          <div className="lg:col-span-4 space-y-4">

            {/* 4 Player Status Cards */}
            <div className="space-y-2.5">
              <div className="text-[11px] font-black uppercase tracking-wider text-zinc-400 px-1">
                Players & Tokens
              </div>

              {players.map((p) => {
                const colorCfg = COLOR_CONFIG[p.color];
                const isActive = p.color === turnColor;
                const homeCount = p.tokens.filter((t) => t.hasWon || t.step === 56).length;
                const trackCount = p.tokens.filter((t) => t.step >= 0 && t.step < 56).length;
                const baseCount = p.tokens.filter((t) => t.step === -1).length;

                return (
                  <div
                    key={p.color}
                    className={`p-3.5 rounded-2xl border transition-all ${
                      isActive
                        ? `bg-white dark:bg-zinc-900 border-2 ${colorCfg.borderClass} shadow-lg ring-2 ring-amber-400/20`
                        : `bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800/80 opacity-85`
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <div
                          className="w-7 h-7 rounded-xl flex items-center justify-center text-white text-xs font-black shadow-xs shrink-0"
                          style={{ background: colorCfg.bgHex }}
                        >
                          {p.isBot ? <Bot className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-extrabold text-zinc-900 dark:text-white truncate flex items-center gap-1.5">
                            {p.name}
                            {p.rank && (
                              <span className="px-1.5 py-0.2 rounded bg-amber-400 text-zinc-950 text-[9px] font-black">
                                Rank {p.rank}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-zinc-400 uppercase font-bold">
                            {colorCfg.name} Seat
                          </div>
                        </div>
                      </div>

                      {/* Token Summary badges & Combat stats */}
                      <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center space-x-1 text-[10px] font-extrabold">
                          <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" title="Home Tokens">
                            🎯 {homeCount}
                          </span>
                          <span className="px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20" title="Active on Track">
                            🚶 {trackCount}
                          </span>
                          <span className="px-2 py-0.5 rounded-lg bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400" title="In Base Yard">
                            🏠 {baseCount}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1 text-[9px] font-black">
                          <span className="px-1.5 py-0.5 rounded-md bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20" title="Kills: +5 pts each">
                            ⚔️ {p.kills || 0} (+{(p.kills || 0) * 5})
                          </span>
                          <span className="px-1.5 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20" title="Deaths: -5 pts each">
                            💀 {p.deaths || 0} (-{(p.deaths || 0) * 5})
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Live Activity Log */}
            <div className="bg-white dark:bg-zinc-900 rounded-3xl p-4 border border-zinc-200 dark:border-zinc-800 shadow-md space-y-2">
              <div className="text-[11px] font-black uppercase tracking-wider text-zinc-400 flex items-center justify-between">
                <span>Match Action Log</span>
                <span className="text-[9px] text-amber-500">{gameLogs.length} events</span>
              </div>
              <div className="h-32 overflow-y-auto space-y-1 text-xs font-medium pr-1">
                {gameLogs.map((log, idx) => (
                  <div
                    key={idx}
                    className={`py-1 border-b border-zinc-100 dark:border-zinc-800/60 last:border-0 ${
                      idx === 0
                        ? 'text-zinc-900 dark:text-zinc-100 font-bold'
                        : 'text-zinc-500 dark:text-zinc-400'
                    }`}
                  >
                    {log}
                  </div>
                ))}
              </div>
            </div>

            {/* Quick In-Game Rules Button & Reminder */}
            <div className="p-3.5 bg-zinc-50 dark:bg-zinc-900/80 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-2">
              <div className="flex items-center space-x-2 text-xs">
                <Shield className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="text-[11px] font-bold text-zinc-600 dark:text-zinc-300">
                  Need a refresher on rules?
                </span>
              </div>
              <button
                id="btn-open-rules-in-game"
                onClick={() => setShowRulesModal(true)}
                className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-black border border-amber-500/30 transition-all cursor-pointer flex items-center gap-1"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Rules</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ================= 3. GAME OVER & LEAGUE AUTO-RECORD VIEW ================= */}
      {gameState === 'gameover' && (
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 sm:p-8 border border-zinc-200 dark:border-zinc-800 shadow-2xl max-w-2xl mx-auto space-y-6 text-center">
          
          <div className="w-16 h-16 rounded-3xl bg-amber-500/10 text-amber-500 border border-amber-500/30 flex items-center justify-center mx-auto shadow-inner">
            <Trophy className="w-8 h-8" />
          </div>

          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white tracking-tight">
              Match Completed!
            </h2>
            <p className="text-xs sm:text-sm font-semibold text-zinc-500 dark:text-zinc-400 mt-1">
              Final standings for <span className="font-extrabold text-amber-500">{targetLeague?.name || 'League Master'}</span>
            </p>
          </div>

          {/* Podium / Standings Breakdown */}
          <div className="space-y-2.5 max-w-lg mx-auto text-left">
            {rankings.map((item) => {
              const basePts = currentPoints[item.rank] || 0;
              const kills = item.player.kills || 0;
              const deaths = item.player.deaths || 0;
              const combatPts = (kills * 5) - (deaths * 5);
              const totalPts = Number((basePts + combatPts).toFixed(2));
              const colorCfg = COLOR_CONFIG[item.player.color];

              return (
                <div
                  key={item.rank}
                  className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                    item.rank === 1
                      ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-400 shadow-md ring-2 ring-amber-400/20'
                      : 'bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-800'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">
                      {item.rank === 1 ? '🥇' : item.rank === 2 ? '🥈' : item.rank === 3 ? '🥉' : '4️⃣'}
                    </span>
                    <div>
                      <div className="text-sm font-black text-zinc-900 dark:text-white flex items-center gap-2">
                        <span>{item.player.name}</span>
                        <span
                          className="w-2.5 h-2.5 rounded-full inline-block"
                          style={{ background: colorCfg.bgHex }}
                        />
                      </div>
                      <div className="text-[10px] text-zinc-400 uppercase font-bold flex flex-wrap items-center gap-2 mt-0.5">
                        <span>Rank {item.rank} • {colorCfg.name} Seat</span>
                        <span className="text-red-500 font-extrabold">⚔️ {kills} Kills (+{kills * 5})</span>
                        <span className="text-purple-500 font-extrabold">💀 {deaths} Deaths (-{deaths * 5})</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-left sm:text-right">
                    <div className="text-sm font-black text-amber-600 dark:text-amber-400">
                      {totalPts >= 0 ? `+${totalPts}` : totalPts} pts
                    </div>
                    <div className="text-[10px] text-zinc-400 font-medium">
                      Base {basePts} {combatPts >= 0 ? `+ ${combatPts}` : `- ${Math.abs(combatPts)}`} combat
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Auto-Record Result / Feedback */}
          {matchSubmittedSuccess ? (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl space-y-2 max-w-lg mx-auto">
              <div className="flex items-center justify-center space-x-2 text-emerald-600 dark:text-emerald-400 font-black text-sm">
                <CheckCircle2 className="w-5 h-5" />
                <span>Successfully Recorded in League Master!</span>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                Match Reference: <span className="font-extrabold text-amber-500">{matchSubmittedSuccess.friendlyId}</span>
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-w-lg mx-auto">
              {submissionError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-600 dark:text-red-400 text-xs font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{submissionError}</span>
                </div>
              )}

              <button
                id="btn-save-ludo-match-to-league"
                onClick={handleSaveToLeagueMaster}
                disabled={isSubmittingMatch}
                className="w-full py-3.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-700 text-zinc-950 font-black rounded-2xl shadow-xl shadow-orange-500/25 active:scale-95 transition-all cursor-pointer flex items-center justify-center space-x-2 text-sm disabled:opacity-50"
              >
                <Crown className="w-5 h-5 fill-zinc-950" />
                <span>{isSubmittingMatch ? 'Recording to League...' : 'Save & Record to League Master'}</span>
              </button>
            </div>
          )}

          {/* Post-Game Navigation Actions */}
          <div className="pt-3 flex flex-wrap items-center justify-center gap-3">
            {user ? (
              <button
                onClick={() => setGameState('setup')}
                className="px-5 py-2.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 font-extrabold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-500" />
                <span>Play Another Game</span>
              </button>
            ) : (
              onOpenLogin && (
                <button
                  onClick={onOpenLogin}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-extrabold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Log In to Start New Match</span>
                </button>
              )
            )}

            {onNavigateTab && (
              <>
                <button
                  onClick={() => onNavigateTab('leaderboards')}
                  className="px-5 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 font-extrabold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer border border-amber-500/30"
                >
                  <Trophy className="w-3.5 h-3.5" />
                  <span>View Leaderboard</span>
                </button>
                <button
                  onClick={() => onNavigateTab('matches')}
                  className="px-5 py-2.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 font-extrabold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>View Match History</span>
                </button>
              </>
            )}
          </div>

        </div>
      )}

      {/* Official Ludo Rules & Tournament Scoring Modal */}
      <LudoRulesModal
        isOpen={showRulesModal}
        onClose={() => setShowRulesModal(false)}
      />

    </div>
  );
};
