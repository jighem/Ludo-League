import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { League } from '../types';
import { apiRequest } from '../api/client';

interface LeagueContextType {
  leagues: League[];
  activeLeague: League | null;
  activeLeagueId: number;
  dataVersion: number;
  loadingLeagues: boolean;
  setActiveLeagueId: (id: number) => void;
  refreshLeagues: () => Promise<void>;
  triggerDataRefresh: () => void;
}

const LeagueContext = createContext<LeagueContextType | undefined>(undefined);

export const LeagueProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [dataVersion, setDataVersion] = useState<number>(0);
  const [activeLeagueId, setActiveLeagueIdState] = useState<number>(() => {
    const saved = localStorage.getItem('ludo_active_league_id');
    return saved ? Number(saved) : 1;
  });
  const [loadingLeagues, setLoadingLeagues] = useState<boolean>(true);

  const triggerDataRefresh = () => {
    setDataVersion((v) => v + 1);
    refreshLeagues();
  };

  const refreshLeagues = async () => {
    try {
      setLoadingLeagues(true);
      const res = await apiRequest<{ leagues: League[] }>('/leagues');
      if (res?.leagues && res.leagues.length > 0) {
        setLeagues(res.leagues);

        // Check if currently selected league exists and is active
        const exists = res.leagues.find((l) => l.id === activeLeagueId);
        if (!exists) {
          // Find default or first league
          const defaultLeague = res.leagues.find((l) => l.is_default === 1 && l.is_active === 1) || res.leagues[0];
          if (defaultLeague) {
            setActiveLeagueIdState(defaultLeague.id);
            localStorage.setItem('ludo_active_league_id', String(defaultLeague.id));
          }
        }
      }
    } catch (err) {
      console.error('Failed to load leagues:', err);
    } finally {
      setLoadingLeagues(false);
    }
  };

  useEffect(() => {
    refreshLeagues();
  }, []);

  const setActiveLeagueId = (id: number) => {
    setActiveLeagueIdState(id);
    localStorage.setItem('ludo_active_league_id', String(id));
  };

  const activeLeague = leagues.find((l) => l.id === activeLeagueId) || leagues[0] || null;

  return (
    <LeagueContext.Provider
      value={{
        leagues,
        activeLeague,
        activeLeagueId,
        dataVersion,
        loadingLeagues,
        setActiveLeagueId,
        refreshLeagues,
        triggerDataRefresh
      }}
    >
      {children}
    </LeagueContext.Provider>
  );
};

export const useLeague = () => {
  const context = useContext(LeagueContext);
  if (!context) {
    throw new Error('useLeague must be used within a LeagueProvider');
  }
  return context;
};
