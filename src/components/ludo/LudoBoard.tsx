import React, { useMemo } from 'react';
import {
  LudoColor,
  LudoPlayer,
  LudoToken,
  getTokenGridPos,
  canTokenMove,
  COLOR_CONFIG,
} from '../../utils/ludoEngine';
import { Crown, Star, ArrowRight, ArrowDown, ArrowLeft, ArrowUp, Bot, User } from 'lucide-react';
import { LudoDice } from './LudoDice';

interface LudoBoardProps {
  players: LudoPlayer[];
  activeColor: LudoColor;
  diceValue: number | null;
  isRolling: boolean;
  canRoll?: boolean;
  waitingForMove: boolean;
  walkingTokenKey?: string | null;
  onSelectToken: (token: LudoToken) => void;
  onRollDice?: (color?: LudoColor) => void;
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
  canRoll = false,
  waitingForMove,
  walkingTokenKey,
  onSelectToken,
  onRollDice,
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

  // Helper to render Position/Rank Badge inside Yard Square upon winning / ranking
  const renderYardPositionBadge = (player?: LudoPlayer) => {
    if (!player || !player.rank) return null;
    const rank = player.rank;
    const isWinner = rank === 1;

    return (
      <div
        className={`absolute inset-1.5 sm:inset-2 rounded-xl flex flex-col items-center justify-center p-2 text-center shadow-2xl z-30 transition-all border-2 ${
          isWinner
            ? 'bg-zinc-950/95 border-amber-400 text-white ring-4 ring-amber-400/50 shadow-amber-500/40'
            : rank === 2
            ? 'bg-zinc-950/92 border-slate-300 text-white ring-2 ring-slate-300/40 shadow-slate-500/20'
            : rank === 3
            ? 'bg-zinc-950/92 border-amber-700/80 text-white ring-2 ring-amber-700/40 shadow-amber-700/20'
            : 'bg-zinc-950/92 border-zinc-700 text-zinc-300 ring-1 ring-zinc-700/30'
        }`}
      >
        <div className="text-2xl sm:text-3xl drop-shadow-md">
          {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '4️⃣'}
        </div>
        <div
          className={`text-[9px] sm:text-xs font-black uppercase tracking-wider mt-0.5 ${
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
      </div>
    );
  };

  // Helper to render the complete inside of each 6x6 Base Home Box
  const renderHomeYard = (player?: LudoPlayer, color: LudoColor = 'red') => {
    const isCurrentActive = activeColor === color;
    const colorCfg = COLOR_CONFIG[color];
    const isHumanTurn = isCurrentActive && canRoll && (!player || !player.isBot);
    const homeCount = homeTokensByColor[color].count;
    const kills = player?.kills || 0;
    const deaths = player?.deaths || 0;
    const playerName = player?.name || colorCfg.name;

    // Corner background colors
    const bgYardClass =
      color === 'red'
        ? 'bg-red-600'
        : color === 'green'
        ? 'bg-emerald-600'
        : color === 'yellow'
        ? 'bg-amber-400'
        : 'bg-blue-600';

    return (
      <div className={`w-full h-full ${bgYardClass} p-1 sm:p-1.5 flex flex-col justify-between items-center relative select-none`}>
        {/* Top Header: Player Name & Avatar Badge */}
        <div
          className={`w-full flex items-center justify-between px-1.5 py-0.5 sm:py-1 rounded-lg transition-all ${
            isCurrentActive
              ? 'bg-zinc-950/90 text-white ring-2 ring-amber-400 shadow-md scale-[1.02]'
              : 'bg-zinc-950/70 text-zinc-200'
          }`}
        >
          <div className="flex items-center gap-1 min-w-0">
            <div
              className="w-4 h-4 sm:w-5 sm:h-5 rounded-full border border-white flex items-center justify-center shrink-0 shadow-xs"
              style={{ background: colorCfg.tokenGradient }}
            >
              {player?.isBot ? (
                <Bot className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white drop-shadow-xs" />
              ) : (
                <User className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white drop-shadow-xs" />
              )}
            </div>
            <span className="text-[9px] sm:text-[11px] font-black truncate max-w-[65px] sm:max-w-[85px]">
              {playerName}
            </span>
          </div>

          {player?.rank ? (
            <span className="text-[8px] sm:text-[9px] px-1 py-0.2 rounded bg-amber-400 text-zinc-950 font-black shrink-0">
              #{player.rank}
            </span>
          ) : isCurrentActive && !waitingForMove ? (
            <span className="text-[8px] sm:text-[9px] px-1 py-0.2 rounded bg-amber-400 text-zinc-950 font-black animate-pulse shrink-0">
              ROLL
            </span>
          ) : null}
        </div>

        {/* Center White Yard Area containing 4 token sockets & central Dice */}
        <div className="w-[88%] h-[65%] sm:h-[68%] bg-white rounded-xl sm:rounded-2xl p-1 sm:p-1.5 relative shadow-md border-2 border-zinc-950/20 flex items-center justify-center">
          {/* 4 Corner Token Sockets */}
          <div className="absolute inset-1 grid grid-cols-2 grid-rows-2 place-items-center pointer-events-none">
            {[0, 1, 2, 3].map((slotIdx) => (
              <div
                key={slotIdx}
                className="w-5 h-5 sm:w-7 sm:h-7 rounded-full bg-stone-50 border-2 border-zinc-300 shadow-inner flex items-center justify-center"
              >
                <div
                  className="w-2 h-2 sm:w-3 sm:h-3 rounded-full opacity-35"
                  style={{ backgroundColor: colorCfg.bgHex }}
                />
              </div>
            ))}
          </div>

          {/* Central Interactive Dice - Only visible when it's this player's active turn */}
          {isCurrentActive && (
            <div className="relative z-20 flex flex-col items-center justify-center animate-in fade-in zoom-in-90 duration-200">
              {/* Animated Yellow Turn Indicator Arrow when it's this player's turn to roll */}
              {!waitingForMove && (
                <div className="absolute -top-3.5 sm:-top-4 left-1/2 -translate-x-1/2 animate-bounce text-amber-400 font-black text-sm sm:text-base drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] pointer-events-none z-30">
                  ▼
                </div>
              )}

              <div
                onClick={() => {
                  if (isHumanTurn) onRollDice?.(color);
                }}
                className={isHumanTurn ? 'cursor-pointer' : ''}
              >
                <LudoDice
                  value={diceValue}
                  isRolling={isRolling}
                  canRoll={isHumanTurn}
                  color={color}
                  playerName={playerName}
                  onRoll={() => onRollDice?.(color)}
                  isBot={player?.isBot}
                  hideSubtext={true}
                  size="yard"
                />
              </div>
            </div>
          )}

          {/* Position / Rank Overlay Badge on Finish */}
          {renderYardPositionBadge(player)}
        </div>

        {/* Bottom Stat Pill: Home Progress, Kills, Deaths */}
        <div className="w-full flex items-center justify-around px-1 py-0.5 rounded-md bg-zinc-950/80 text-[8px] sm:text-[9.5px] font-bold text-white shadow-xs">
          <span className="text-amber-300 flex items-center gap-0.5">
            <span>🏠</span>
            <span>{homeCount}/4</span>
          </span>
          <span className="text-rose-400 flex items-center gap-0.5">
            <span>⚔️</span>
            <span>{kills}</span>
          </span>
          <span className="text-slate-300 flex items-center gap-0.5">
            <span>💀</span>
            <span>{deaths}</span>
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-[min(96vw,calc(100dvh-135px))] max-h-[calc(100dvh-135px)] aspect-square mx-auto flex items-center justify-center select-none">
      
      {/* 15x15 LUDO BOARD STAGE */}
      <div className="relative w-full h-full bg-zinc-950 rounded-2xl p-1 sm:p-2 shadow-2xl border-3 border-zinc-900">
        {/* 15x15 Grid Board Container */}
        <div className="relative w-full h-full grid grid-cols-15 grid-rows-15 rounded-xl overflow-hidden border-2 border-zinc-950 bg-white shadow-inner">
          
          {/* ========================================================================= */}
          {/* 1. TOP-LEFT: RED BASE YARD (6x6: Row 0..5, Col 0..5)                     */}
          {/* ========================================================================= */}
          <div className="col-span-6 row-span-6 border-r-2 border-b-2 border-zinc-950">
            {renderHomeYard(redPlayer, 'red')}
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
                  className={`border-[1.5px] border-zinc-900 flex items-center justify-center relative ${
                    isGreenStart || isGreenHomePath
                      ? 'bg-emerald-500 text-white'
                      : isGreenArrowCell
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-white'
                  }`}
                >
                  {isGreenArrowCell && (
                    <ArrowDown className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-emerald-700 stroke-[3]" />
                  )}
                  {isStar && (
                    <Star className="w-3 h-3 sm:w-4.5 sm:h-4.5 text-zinc-950 fill-none stroke-[2.5]" />
                  )}
                </div>
              );
            })}
          </div>

          {/* ========================================================================= */}
          {/* 3. TOP-RIGHT: GREEN BASE YARD (6x6: Row 0..5, Col 9..14)                 */}
          {/* ========================================================================= */}
          <div className="col-span-6 row-span-6 border-l-2 border-b-2 border-zinc-950">
            {renderHomeYard(greenPlayer, 'green')}
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
                  className={`border-[1.5px] border-zinc-900 flex items-center justify-center relative ${
                    isRedStart || isRedHomePath
                      ? 'bg-red-600 text-white'
                      : isRedArrowCell
                      ? 'bg-red-100 text-red-800'
                      : 'bg-white'
                  }`}
                >
                  {isRedArrowCell && (
                    <ArrowRight className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-red-700 stroke-[3]" />
                  )}
                  {isStar && (
                    <Star className="w-3 h-3 sm:w-4.5 sm:h-4.5 text-zinc-950 fill-none stroke-[2.5]" />
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

            {/* Central Crown Finish Icon */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-zinc-950/90 border-2 border-amber-300 flex items-center justify-center shadow-lg">
                <Crown className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5 text-amber-400 fill-amber-400" />
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
                  className={`border-[1.5px] border-zinc-900 flex items-center justify-center relative ${
                    isYellowStart || isYellowHomePath
                      ? 'bg-amber-400 text-zinc-950'
                      : isYellowArrowCell
                      ? 'bg-amber-100 text-amber-900'
                      : 'bg-white'
                  }`}
                >
                  {isYellowArrowCell && (
                    <ArrowLeft className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-amber-700 stroke-[3]" />
                  )}
                  {isStar && (
                    <Star className="w-3 h-3 sm:w-4.5 sm:h-4.5 text-zinc-950 fill-none stroke-[2.5]" />
                  )}
                </div>
              );
            })}
          </div>

          {/* ========================================================================= */}
          {/* 7. BOTTOM-LEFT: BLUE BASE YARD (6x6: Row 9..14, Col 0..5)                */}
          {/* ========================================================================= */}
          <div className="col-span-6 row-span-6 border-r-2 border-t-2 border-zinc-950">
            {renderHomeYard(bluePlayer, 'blue')}
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
                  className={`border-[1.5px] border-zinc-900 flex items-center justify-center relative ${
                    isBlueStart || isBlueHomePath
                      ? 'bg-blue-500 text-white'
                      : isBlueArrowCell
                      ? 'bg-blue-100 text-blue-900'
                      : 'bg-white'
                  }`}
                >
                  {isBlueArrowCell && (
                    <ArrowUp className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-blue-700 stroke-[3]" />
                  )}
                  {isStar && (
                    <Star className="w-3 h-3 sm:w-4.5 sm:h-4.5 text-zinc-950 fill-none stroke-[2.5]" />
                  )}
                </div>
              );
            })}
          </div>

          {/* ========================================================================= */}
          {/* 9. BOTTOM-RIGHT: YELLOW BASE YARD (6x6: Row 9..14, Col 9..14)            */}
          {/* ========================================================================= */}
          <div className="col-span-6 row-span-6 border-l-2 border-t-2 border-zinc-950">
            {renderHomeYard(yellowPlayer, 'yellow')}
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

              // Dynamic scaling: when multiple tokens sit on the same track cell, shrink tokens so all are visible
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
                    zIndex: isWalking ? 60 : isMovable ? 50 : 25 + stackIdx,
                    transition: isWalking
                      ? 'left 75ms linear, top 75ms linear'
                      : 'left 80ms ease-out, top 80ms ease-out',
                  }}
                  className={`absolute flex items-center justify-center touch-manipulation ${
                    isMovable && !isWalking ? 'cursor-pointer pointer-events-auto active:scale-95' : 'cursor-default pointer-events-none'
                  }`}
                >
                  {/* Authentic 3D Pawn matching classic Pin pawn */}
                  <div
                    style={{ transform: `scale(${multiScale})` }}
                    className={`relative flex flex-col items-center justify-center transition-transform origin-center ${
                      isWalking
                        ? 'scale-125 -translate-y-2'
                        : isMovable
                        ? 'ring-4 ring-amber-400 ring-offset-2 ring-offset-zinc-950 rounded-full animate-bounce scale-110'
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
                      {/* Inner glossy core / lens with Token ID */}
                      <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-white/40 border border-white/80 shadow-inner flex items-center justify-center">
                        <span className="text-[8px] sm:text-[9px] font-black text-white drop-shadow-md">
                          {token.id + 1}
                        </span>
                      </div>

                      {/* Movable Crown/Indicator Halo */}
                      {isMovable && !isWalking && (
                        <span className="absolute -top-1 -right-1 w-3 h-3 sm:w-3.5 sm:h-3.5 bg-amber-400 rounded-full border border-zinc-900 flex items-center justify-center shadow-xs">
                          <span className="w-1.5 h-1.5 bg-zinc-950 rounded-full animate-ping" />
                        </span>
                      )}
                    </div>

                    {/* Bottom Ring / Pin Base Shadow */}
                    <div
                      className={`w-3.5 sm:w-4.5 -mt-0.5 rounded-full blur-[0.5px] transition-all ${
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

    </div>
  );
};
