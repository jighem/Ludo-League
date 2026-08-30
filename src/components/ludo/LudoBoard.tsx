import React, { useMemo } from 'react';
import {
  LudoColor,
  LudoPlayer,
  LudoToken,
  getTokenGridPos,
  canTokenMove,
  COLOR_CONFIG
} from '../../utils/ludoEngine';
import { Crown, Star, ArrowRight, ArrowDown, ArrowLeft, ArrowUp } from 'lucide-react';

interface LudoBoardProps {
  players: LudoPlayer[];
  activeColor: LudoColor;
  diceValue: number | null;
  isRolling: boolean;
  waitingForMove: boolean;
  walkingTokenKey?: string | null;
  onSelectToken: (token: LudoToken) => void;
}

interface PlacedToken {
  token: LudoToken;
  player: LudoPlayer;
  row: number;
  col: number;
  isMovable: boolean;
  isWalking: boolean;
  key: string;
}

export const LudoBoard: React.FC<LudoBoardProps> = ({
  players,
  activeColor,
  diceValue,
  isRolling,
  waitingForMove,
  walkingTokenKey,
  onSelectToken,
}) => {
  // Find current active player
  const activePlayer = useMemo(
    () => players.find((p) => p.color === activeColor),
    [players, activeColor]
  );

  // Determine movable tokens for the active player
  const movableTokenIds = useMemo(() => {
    if (!waitingForMove || !diceValue || !activePlayer || isRolling || walkingTokenKey) return new Set<number>();
    const valid = activePlayer.tokens.filter((t) => canTokenMove(t, diceValue, activePlayer));
    return new Set(valid.map((t) => t.id));
  }, [waitingForMove, diceValue, activePlayer, isRolling, walkingTokenKey]);

  // Aggregate all active tokens across players with their exact grid positions
  const placedTokens: PlacedToken[] = useMemo(() => {
    const list: PlacedToken[] = [];

    players.forEach((p) => {
      p.tokens.forEach((t) => {
        const pos = getTokenGridPos(t);
        const isMovable = p.color === activeColor && movableTokenIds.has(t.id);
        const isWalking = walkingTokenKey === `${p.color}-${t.id}`;
        list.push({
          token: t,
          player: p,
          row: pos.row,
          col: pos.col,
          isMovable,
          isWalking,
          key: `${p.color}-${t.id}`,
        });
      });
    });

    return list;
  }, [players, activeColor, movableTokenIds, walkingTokenKey]);

  // Group tokens sharing exact same tile to calculate visual offset
  const groupedTokens: Record<string, PlacedToken[]> = useMemo(() => {
    const groups: Record<string, PlacedToken[]> = {};
    placedTokens.forEach((item) => {
      const key = `${Math.round(item.row * 10) / 10}_${Math.round(item.col * 10) / 10}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });
    return groups;
  }, [placedTokens]);

  // Track finished home tokens by color
  const homeTokensByColor = useMemo(() => {
    const map: Record<LudoColor, { count: number; wonIds: number[] }> = {
      red: { count: 0, wonIds: [] },
      green: { count: 0, wonIds: [] },
      yellow: { count: 0, wonIds: [] },
      blue: { count: 0, wonIds: [] },
    };
    players.forEach((p) => {
      const won = p.tokens.filter((t) => t.hasWon || t.step === 56);
      map[p.color] = { count: won.length, wonIds: won.map((t) => t.id) };
    });
    return map;
  }, [players]);

  const redPlayer = players.find((p) => p.color === 'red');
  const greenPlayer = players.find((p) => p.color === 'green');
  const yellowPlayer = players.find((p) => p.color === 'yellow');
  const bluePlayer = players.find((p) => p.color === 'blue');

  // Helper to render Star Icon on Safe Cells
  const isStarTile = (r: number, c: number) => {
    if (r === 2 && c === 6) return true; // Green Track safe star
    if (r === 6 && c === 12) return true; // Yellow Track safe star
    if (r === 12 && c === 8) return true; // Blue Track safe star
    if (r === 8 && c === 2) return true; // Red Track safe star
    return false;
  };

  const COLOR_DOT_STYLES: Record<LudoColor, { bg: string; border: string }> = {
    red: { bg: 'bg-red-500', border: 'border-red-800' },
    green: { bg: 'bg-emerald-500', border: 'border-emerald-800' },
    yellow: { bg: 'bg-amber-400', border: 'border-amber-700' },
    blue: { bg: 'bg-blue-500', border: 'border-blue-800' },
  };

  // Helper to render Top Player Name Badge on Base Yard
  const renderYardPlayerHeader = (player?: LudoPlayer, align: 'left' | 'right' = 'left') => {
    if (!player) return null;
    const isActive = activeColor === player.color;
    return (
      <div
        className={`absolute top-1 ${
          align === 'left' ? 'left-1.5' : 'right-1.5'
        } flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[8px] sm:text-[9.5px] font-black z-10 transition-all shadow-md backdrop-blur-xs max-w-[95%] ${
          isActive
            ? 'bg-zinc-950 text-white border border-amber-400 ring-2 ring-amber-400/60 shadow-amber-500/30'
            : 'bg-zinc-950/85 text-zinc-200 border border-white/20'
        }`}
        title={player.name}
      >
        <span className="text-[9px]">{player.isBot ? '🤖' : '👤'}</span>
        <span className="truncate max-w-[50px] sm:max-w-[75px] font-extrabold">{player.name}</span>
        {isActive && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping shrink-0" />}
      </div>
    );
  };

  // Helper to render color-coded Kills & Killed-By breakdown tokens
  const renderYardCombatTokens = (player?: LudoPlayer, align: 'left' | 'right' = 'left') => {
    if (!player) return null;
    const killed = player.killedOpponents || {};
    const deaths = player.killedBy || {};

    const killedEntries = (Object.entries(killed) as [LudoColor, number][]).filter(([_, cnt]) => (cnt || 0) > 0);
    const deathEntries = (Object.entries(deaths) as [LudoColor, number][]).filter(([_, cnt]) => (cnt || 0) > 0);

    if (killedEntries.length === 0 && deathEntries.length === 0) return null;

    return (
      <div
        className={`absolute top-6.5 sm:top-7 ${
          align === 'left' ? 'left-1.5 items-start' : 'right-1.5 items-end'
        } flex flex-col gap-0.5 z-10 pointer-events-none`}
      >
        {killedEntries.length > 0 && (
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-zinc-950/90 border border-red-500/40 text-white text-[7px] sm:text-[8px] font-bold shadow-xs backdrop-blur-xs">
            <span className="text-red-400 font-extrabold">⚔️</span>
            <div className="flex items-center gap-1">
              {killedEntries.map(([col, cnt]) => (
                <span key={col} className="flex items-center gap-0.5">
                  <span
                    className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full ${COLOR_DOT_STYLES[col].bg} border ${COLOR_DOT_STYLES[col].border} inline-block shadow-xs shrink-0`}
                    title={`Killed ${col} token`}
                  />
                  <span className="text-zinc-200 font-extrabold">{cnt}</span>
                </span>
              ))}
            </div>
          </div>
        )}
        {deathEntries.length > 0 && (
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-zinc-950/90 border border-purple-500/40 text-white text-[7px] sm:text-[8px] font-bold shadow-xs backdrop-blur-xs">
            <span className="text-purple-400 font-extrabold">💀</span>
            <div className="flex items-center gap-1">
              {deathEntries.map(([col, cnt]) => (
                <span key={col} className="flex items-center gap-0.5">
                  <span
                    className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full ${COLOR_DOT_STYLES[col].bg} border ${COLOR_DOT_STYLES[col].border} inline-block shadow-xs shrink-0`}
                    title={`Killed by ${col} token`}
                  />
                  <span className="text-zinc-200 font-extrabold">{cnt}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Helper to render Bottom Counter (Home + Kills + Deaths)
  const renderYardBottomCounter = (player?: LudoPlayer, align: 'left' | 'right' = 'left') => {
    if (!player) return null;
    const homeCount = homeTokensByColor[player.color].count;
    return (
      <div
        className={`absolute bottom-1 ${
          align === 'left' ? 'left-1.5' : 'right-1.5'
        } px-1.5 sm:px-2 py-0.5 rounded-full bg-zinc-950/90 text-white text-[7.5px] sm:text-[8.5px] font-bold border border-white/20 flex items-center gap-1 sm:gap-1.5 shadow-sm backdrop-blur-xs z-10`}
      >
        <span className="flex items-center gap-0.5 sm:gap-1">
          <span>🏠 Home:</span>
          <span className="text-amber-300 font-extrabold">{homeCount}/4</span>
        </span>
        <span className="text-zinc-600">|</span>
        <span className="flex items-center gap-0.5 text-red-300 font-extrabold" title="Kills (+5 pts)">
          <span>⚔️</span>
          <span>{player.kills || 0}</span>
        </span>
        <span className="text-zinc-600">|</span>
        <span className="flex items-center gap-0.5 text-purple-300 font-extrabold" title="Deaths (-5 pts)">
          <span>💀</span>
          <span>{player.deaths || 0}</span>
        </span>
      </div>
    );
  };

  // Helper to render Position/Rank Badge inside Yard Square upon winning / ranking
  const renderYardPositionBadge = (player?: LudoPlayer) => {
    if (!player || !player.rank) return null;
    const rank = player.rank;
    const isWinner = rank === 1;

    return (
      <div
        className={`absolute inset-2 sm:inset-3 rounded-2xl flex flex-col items-center justify-center p-2 text-center shadow-2xl z-20 transition-all border-2 ${
          isWinner
            ? 'bg-zinc-950/95 border-amber-400 text-white ring-4 ring-amber-400/50 shadow-amber-500/40'
            : rank === 2
            ? 'bg-zinc-950/92 border-slate-300 text-white ring-2 ring-slate-300/40 shadow-slate-500/20'
            : rank === 3
            ? 'bg-zinc-950/92 border-amber-700/80 text-white ring-2 ring-amber-700/40 shadow-amber-700/20'
            : 'bg-zinc-950/92 border-zinc-700 text-zinc-300 ring-1 ring-zinc-700/30'
        }`}
      >
        <div className="text-2xl sm:text-4xl drop-shadow-md">
          {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '4️⃣'}
        </div>
        <div
          className={`text-[10px] sm:text-xs font-black uppercase tracking-wider mt-0.5 sm:mt-1 ${
            isWinner
              ? 'text-amber-400 font-black drop-shadow-xs'
              : rank === 2
              ? 'text-slate-200'
              : rank === 3
              ? 'text-amber-500'
              : 'text-zinc-400'
          }`}
        >
          {rank === 1 ? '1st Place' : rank === 2 ? '2nd Place' : rank === 3 ? '3rd Place' : '4th Place'}
        </div>
        <div className="text-[8px] sm:text-[9px] font-extrabold text-white/90 px-2 py-0.5 mt-0.5 rounded-full bg-white/10">
          {isWinner ? '🏆 Champion' : rank <= 3 ? 'Podium' : 'Participant'}
        </div>
      </div>
    );
  };

  return (
    <div className="relative w-full aspect-square max-w-[540px] mx-auto bg-zinc-900 dark:bg-zinc-950 rounded-3xl p-2.5 sm:p-3.5 shadow-2xl border-4 border-zinc-800 dark:border-zinc-850 select-none">
      {/* 15x15 Grid Board Container */}
      <div className="relative w-full h-full grid grid-cols-15 grid-rows-15 rounded-2xl overflow-hidden border-2 border-zinc-900 bg-white shadow-inner">
        
        {/* ========================================================================= */}
        {/* 1. TOP-LEFT: RED BASE YARD (6x6: Row 0..5, Col 0..5)                     */}
        {/* ========================================================================= */}
        <div className="col-span-6 row-span-6 bg-red-600 p-3 sm:p-4.5 flex items-center justify-center relative border-r-2 border-b-2 border-zinc-950">
          <div className="w-[82%] h-[82%] bg-white rounded-2xl p-1.5 sm:p-2.5 grid grid-cols-2 grid-rows-2 gap-2 sm:gap-3 place-items-center shadow-md border-2 border-red-700/40 relative overflow-hidden">
            {[0, 1, 2, 3].map((slotIdx) => (
              <div
                key={slotIdx}
                className="w-5 h-5 sm:w-7 sm:h-7 rounded-full bg-red-500 border-2 border-red-800 shadow-inner flex items-center justify-center"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-white/50" />
              </div>
            ))}

            {/* Position / Rank Overlay Badge on Finish */}
            {renderYardPositionBadge(redPlayer)}
          </div>

          {/* Player Name Header */}
          {renderYardPlayerHeader(redPlayer, 'left')}

          {/* Color-coded Kills & Killed-By breakdown tokens */}
          {renderYardCombatTokens(redPlayer, 'left')}

          {/* Home Tokens & Combat (Kills/Deaths) Counter Badge */}
          {renderYardBottomCounter(redPlayer, 'left')}
        </div>

        {/* ========================================================================= */}
        {/* 2. TOP PATH ARM (3 Cols x 6 Rows: Row 0..5, Col 6..8)                    */}
        {/* ========================================================================= */}
        <div className="col-span-3 row-span-6 grid grid-cols-3 grid-rows-6 border-b-2 border-zinc-950">
          {Array.from({ length: 18 }).map((_, idx) => {
            const r = Math.floor(idx / 3);
            const c = (idx % 3) + 6;
            const isGreenStart = r === 1 && c === 8;
            const isGreenHomePath = c === 7 && r >= 1 && r <= 5;
            // Middle column (col 7) at entrance (row 0) pointing down into home path
            const isGreenArrowCell = r === 0 && c === 7;
            const isStar = isStarTile(r, c);

            return (
              <div
                key={`top-${r}-${c}`}
                className={`border-[1.5px] border-zinc-800 flex items-center justify-center relative ${
                  isGreenStart || isGreenHomePath
                    ? 'bg-emerald-500 text-white'
                    : isGreenArrowCell
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-white'
                }`}
              >
                {isGreenArrowCell && (
                  <ArrowDown className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-700 stroke-[3]" />
                )}
                {isStar && (
                  <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-950 fill-none stroke-[2.5]" />
                )}
              </div>
            );
          })}
        </div>

        {/* ========================================================================= */}
        {/* 3. TOP-RIGHT: GREEN BASE YARD (6x6: Row 0..5, Col 9..14)                 */}
        {/* ========================================================================= */}
        <div className="col-span-6 row-span-6 bg-emerald-600 p-3 sm:p-4.5 flex items-center justify-center relative border-l-2 border-b-2 border-zinc-950">
          <div className="w-[82%] h-[82%] bg-white rounded-2xl p-1.5 sm:p-2.5 grid grid-cols-2 grid-rows-2 gap-2 sm:gap-3 place-items-center shadow-md border-2 border-emerald-700/40 relative overflow-hidden">
            {[0, 1, 2, 3].map((slotIdx) => (
              <div
                key={slotIdx}
                className="w-5 h-5 sm:w-7 sm:h-7 rounded-full bg-emerald-500 border-2 border-emerald-800 shadow-inner flex items-center justify-center"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-white/50" />
              </div>
            ))}

            {/* Position / Rank Overlay Badge on Finish */}
            {renderYardPositionBadge(greenPlayer)}
          </div>

          {/* Player Name Header */}
          {renderYardPlayerHeader(greenPlayer, 'right')}

          {/* Color-coded Kills & Killed-By breakdown tokens */}
          {renderYardCombatTokens(greenPlayer, 'right')}

          {/* Home Tokens & Combat (Kills/Deaths) Counter Badge */}
          {renderYardBottomCounter(greenPlayer, 'right')}
        </div>

        {/* ========================================================================= */}
        {/* 4. MIDDLE ROW - LEFT ARM: RED (6 Cols x 3 Rows: Row 6..8, Col 0..5)      */}
        {/* ========================================================================= */}
        <div className="col-span-6 row-span-3 grid grid-cols-6 grid-rows-3 border-r-2 border-zinc-950">
          {Array.from({ length: 18 }).map((_, idx) => {
            const r = Math.floor(idx / 6) + 6;
            const c = idx % 6;
            const isRedStart = r === 6 && c === 1;
            const isRedHomePath = r === 7 && c >= 1 && c <= 5;
            // Middle row (row 7) at entrance (col 0) pointing right into home path
            const isRedArrowCell = r === 7 && c === 0;
            const isStar = isStarTile(r, c);

            return (
              <div
                key={`left-${r}-${c}`}
                className={`border-[1.5px] border-zinc-800 flex items-center justify-center relative ${
                  isRedStart || isRedHomePath
                    ? 'bg-red-600 text-white'
                    : isRedArrowCell
                    ? 'bg-red-100 text-red-800'
                    : 'bg-white'
                }`}
              >
                {isRedArrowCell && (
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-red-700 stroke-[3]" />
                )}
                {isStar && (
                  <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-950 fill-none stroke-[2.5]" />
                )}
              </div>
            );
          })}
        </div>

        {/* ========================================================================= */}
        {/* 5. CENTER: 3x3 FINISH ZONE / HOME TRIANGLES (Row 6..8, Col 6..8)          */}
        {/* ========================================================================= */}
        <div className="col-span-3 row-span-3 relative bg-zinc-950 overflow-hidden border-2 border-zinc-950 shadow-inner">
          {/* Top Triangle: GREEN */}
          <div
            className="absolute inset-0 bg-emerald-500"
            style={{ clipPath: 'polygon(0% 0%, 100% 0%, 50% 50%)' }}
          />
          {/* Right Triangle: YELLOW */}
          <div
            className="absolute inset-0 bg-amber-400"
            style={{ clipPath: 'polygon(100% 0%, 100% 100%, 50% 50%)' }}
          />
          {/* Bottom Triangle: BLUE */}
          <div
            className="absolute inset-0 bg-blue-500"
            style={{ clipPath: 'polygon(100% 100%, 0% 100%, 50% 50%)' }}
          />
          {/* Left Triangle: RED */}
          <div
            className="absolute inset-0 bg-red-600"
            style={{ clipPath: 'polygon(0% 100%, 0% 0%, 50% 50%)' }}
          />

          {/* Quadrant Home Badges */}
          <div className="absolute top-1 left-1/2 -translate-x-1/2 px-1.5 py-0.2 rounded bg-emerald-950/85 text-emerald-100 text-[8px] sm:text-[9px] font-black border border-emerald-300/40 pointer-events-none">
            {homeTokensByColor.green.count}/4
          </div>
          <div className="absolute right-1 top-1/2 -translate-y-1/2 px-1.5 py-0.2 rounded bg-amber-950/85 text-amber-100 text-[8px] sm:text-[9px] font-black border border-amber-300/40 pointer-events-none">
            {homeTokensByColor.yellow.count}/4
          </div>
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.2 rounded bg-blue-950/85 text-blue-100 text-[8px] sm:text-[9px] font-black border border-blue-300/40 pointer-events-none">
            {homeTokensByColor.blue.count}/4
          </div>
          <div className="absolute left-1 top-1/2 -translate-y-1/2 px-1.5 py-0.2 rounded bg-red-950/85 text-red-100 text-[8px] sm:text-[9px] font-black border border-red-300/40 pointer-events-none">
            {homeTokensByColor.red.count}/4
          </div>

          {/* Central Crown Finish Icon */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-zinc-950/90 border-2 border-amber-300 flex items-center justify-center shadow-lg">
              <Crown className="w-3 h-3 sm:w-4 sm:h-4 text-amber-400 fill-amber-400" />
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 6. MIDDLE ROW - RIGHT ARM: YELLOW (6 Cols x 3 Rows: Row 6..8, Col 9..14) */}
        {/* ========================================================================= */}
        <div className="col-span-6 row-span-3 grid grid-cols-6 grid-rows-3 border-l-2 border-zinc-950">
          {Array.from({ length: 18 }).map((_, idx) => {
            const r = Math.floor(idx / 6) + 6;
            const c = (idx % 6) + 9;
            const isYellowStart = r === 8 && c === 13;
            const isYellowHomePath = r === 7 && c >= 9 && c <= 13;
            // Middle row (row 7) at entrance (col 14) pointing left into home path
            const isYellowArrowCell = r === 7 && c === 14;
            const isStar = isStarTile(r, c);

            return (
              <div
                key={`right-${r}-${c}`}
                className={`border-[1.5px] border-zinc-800 flex items-center justify-center relative ${
                  isYellowStart || isYellowHomePath
                    ? 'bg-amber-400 text-zinc-950'
                    : isYellowArrowCell
                    ? 'bg-amber-100 text-amber-900'
                    : 'bg-white'
                }`}
              >
                {isYellowArrowCell && (
                  <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-amber-700 stroke-[3]" />
                )}
                {isStar && (
                  <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-950 fill-none stroke-[2.5]" />
                )}
              </div>
            );
          })}
        </div>

        {/* ========================================================================= */}
        {/* 7. BOTTOM-LEFT: BLUE BASE YARD (6x6: Row 9..14, Col 0..5)                */}
        {/* ========================================================================= */}
        <div className="col-span-6 row-span-6 bg-blue-600 p-3 sm:p-4.5 flex items-center justify-center relative border-r-2 border-t-2 border-zinc-950">
          <div className="w-[82%] h-[82%] bg-white rounded-2xl p-1.5 sm:p-2.5 grid grid-cols-2 grid-rows-2 gap-2 sm:gap-3 place-items-center shadow-md border-2 border-blue-700/40 relative overflow-hidden">
            {[0, 1, 2, 3].map((slotIdx) => (
              <div
                key={slotIdx}
                className="w-5 h-5 sm:w-7 sm:h-7 rounded-full bg-blue-500 border-2 border-blue-800 shadow-inner flex items-center justify-center"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-white/50" />
              </div>
            ))}

            {/* Position / Rank Overlay Badge on Finish */}
            {renderYardPositionBadge(bluePlayer)}
          </div>

          {/* Player Name Header */}
          {renderYardPlayerHeader(bluePlayer, 'left')}

          {/* Color-coded Kills & Killed-By breakdown tokens */}
          {renderYardCombatTokens(bluePlayer, 'left')}

          {/* Home Tokens & Combat (Kills/Deaths) Counter Badge */}
          {renderYardBottomCounter(bluePlayer, 'left')}
        </div>

        {/* ========================================================================= */}
        {/* 8. BOTTOM PATH ARM (3 Cols x 6 Rows: Row 9..14, Col 6..8)                */}
        {/* ========================================================================= */}
        <div className="col-span-3 row-span-6 grid grid-cols-3 grid-rows-6 border-t-2 border-zinc-950">
          {Array.from({ length: 18 }).map((_, idx) => {
            const r = Math.floor(idx / 3) + 9;
            const c = (idx % 3) + 6;
            const isBlueStart = r === 13 && c === 6;
            const isBlueHomePath = c === 7 && r >= 9 && r <= 13;
            // Middle column (col 7) at entrance (row 14) pointing up into home path
            const isBlueArrowCell = r === 14 && c === 7;
            const isStar = isStarTile(r, c);

            return (
              <div
                key={`bot-${r}-${c}`}
                className={`border-[1.5px] border-zinc-800 flex items-center justify-center relative ${
                  isBlueStart || isBlueHomePath
                    ? 'bg-blue-500 text-white'
                    : isBlueArrowCell
                    ? 'bg-blue-100 text-blue-900'
                    : 'bg-white'
                }`}
              >
                {isBlueArrowCell && (
                  <ArrowUp className="w-4 h-4 sm:w-5 sm:h-5 text-blue-700 stroke-[3]" />
                )}
                {isStar && (
                  <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-950 fill-none stroke-[2.5]" />
                )}
              </div>
            );
          })}
        </div>

        {/* ========================================================================= */}
        {/* 9. BOTTOM-RIGHT: YELLOW BASE YARD (6x6: Row 9..14, Col 9..14)            */}
        {/* ========================================================================= */}
        <div className="col-span-6 row-span-6 bg-amber-400 p-3 sm:p-4.5 flex items-center justify-center relative border-l-2 border-t-2 border-zinc-950">
          <div className="w-[82%] h-[82%] bg-white rounded-2xl p-1.5 sm:p-2.5 grid grid-cols-2 grid-rows-2 gap-2 sm:gap-3 place-items-center shadow-md border-2 border-amber-600/40 relative overflow-hidden">
            {[0, 1, 2, 3].map((slotIdx) => (
              <div
                key={slotIdx}
                className="w-5 h-5 sm:w-7 sm:h-7 rounded-full bg-amber-400 border-2 border-amber-700 shadow-inner flex items-center justify-center"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-white/50" />
              </div>
            ))}

            {/* Position / Rank Overlay Badge on Finish */}
            {renderYardPositionBadge(yellowPlayer)}
          </div>

          {/* Player Name Header */}
          {renderYardPlayerHeader(yellowPlayer, 'right')}

          {/* Color-coded Kills & Killed-By breakdown tokens */}
          {renderYardCombatTokens(yellowPlayer, 'right')}

          {/* Home Tokens & Combat (Kills/Deaths) Counter Badge */}
          {renderYardBottomCounter(yellowPlayer, 'right')}
        </div>

        {/* ========================================================================= */}
        {/* 10. TOKENS OVERLAY LAYER                                                  */}
        {/* ========================================================================= */}
        {Object.values(groupedTokens).map((items) => {
          const count = items.length;

          return items.map((item, stackIdx) => {
            const { token, row, col, isMovable, isWalking, key } = item;
            const colorCfg = COLOR_CONFIG[token.color];

            // Calculate percentage positions on 15x15 grid
            const cellWidthPct = 100 / 15;
            let leftPct = col * cellWidthPct;
            let topPct = row * cellWidthPct;

            // When multiple tokens share the exact square, calculate discrete visual offset so each is visible
            const isAtHomeBase = token.step === -1;
            if (count > 1 && !isAtHomeBase && !isWalking) {
              if (count === 2) {
                // 2 tokens: Place top-left and bottom-right
                const offsets = [
                  { x: -1.35, y: -1.35 },
                  { x: 1.35, y: 1.35 }
                ];
                leftPct += offsets[stackIdx % 2].x;
                topPct += offsets[stackIdx % 2].y;
              } else if (count === 3) {
                // 3 tokens: Triangle placement
                const offsets = [
                  { x: 0, y: -1.5 },
                  { x: -1.45, y: 1.25 },
                  { x: 1.45, y: 1.25 }
                ];
                leftPct += offsets[stackIdx % 3].x;
                topPct += offsets[stackIdx % 3].y;
              } else {
                // 4 tokens: 2x2 grid placement
                const offsets = [
                  { x: -1.4, y: -1.4 },
                  { x: 1.4, y: -1.4 },
                  { x: -1.4, y: 1.4 },
                  { x: 1.4, y: 1.4 }
                ];
                leftPct += offsets[stackIdx % 4].x;
                topPct += offsets[stackIdx % 4].y;
              }
            }

            // Dynamic scaling: when multiple tokens are sitting on the same tile, shrink tokens so all are clearly visible
            const multiScale = (count > 1 && !isAtHomeBase && !isWalking)
              ? count === 2
                ? 0.76
                : count === 3
                ? 0.64
                : 0.54
              : 1;

            return (
              <button
                key={key}
                id={`token-${token.color}-${token.id}`}
                type="button"
                disabled={!isMovable || isWalking}
                onClick={() => isMovable && !isWalking && onSelectToken(token)}
                style={{
                  left: `${leftPct}%`,
                  top: `${topPct}%`,
                  width: `${cellWidthPct}%`,
                  height: `${cellWidthPct}%`,
                  zIndex: isWalking ? 60 : isMovable ? 45 : 15 + stackIdx,
                  transition: isWalking
                    ? 'left 160ms cubic-bezier(0.25, 1, 0.5, 1), top 160ms cubic-bezier(0.25, 1, 0.5, 1)'
                    : 'left 220ms ease-out, top 220ms ease-out',
                }}
                className={`absolute flex items-center justify-center ${
                  isMovable && !isWalking ? 'cursor-pointer' : 'cursor-default pointer-events-none'
                }`}
              >
                {/* Authentic 3D Pawn with dynamic multi-token scaling */}
                <div
                  style={{ transform: `scale(${multiScale})` }}
                  className={`relative flex flex-col items-center justify-center transition-transform origin-center ${
                    isWalking
                      ? 'scale-125 -translate-y-2'
                      : isMovable
                      ? 'ring-4 ring-amber-400 ring-offset-2 ring-offset-zinc-950 rounded-full animate-bounce'
                      : ''
                  } ${token.hasWon ? 'opacity-85 scale-90' : ''}`}
                >
                  {/* Outer Teardrop/Pin Body */}
                  <div
                    className="relative w-6 h-6 sm:w-7.5 sm:h-7.5 rounded-full border-2 border-white dark:border-zinc-950 shadow-lg flex items-center justify-center"
                    style={{
                      background: colorCfg.tokenGradient,
                      boxShadow: isWalking
                        ? `0 0 20px ${colorCfg.bgHex}, 0 8px 16px rgba(0,0,0,0.6)`
                        : isMovable
                        ? `0 0 16px ${colorCfg.bgHex}, 0 4px 10px rgba(0,0,0,0.5)`
                        : '0 3px 6px rgba(0,0,0,0.4)',
                    }}
                  >
                    {/* Inner glossy core / lens */}
                    <div className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 rounded-full bg-white/40 border border-white/80 shadow-inner flex items-center justify-center">
                      <span className="text-[8px] font-black text-white drop-shadow-md">
                        {token.id + 1}
                      </span>
                    </div>

                    {/* Movable Crown/Indicator Halo */}
                    {isMovable && !isWalking && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full border border-zinc-900 flex items-center justify-center shadow-xs">
                        <span className="w-1.5 h-1.5 bg-zinc-950 rounded-full animate-ping" />
                      </span>
                    )}
                  </div>

                  {/* Bottom Ring / Pin Base Shadow */}
                  <div
                    className={`w-4 sm:w-5 -mt-0.5 rounded-full blur-[0.5px] transition-all ${
                      isWalking ? 'h-2 opacity-50 scale-110' : 'h-1 sm:h-1.5 opacity-70'
                    }`}
                    style={{ background: 'rgba(0, 0, 0, 0.6)' }}
                  />
                </div>
              </button>
            );
          });
        })}

      </div>
    </div>
  );
};
