import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Trophy,
  History,
  Users,
  Swords,
  BarChart3,
  Award,
  Settings,
  BookOpen
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { user } = useAuth();

  const navItems = [
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
    <nav className="bg-zinc-900/80 rounded-3xl p-3 border border-zinc-800/80 shadow-xl h-fit w-full md:w-64 shrink-0">
      <div className="flex md:flex-col overflow-x-auto md:overflow-x-visible space-x-1 md:space-x-0 md:space-y-1.5 scrollbar-none">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              id={`nav-tab-${item.id}`}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-2xl font-semibold text-xs transition-all cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/10 text-amber-400 border border-amber-500/30 shadow-md shadow-amber-500/5 font-extrabold'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 border border-transparent'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-amber-400' : 'text-zinc-500'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
