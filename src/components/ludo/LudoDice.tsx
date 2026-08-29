import React, { useEffect, useState } from 'react';
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
}) => {
  const [displayedValue, setDisplayedValue] = useState<number>(value || 1);
  const colorCfg = COLOR_CONFIG[color];

  // Cycling dice numbers when rolling animation runs
  useEffect(() => {
    let interval: any;
    if (isRolling) {
      interval = setInterval(() => {
        setDisplayedValue(Math.floor(Math.random() * 6) + 1);
      }, 70);
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

  // Dot patterns for values 1 to 6
  const renderDots = (num: number) => {
    const dotClass = `rounded-full ${visuals.dotColor}`;

    switch (num) {
      case 1:
        return (
          <div className="w-full h-full flex items-center justify-center">
            <div className={`w-4 h-4 sm:w-5 sm:h-5 ${dotClass}`} />
          </div>
        );
      case 2:
        return (
          <div className="w-full h-full flex justify-between p-1.5">
            <div className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${dotClass} self-start`} />
            <div className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${dotClass} self-end`} />
          </div>
        );
      case 3:
        return (
          <div className="w-full h-full flex justify-between p-1.5">
            <div className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${dotClass} self-start`} />
            <div className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${dotClass} self-center`} />
            <div className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${dotClass} self-end`} />
          </div>
        );
      case 4:
        return (
          <div className="w-full h-full grid grid-cols-2 p-1.5 gap-1.5 place-items-center">
            <div className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${dotClass}`} />
            <div className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${dotClass}`} />
            <div className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${dotClass}`} />
            <div className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${dotClass}`} />
          </div>
        );
      case 5:
        return (
          <div className="w-full h-full relative p-1.5">
            <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 ${dotClass} absolute top-1.5 left-1.5`} />
            <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 ${dotClass} absolute top-1.5 right-1.5`} />
            <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 ${dotClass} absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2`} />
            <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 ${dotClass} absolute bottom-1.5 left-1.5`} />
            <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 ${dotClass} absolute bottom-1.5 right-1.5`} />
          </div>
        );
      case 6:
        return (
          <div className="w-full h-full grid grid-cols-2 grid-rows-3 p-1.5 gap-1 place-items-center">
            <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 ${dotClass}`} />
            <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 ${dotClass}`} />
            <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 ${dotClass}`} />
            <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 ${dotClass}`} />
            <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 ${dotClass}`} />
            <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 ${dotClass}`} />
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
        onClick={onRoll}
        className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl p-1.5 ${visuals.diceBg} border-2 ${visuals.borderColor} transition-all select-none shadow-xl ${
          canRoll && !isBot
            ? `ring-4 ring-offset-2 ring-offset-zinc-950 animate-bounce cursor-pointer scale-105 shadow-2xl`
            : `opacity-90 cursor-default`
        } ${isRolling ? 'animate-spin' : ''}`}
        style={{
          boxShadow: canRoll
            ? `0 0 25px ${visuals.glowHex}bb, 0 10px 20px rgba(0,0,0,0.5)`
            : `0 4px 10px rgba(0,0,0,0.3)`,
        }}
      >
        <div className={`w-full h-full rounded-xl ${visuals.innerBg} flex items-center justify-center shadow-inner border border-white/20`}>
          {renderDots(displayedValue)}
        </div>

        {/* Glow indicator if rolling a 6 */}
        {value === 6 && !isRolling && (
          <span className="absolute -top-2.5 -right-2.5 bg-amber-400 text-zinc-950 p-1.5 rounded-full text-[10px] font-black shadow-lg animate-pulse ring-2 ring-zinc-950">
            <Sparkles className="w-3.5 h-3.5" />
          </span>
        )}
      </button>

      {!hideSubtext && (
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
