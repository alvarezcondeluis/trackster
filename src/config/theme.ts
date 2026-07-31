/**
 * Color themes — swap the whole accent palette from one place.
 *
 * Every accent visual in the app (buttons, focus rings, glows, the neon text
 * gradient, the background wash) derives from a single CSS token, `--primary`,
 * defined in styles.css. A theme therefore only needs to supply that accent
 * (plus the text color that sits on top of it); `applyTheme` writes those tokens
 * onto :root and the rest of the UI follows instantly — no reload.
 *
 * Add a palette below and it's immediately selectable. Choose one in code with
 *   setTheme("emerald")           // persists + applies live (with useApplyTheme mounted)
 * or, in development, from the browser console:
 *   setTheme("sunset")            // exposed on window in DEV for quick A/B testing
 *
 * Persistence/reactivity reuse the same factory as era/playback/game-mode.
 */

import { useEffect } from "react";

import { createPersistentSetting } from "@/hooks/persistentSetting";

export type ThemeId = "blue" | "purple" | "emerald" | "sunset";

export interface ThemePalette {
  id: ThemeId;
  label: string;
  /** Accent color — any CSS color (hex or oklch). Drives buttons/glows/ring/etc. */
  primary: string;
  /** Text/icon color shown on top of `primary` (keep AA contrast against it). */
  primaryForeground: string;
}

/** The single place that knows every palette. */
export const THEMES: Record<ThemeId, ThemePalette> = {
  blue: {
    id: "blue",
    label: "Electric Blue",
    primary: "#2E6EFF",
    primaryForeground: "oklch(0.98 0.01 250)",
  },
  purple: {
    id: "purple",
    label: "Neon Purple",
    primary: "oklch(0.68 0.27 300)",
    primaryForeground: "oklch(0.12 0.02 265)",
  },
  emerald: {
    id: "emerald",
    label: "Emerald",
    primary: "oklch(0.72 0.19 155)",
    primaryForeground: "oklch(0.12 0.02 265)",
  },
  sunset: {
    id: "sunset",
    label: "Sunset",
    primary: "oklch(0.70 0.20 35)",
    primaryForeground: "oklch(0.14 0.02 265)",
  },
};

export const THEME_LIST: ThemePalette[] = Object.values(THEMES);

const VALID = Object.keys(THEMES) as ThemeId[];

const themeSetting = createPersistentSetting<ThemeId>({
  key: "color_theme",
  defaultValue: "blue",
  isValid: (raw): raw is ThemeId => VALID.includes(raw as ThemeId),
  onChangeLog: (v) => `🎨 Theme: ${v} (applied live)`,
});

export const getTheme = themeSetting.get;
export const setTheme = themeSetting.set;
export const useThemeId = themeSetting.useValue;

/**
 * Write a palette's tokens onto :root so every accent updates at once.
 * Safe to call on the server (no-op without a document).
 */
export function applyTheme(id: ThemeId = getTheme()): void {
  if (typeof document === "undefined") return;
  const palette = THEMES[id] ?? THEMES.blue;
  const root = document.documentElement;
  root.style.setProperty("--primary", palette.primary);
  root.style.setProperty("--primary-foreground", palette.primaryForeground);
}

/**
 * Mount once near the app root: applies the stored theme on load and re-applies
 * whenever it changes (including from another tab).
 */
export function useApplyTheme(): void {
  const id = useThemeId();
  useEffect(() => {
    applyTheme(id);
  }, [id]);
}

// Dev-only convenience: tweak the palette straight from the browser console.
if (import.meta.env.DEV && typeof window !== "undefined") {
  (window as unknown as { setTheme: typeof setTheme }).setTheme = setTheme;
}
