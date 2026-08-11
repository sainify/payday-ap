import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, ApiError } from "@/lib/api";
import { User, UserSettings } from "@/types";
import { getPrivacyMode, setPrivacyMode as persistPrivacy, getTheme, setTheme as persistTheme } from "@/lib/storage";

interface AppContextValue {
  user: User | null;
  settings: UserSettings | null;
  loading: boolean;
  privacyMode: boolean;
  theme: "light" | "dark" | "system";
  togglePrivacy: () => void;
  setTheme: (t: "light" | "dark" | "system") => void;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  updateSettings: (patch: Partial<UserSettings>) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

function applyThemeClass(theme: "light" | "dark" | "system") {
  const root = document.documentElement;
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const dark = theme === "dark" || (theme === "system" && prefersDark);
  root.classList.toggle("dark", dark);
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [privacyMode, setPrivacyModeState] = useState(getPrivacyMode());
  const [theme, setThemeState] = useState(getTheme());

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const me = await api.get<{ user: User; settings: UserSettings }>("/me");
      setUser(me.user);
      setSettings(me.settings);
      if (me.settings.theme) {
        setThemeState(me.settings.theme);
        persistTheme(me.settings.theme);
      }
    } catch (e) {
      if (e instanceof ApiError && (e.status === 401 || e.status === 404)) {
        setUser(null);
        setSettings(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    applyThemeClass(theme);
  }, [theme]);

  const togglePrivacy = () => {
    const next = !privacyMode;
    setPrivacyModeState(next);
    persistPrivacy(next);
  };

  const setTheme = (t: "light" | "dark" | "system") => {
    setThemeState(t);
    persistTheme(t);
    applyThemeClass(t);
    if (user) api.patch("/settings", { theme: t }).catch(() => {});
  };

  const logout = async () => {
    await api.post("/auth/logout").catch(() => {});
    setUser(null);
    setSettings(null);
  };

  const updateSettings = async (patch: Partial<UserSettings>) => {
    const updated = await api.patch<UserSettings>("/settings", patch);
    setSettings(updated);
  };

  return (
    <AppContext.Provider
      value={{ user, settings, loading, privacyMode, theme, togglePrivacy, setTheme, refresh, logout, updateSettings }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
