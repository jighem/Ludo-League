import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { LudoRulesModal } from './ludo/LudoRulesModal';
import {
  LayoutDashboard,
  Gamepad2,
  Trophy,
  History,
  Users,
  Swords,
  BarChart3,
  Award,
  Settings,
  BookOpen,
  HelpCircle
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { user } = useAuth();
  const [showRulesModal, setShowRulesModal] = useState(false);

  const navItems = [
    { id: 'play-ludo', label: 'Play Ludo (Live)', icon: Gamepad2, highlight: true },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'leaderboards', label: 'Leaderboards', icon: Trophy },
    { id: 'matches', label: 'Match History', icon: History },
    { id: 'players', label: 'Players', icon: Users },
    { id: 'head-to-head', label: 'Head-to-Head', icon: Swords },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'awards', label: 'Awards & History', icon: Award },
    ...(user?.role === 'admin'
      ? [
          { id: 'settings', label: 'Admin Settings', icon: Settings },
          { id: 'installation', label: 'Installation Guide', icon: BookOpen }
        ]
      : [])
  ];

  return (
    <>
      <nav className="bg-white dark:bg-zinc-900/80 rounded-3xl p-3 border border-zinc-200 dark:border-zinc-800/80 shadow-md dark:shadow-xl h-fit w-full md:w-64 shrink-0 transition-colors flex flex-col justify-between">
        <div className="flex md:flex-col overflow-x-auto md:overflow-x-visible space-x-1 md:space-x-0 md:space-y-1.5 scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const isPlayLudo = item.id === 'play-ludo';

            return (
              <button
                key={item.id}
                id={`nav-tab-${item.id}`}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-2xl font-semibold text-xs transition-all cursor-pointer ${
                  isActive
                    ? 'bg-amber-500/10 dark:bg-gradient-to-r dark:from-amber-500/20 dark:to-orange-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30 shadow-xs font-extrabold'
                    : isPlayLudo
                    ? 'text-amber-600 dark:text-amber-400 bg-amber-500/5 hover:bg-amber-500/15 border border-amber-500/20 font-bold'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive || isPlayLudo ? 'text-amber-600 dark:text-amber-400' : 'text-zinc-400 dark:text-zinc-500'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Quick Rules & Scoring trigger */}
        <div className="hidden md:block pt-3 mt-3 border-t border-zinc-100 dark:border-zinc-800">
          <button
            id="btn-sidebar-rules"
            type="button"
            onClick={() => setShowRulesModal(true)}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-amber-500/5 hover:bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/20 text-xs font-bold transition-all cursor-pointer"
          >
            <div className="flex items-center space-x-2.5">
              <HelpCircle className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Rules & Scoring</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-700 dark:text-amber-300 font-extrabold">
              Guide
            </span>
          </button>
        </div>
      </nav>

      {/* Global Rules Modal */}
      <LudoRulesModal
        isOpen={showRulesModal}
        onClose={() => setShowRulesModal(false)}
      />
    </>
  );
};
