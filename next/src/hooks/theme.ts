"use client";
import { useSyncExternalStore } from "react";

export type ThemeMode = "light" | "dark" | "system";

const listeners = new Set<() => void>();
const announce = () => listeners.forEach((l) => l());
// One registration for every reader: a component that unmounts must not silence the rest
if (typeof window !== "undefined") window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", announce);
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

// light, dark, or system. system follows the operating system setting. The key stays `theme`.
const readMode = (): ThemeMode => {
  if (typeof window === "undefined") return "system";
  return (localStorage.getItem("theme") as ThemeMode) || "system";
};

export function setThemeMode(mode: ThemeMode) {
  localStorage.setItem("theme", mode);
  // the inline script in <head> reads the same attribute, so the first paint already matches
  if (mode === "system") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = mode;
  announce();
}

/** The stored choice and the theme in force. */
export function useTheme() {
  const themeMode = useSyncExternalStore(subscribe, readMode, () => "system" as ThemeMode);
  const prefersDark = useSyncExternalStore(
    subscribe,
    () => window.matchMedia("(prefers-color-scheme: dark)").matches,
    () => false,
  );
  const activeTheme: "light" | "dark" = themeMode === "system" ? (prefersDark ? "dark" : "light") : themeMode;
  return { themeMode, activeTheme, setThemeMode };
}
