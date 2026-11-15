import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { loadSettings, saveSettings, watchSettings } from "../library/persist";
import { DEFAULT_SETTINGS, type AppSettings, type ResultTableType } from "../library/settings";

type SettingsContextType = {
  settings: AppSettings;
  updateSettings: (changes: Partial<AppSettings>) => void;
  updateHiddenColumns: (table: ResultTableType, fields: string[]) => void;
};

export const SettingsContext = createContext<SettingsContextType>({
  settings: DEFAULT_SETTINGS,
  updateSettings: () => { },
  updateHiddenColumns: () => { },
});

/**
 * App-wide settings (see `library/settings.ts`): loaded once, saved on every change, and followed
 * when another window changes them.
 */
export const SettingsProvider = ({ children }: { children: React.ReactNode }) => {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);

  useEffect(() => saveSettings(settings), [settings]);
  // Saving what another window wrote is a no-op: an unchanged value fires no storage event.
  useEffect(() => watchSettings(setSettings), []);

  const updateSettings = useCallback((changes: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...changes }));
  }, []);

  const updateHiddenColumns = useCallback((table: ResultTableType, fields: string[]) => {
    setSettings(prev => ({ ...prev, hiddenColumns: { ...prev.hiddenColumns, [table]: fields } }));
  }, []);

  const value = useMemo(() => ({ settings, updateSettings, updateHiddenColumns }), [settings, updateSettings, updateHiddenColumns]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

export const useSettings = () => useContext(SettingsContext);
