import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { loadSettings, saveSettings } from "../library/persist";
import { DEFAULT_SETTINGS, type AppSettings } from "../library/settings";

type SettingsContextType = {
  settings: AppSettings;
  updateSettings: (changes: Partial<AppSettings>) => void;
};

export const SettingsContext = createContext<SettingsContextType>({
  settings: DEFAULT_SETTINGS,
  updateSettings: () => { },
});

/** App-wide settings (see `library/settings.ts`): loaded once, saved on every change. */
export const SettingsProvider = ({ children }: { children: React.ReactNode }) => {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);

  useEffect(() => saveSettings(settings), [settings]);

  const updateSettings = useCallback((changes: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...changes }));
  }, []);

  const value = useMemo(() => ({ settings, updateSettings }), [settings, updateSettings]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

export const useSettings = () => useContext(SettingsContext);
