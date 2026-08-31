import React, { useEffect, useState, useRef } from 'react';
import { LudoColor, COLOR_CONFIG } from '../../utils/ludoEngine';
import { Sparkles } from 'lucide-react';

interface LudoDiceProps {
  value: number | null;
  isRolling: boolean;
  canRoll: boolean;
  color: LudoColor;
  playerName?: string;
  onRoll: () => void;
  isBot?: boolean;
  hideSubtext?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'yard';
}

export const LudoDice: React.FC<LudoDiceProps> = ({
  value,
  isRolling,
  canRoll,
  color,
  playerName,
  onRoll,
  isBot = false,
  hideSubtext = false,
  size = 'md',
}) => {
  const [displayedValue, setDisplayedValue] = useState<number>(value || 1);
  const colorCfg = COLOR_CONFIG[color];
  const lastClickTimeRef = useRef<number>(0);

  // Debounced safe click handler preventing rapid double-taps
  const handleSafeClick = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    const now = Date.now();
    if (now - lastClickTimeRef.current < 180) {
      return;
    }
    if (!canRoll || isRolling || isBot) {
      return;
    }
    lastClickTimeRef.current = now;
    onRoll();
  };

  // Cycling dice numbers when rolling animation runs (rapid, high-energy shuffle)
  useEffect(() => {
    let interval: any;
    if (isRolling) {
      interval = setInterval(() => {
        setDisplayedValue(Math.floor(Math.random() * 6) + 1);
      }, 25);
    } else if (value) {
      setDisplayedValue(value);
    }
    return () => clearInterval(interval);
  }, [isRolling, value]);

  // Dice visual styling based on active player's color
  const getDiceVisuals = () => {
    switch (color) {
      case 'red':
        return {
          diceBg: 'bg-gradient-to-br from-red-500 via-rose-600 to-red-700',
          innerBg: 'bg-gradient-to-b from-red-500 to-red-600',
          borderColor: 'border-red-400',
          dotColor: 'bg-white shadow-[0_1px_2px_rgba(0,0,0,0.4)]',
          glowHex: '#EF4444',
          labelColor: 'text-red-600 dark:text-red-400',
        };
      case 'green':
        return {
          diceBg: 'bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-700',
          innerBg: 'bg-gradient-to-b from-emerald-500 to-emerald-600',
          borderColor: 'border-emerald-300',
          dotColor: 'bg-white shadow-[0_1px_2px_rgba(0,0,0,0.4)]',
          glowHex: '#10B981',
          labelColor: 'text-emerald-600 dark:text-emerald-400',
        };
      case 'yellow':
        return {
          diceBg: 'bg-gradient-to-br from-amber-300 via-amber-400 to-yellow-500',
          innerBg: 'bg-gradient-to-b from-amber-400 to-yellow-500',
          borderColor: 'border-amber-200',
          dotColor: 'bg-zinc-950 shadow-[0_1px_2px_rgba(255,255,255,0.4)]',
          glowHex: '#F59E0B',
          labelColor: 'text-amber-600 dark:text-amber-400',
        };
      case 'blue':
        return {
          diceBg: 'bg-gradient-to-br from-blue-400 via-blue-500 to-indigo-700',
          innerBg: 'bg-gradient-to-b from-blue-500 to-blue-600',
          borderColor: 'border-blue-300',
          dotColor: 'bg-white shadow-[0_1px_2px_rgba(0,0,0,0.4)]',
          glowHex: '#3B82F6',
          labelColor: 'text-blue-600 dark:text-blue-400',
        };
      default:
        return {
          diceBg: 'bg-gradient-to-b from-white via-zinc-100 to-zinc-200',
          innerBg: 'bg-white',
          borderColor: 'border-zinc-300',
          dotColor: 'bg-zinc-900',
          glowHex: '#F59E0B',
          labelColor: 'text-amber-600 dark:text-amber-400',
        };
    }
  };

  const visuals = getDiceVisuals();

  // Size dimensions
  const isYard = size === 'yard';
  const sizeClasses = isYard
    ? 'w-8 h-8 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-lg sm:rounded-xl p-0.5 sm:p-1'
    : size === 'sm'
    ? 'w-10 h-10 rounded-xl p-1'
    : size === 'lg'
    ? 'w-18 h-18 sm:w-22 sm:h-22 rounded-2xl p-1.5'
    : 'w-14 h-14 sm:w-16 sm:h-16 rounded-2xl p-1.5';

  const dotSizeClass = isYard
    ? 'w-1.5 h-1.5 sm:w-2 sm:h-2'
    : size === 'sm'
    ? 'w-1.5 h-1.5 sm:w-2 sm:h-2'
    : size === 'lg'
    ? 'w-2.5 h-2.5 sm:w-3 sm:h-3'
    : 'w-2 h-2 sm:w-2.5 sm:h-2.5';

  // Dot patterns for values 1 to 6
  const renderDots = (num: number) => {
    const dotClass = `rounded-full ${visuals.dotColor} ${dotSizeClass}`;

    switch (num) {
      case 1:
        return (
          <div className="w-full h-full flex items-center justify-center">
            <div className={`${isYard ? 'w-2.5 h-2.5 sm:w-3 sm:h-3' : 'w-3 h-3 sm:w-3.5 sm:h-3.5'} rounded-full ${visuals.dotColor}`} />
          </div>
        );
      case 2:
        return (
          <div className="w-full h-full flex justify-between p-0.5 sm:p-1">
            <div className={`${dotClass} self-start`} />
            <div className={`${dotClass} self-end`} />
          </div>
        );
      case 3:
        return (
          <div className="w-full h-full flex justify-between p-0.5 sm:p-1">
            <div className={`${dotClass} self-start`} />
            <div className={`${dotClass} self-center`} />
            <div className={`${dotClass} self-end`} />
          </div>
        );
      case 4:
        return (
          <div className="w-full h-full grid grid-cols-2 p-0.5 sm:p-1 gap-0.5 place-items-center">
            <div className={dotClass} />
            <div className={dotClass} />
            <div className={dotClass} />
            <div className={dotClass} />
          </div>
        );
      case 5:
        return (
          <div className="w-full h-full relative p-0.5 sm:p-1">
            <div className={`${dotClass} absolute top-0.5 left-0.5 sm:top-1 sm:left-1`} />
            <div className={`${dotClass} absolute top-0.5 right-0.5 sm:top-1 sm:right-1`} />
            <div className={`${dotClass} absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2`} />
            <div className={`${dotClass} absolute bottom-0.5 left-0.5 sm:bottom-1 sm:left-1`} />
            <div className={`${dotClass} absolute bottom-0.5 right-0.5 sm:bottom-1 sm:right-1`} />
          </div>
        );
      case 6:
        return (
          <div className="w-full h-full grid grid-cols-2 grid-rows-3 p-0.5 sm:p-1 gap-x-0.5 sm:gap-x-1 gap-y-0.5 place-items-center">
            <div className={dotClass} />
            <div className={dotClass} />
            <div className={dotClass} />
            <div className={dotClass} />
            <div className={dotClass} />
            <div className={dotClass} />
          </div>
        );
      default:
        return null;
    }
  };

  const activeName = playerName || colorCfg.name;

  return (
    <div className="flex flex-col items-center">
      <button
        id={`btn-dice-${color}`}
        type="button"
        disabled={!canRoll || isRolling || isBot}
        onClick={handleSafeClick}
        className={`relative ${sizeClasses} ${visuals.diceBg} border-2 ${visuals.borderColor} transition-all select-none shadow-xl ${
          canRoll && !isBot
            ? `ring-4 ring-amber-400 ring-offset-2 ring-offset-zinc-950 animate-bounce cursor-pointer scale-105 shadow-2xl active:scale-95`
            : `opacity-90 cursor-default ${isBot ? 'pointer-events-none' : ''}`
        } ${isRolling ? 'animate-spin pointer-events-none' : ''}`}
        style={{
          boxShadow: canRoll
            ? `0 0 25px ${visuals.glowHex}dd, 0 8px 18px rgba(0,0,0,0.6)`
            : `0 4px 10px rgba(0,0,0,0.4)`,
        }}
      >
        <div className={`w-full h-full rounded-lg sm:rounded-xl ${visuals.innerBg} flex items-center justify-center shadow-inner border border-white/25`}>
          {renderDots(displayedValue)}
        </div>

        {/* Glow indicator if rolling a 6 */}
        {value === 6 && !isRolling && (
          <span className="absolute -top-2 -right-2 bg-amber-400 text-zinc-950 p-1 sm:p-1.5 rounded-full text-[9px] sm:text-[10px] font-black shadow-lg animate-pulse ring-2 ring-zinc-950">
            <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          </span>
        )}
      </button>

      {!hideSubtext && !isYard && (
        <>
          {canRoll && !isBot && (
            <div className="mt-2 text-center">
              <span
                className="text-xs sm:text-sm font-black uppercase tracking-wider animate-pulse drop-shadow-sm flex items-center justify-center gap-1"
                style={{ color: visuals.glowHex }}
              >
                <span>{activeName}</span>
                <span className="text-zinc-600 dark:text-zinc-400 font-bold">to roll</span>
              </span>
            </div>
          )}
          {isBot && canRoll && (
            <div className="mt-2 text-center">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                {activeName} (Bot) Rolling...
              </span>
            </div>
          )}
          {!canRoll && !isRolling && value && (
            <div className="mt-2 text-center">
              <span className="text-xs font-bold text-zinc-400">
                {activeName} rolled {value}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
};
