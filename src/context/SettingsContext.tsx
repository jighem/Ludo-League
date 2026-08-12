import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiRequest } from '../api/client';

interface SettingsContextType {
  appName: string;
  minMatchesQual: number;
  loadingSettings: boolean;
  refreshSettings: () => Promise<void>;
  setAppNameLocal: (name: string) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [appName, setAppName] = useState<string>('Ludo League');
  const [minMatchesQual, setMinMatchesQual] = useState<number>(8);
  const [loadingSettings, setLoadingSettings] = useState<boolean>(true);

  const refreshSettings = async () => {
    try {
      setLoadingSettings(true);
      const res = await apiRequest<{ settings: { minMatchesQualification: number; appName: string } }>('/settings');
      if (res?.settings) {
        if (res.settings.appName) {
          const cleanName = res.settings.appName.trim() || 'Ludo League';
          setAppName(cleanName);
          document.title = cleanName;
        }
        if (res.settings.minMatchesQualification) {
          setMinMatchesQual(res.settings.minMatchesQualification);
        }
      }
    } catch (err) {
      console.error('Failed to load application settings:', err);
    } finally {
      setLoadingSettings(false);
    }
  };

  useEffect(() => {
    refreshSettings();
  }, []);

  const setAppNameLocal = (name: string) => {
    const cleanName = name.trim() || 'Ludo League';
    setAppName(cleanName);
    document.title = cleanName;
  };

  return (
    <SettingsContext.Provider
      value={{
        appName,
        minMatchesQual,
        loadingSettings,
        refreshSettings,
        setAppNameLocal
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
