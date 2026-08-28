import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLeague } from '../context/LeagueContext';
import { Trophy, Plus, LogIn, LogOut, Sun, Moon, ChevronDown, Check, ShieldCheck, Flame, Crown, Gamepad2 } from 'lucide-react';

interface HeaderProps {
  appName: string;
  onOpenNewMatch: () => void;
  onOpenLogin: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  darkMode: boolean;
  setDarkMode: (val: boolean | ((prev: boolean) => boolean)) => void;
}

export const Header: React.FC<HeaderProps> = ({
  appName,
  onOpenNewMatch,
  onOpenLogin,
  activeTab,
  setActiveTab,
  darkMode,
  setDarkMode
}) => {
  const { user, logout } = useAuth();
  const { leagues, activeLeague, activeLeagueId, setActiveLeagueId } = useLeague();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [leagueMenuOpen, setLeagueMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-zinc-950/85 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800/80 shadow-xs dark:shadow-lg transition-colors">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2 sm:gap-4">
          
          {/* Left: Brand & League Selector */}
          <div className="flex items-center space-x-2 sm:space-x-3.5 min-w-0">
            {/* Ludo Distinctive Icon / Favicon Logo */}
            <div className="w-9 h-9 sm:w-10 sm:h-10 shrink-0 rounded-2xl bg-zinc-900 dark:bg-zinc-950 p-1 border border-amber-500/40 flex items-center justify-center shadow-md shadow-amber-500/10">
              <svg className="w-full h-full" viewBox="0 0 64 64" fill="none">
                <rect width="64" height="64" rx="14" fill="#09090B"/>
                <rect x="2" y="2" width="60" height="60" rx="12" fill="#18181B" stroke="#27272A" strokeWidth="2"/>
                <rect x="8" y="8" width="21" height="21" rx="5" fill="#EF4444"/>
                <circle cx="18.5" cy="18.5" r="4" fill="#FEF2F2"/>
                <rect x="35" y="8" width="21" height="21" rx="5" fill="#10B981"/>
                <circle cx="45.5" cy="18.5" r="4" fill="#ECFDF5"/>
                <rect x="8" y="35" width="21" height="21" rx="5" fill="#3B82F6"/>
                <circle cx="18.5" cy="45.5" r="4" fill="#EFF6FF"/>
                <rect x="35" y="35" width="21" height="21" rx="5" fill="#F59E0B"/>
                <circle cx="45.5" cy="45.5" r="4" fill="#FFFBEB"/>
                <polygon points="32,21 43,32 32,43 21,32" fill="#FBBF24" stroke="#F59E0B" strokeWidth="1.5"/>
                <path d="M28 34.5 L36 34.5 L36 32.5 L34.5 33 L32 28.5 L29.5 33 L28 32.5 Z" fill="#78350F"/>
              </svg>
            </div>

            {/* App Brand Name */}
            <div className="flex flex-col min-w-0">
              <span className="font-black text-sm sm:text-base md:text-lg tracking-tight bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 dark:from-zinc-100 dark:via-amber-300 dark:to-orange-400 bg-clip-text text-transparent truncate">
                {appName || 'Ludo League Master'}
              </span>
            </div>

            {/* Global League Switcher Pill */}
            <div className="relative">
              <button
                id="btn-league-dropdown"
                onClick={() => setLeagueMenuOpen(!leagueMenuOpen)}
                className="flex items-center space-x-1.5 sm:space-x-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-bold text-xs sm:text-sm transition-all cursor-pointer shadow-xs max-w-[140px] sm:max-w-[220px]"
                title="Switch Active Ludo League"
              >
                <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span className="truncate font-black">{activeLeague?.name || 'AC Ludo League 1'}</span>
                <ChevronDown className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              </button>

              {/* League Selector Dropdown */}
              {leagueMenuOpen && (
                <div className="absolute left-0 mt-2 w-64 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-3 py-1.5 border-b border-zinc-100 dark:border-zinc-800/80 mb-1 flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                      Select League
                    </span>
                    <span className="text-[10px] font-bold text-amber-500">
                      {leagues.length} Available
                    </span>
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-0.5 px-1.5">
                    {leagues.map((lg) => {
                      const isSelected = lg.id === activeLeagueId;
                      return (
                        <button
                          key={lg.id}
                          id={`btn-select-league-${lg.id}`}
                          onClick={() => {
                            setActiveLeagueId(lg.id);
                            setLeagueMenuOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs font-bold transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-amber-500 text-zinc-950 shadow-xs'
                              : 'text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <div className="truncate font-black flex items-center gap-1.5">
                              {lg.name}
                              {lg.is_default === 1 && (
                                <span className={`text-[9px] px-1.5 py-0.2 rounded uppercase font-extrabold ${isSelected ? 'bg-zinc-950 text-amber-300' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'}`}>
                                  Default
                                </span>
                              )}
                            </div>
                            <div className={`text-[10px] truncate ${isSelected ? 'text-zinc-900 font-semibold' : 'text-zinc-400'}`}>
                              {lg.total_matches !== undefined ? `${lg.total_matches} matches recorded` : lg.code}
                            </div>
                          </div>
                          {isSelected && <Check className="w-4 h-4 shrink-0 stroke-[3]" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: Quick Actions, Theme Toggle & Auth */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Play Ludo Button */}
            <button
              id="btn-play-ludo-header"
              onClick={() => setActiveTab('play-ludo')}
              className={`inline-flex items-center space-x-1.5 px-3 sm:px-3.5 py-2 text-xs font-black rounded-xl border transition-all cursor-pointer shrink-0 ${
                activeTab === 'play-ludo'
                  ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-md shadow-amber-500/20'
                  : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30'
              }`}
              title="Play Live Ludo Game"
            >
              <Gamepad2 className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="hidden sm:inline">Play Ludo</span>
              <span className="sm:hidden">Play</span>
            </button>

            {/* Record Match Button */}
            {(user?.role === 'admin' || user?.role === 'operator') && (
              <button
                id="btn-record-match-header"
                onClick={onOpenNewMatch}
                className="inline-flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-2 text-xs font-extrabold text-zinc-950 bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:from-amber-500 hover:to-orange-600 rounded-xl shadow-md shadow-orange-500/20 active:scale-95 transition-all cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span className="hidden sm:inline">Record Match</span>
                <span className="sm:hidden">Match</span>
              </button>
            )}

            {/* Dark Mode Toggle */}
            <button
              id="btn-darkmode-toggle"
              onClick={() => setDarkMode((prev) => !prev)}
              className="p-2 rounded-xl text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/80 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer border border-zinc-200 dark:border-transparent shrink-0"
              title="Toggle Dark/Light Mode"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-zinc-700" />}
            </button>

            {/* User Profile / Login */}
            {user ? (
              <div className="relative">
                <button
                  id="btn-user-menu"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center space-x-2 p-1.5 rounded-2xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors border border-zinc-200 dark:border-zinc-800 cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black text-xs border border-amber-500/30">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="hidden md:block text-left pr-1">
                    <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{user.name}</div>
                    <div className="text-[10px] text-zinc-500 dark:text-zinc-400 capitalize">{user.role}</div>
                  </div>
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 py-1 z-50">
                    <div className="px-4 py-2 border-b border-zinc-100 dark:border-zinc-800">
                      <p className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500">Signed in as</p>
                      <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">{user.username}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 text-[9px] font-extrabold uppercase rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        {user.role}
                      </span>
                    </div>
                    <button
                      id="btn-user-logout"
                      onClick={() => {
                        setUserMenuOpen(false);
                        logout();
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center space-x-2 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                id="btn-open-login"
                onClick={onOpenLogin}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-bold text-zinc-700 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-800 transition-colors cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5 text-amber-500" />
                <span>Sign In</span>
              </button>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};
