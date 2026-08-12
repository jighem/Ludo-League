import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Trophy, Plus, LogIn, LogOut, Sun, Moon, Shield, User as UserIcon } from 'lucide-react';

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
  darkMode,
  setDarkMode
}) => {
  const { user, logout } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-zinc-950/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800/80 shadow-xs dark:shadow-lg transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-red-500 flex items-center justify-center text-zinc-950 shadow-md shadow-orange-500/20 font-black">
              <Trophy className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <span className="font-black text-xl tracking-tight bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 dark:from-zinc-100 dark:via-amber-300 dark:to-orange-400 bg-clip-text text-transparent">
                {appName || 'Ludo League'}
              </span>
              <span className="hidden sm:inline-block ml-2 px-2 py-0.5 text-[10px] font-extrabold uppercase rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 tracking-wider">
                Official Ranking
              </span>
            </div>
          </div>

          {/* Quick Actions & Auth */}
          <div className="flex items-center space-x-3">
            {/* Record Match Button */}
            {(user?.role === 'admin' || user?.role === 'operator') && (
              <button
                id="btn-record-match-header"
                onClick={onOpenNewMatch}
                className="inline-flex items-center space-x-2 px-4 py-2 text-xs font-extrabold text-zinc-950 bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:from-amber-500 hover:to-orange-600 rounded-xl shadow-md shadow-orange-500/20 active:scale-95 transition-all cursor-pointer"
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
              className="p-2 rounded-xl text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/80 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer border border-zinc-200 dark:border-transparent"
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
                  className="flex items-center space-x-2 p-1.5 rounded-2xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors border border-zinc-200 dark:border-zinc-800"
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
                      className="w-full text-left px-4 py-2 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center space-x-2 cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Log Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                id="btn-login"
                onClick={onOpenLogin}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-bold text-zinc-700 hover:text-zinc-900 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 rounded-xl border border-zinc-200 dark:border-zinc-800 transition-colors cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
