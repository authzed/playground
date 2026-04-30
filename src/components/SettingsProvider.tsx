import { createContext, useContext, useEffect, useState } from "react";

type SettingsContextValue = {
  minimapEnabled: boolean;
  setMinimapEnabled: (enabled: boolean) => void;
};

const STORAGE_KEY = "playground:settings:minimap";

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

function readInitial(): boolean {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === "true") return true;
    if (raw === "false") return false;
  } catch {
    // localStorage unavailable — fall through.
  }
  return false;
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [minimapEnabled, setMinimapEnabledState] = useState<boolean>(() => readInitial());

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, String(minimapEnabled));
    } catch {
      // Persisting failed (quota, private mode); state still applies in-session.
    }
  }, [minimapEnabled]);

  const value: SettingsContextValue = {
    minimapEnabled,
    setMinimapEnabled: setMinimapEnabledState,
  };

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (ctx === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return ctx;
}
