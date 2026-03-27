import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import type { ReactNode } from "react";

/** Themes the user can select, including 'system' for auto-detection. */
export type Theme = "light" | "dark" | "high-contrast" | "cleanroom" | "system";

/** The concrete theme actually applied to the DOM (never 'system'). */
export type ResolvedTheme = Exclude<Theme, "system">;

/* -------------------------------------------------------------------------- */
/*  System preference listener (singleton)                                    */
/* -------------------------------------------------------------------------- */

const DARK_MQ = "(prefers-color-scheme: dark)";

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia(DARK_MQ).matches ? "dark" : "light";
}

/** Subscribe to OS-level dark mode changes via useSyncExternalStore. */
function subscribeSystemTheme(callback: () => void): () => void {
  const mq = window.matchMedia(DARK_MQ);
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

/* -------------------------------------------------------------------------- */
/*  LocalStorage helpers                                                      */
/* -------------------------------------------------------------------------- */

const STORAGE_KEY = "lancelot-theme";

function readStoredTheme(): Theme {
  if (typeof window === "undefined") return "system";
  const raw = localStorage.getItem(STORAGE_KEY);
  if (
    raw === "light" ||
    raw === "dark" ||
    raw === "high-contrast" ||
    raw === "cleanroom" ||
    raw === "system"
  ) {
    return raw;
  }
  return "system";
}

function writeStoredTheme(theme: Theme): void {
  localStorage.setItem(STORAGE_KEY, theme);
}

/* -------------------------------------------------------------------------- */
/*  Context                                                                   */
/* -------------------------------------------------------------------------- */

interface ThemeContextValue {
  /** The user-chosen theme (may be 'system'). */
  theme: Theme;
  /** The concrete theme applied to the DOM. */
  resolvedTheme: ResolvedTheme;
  /** Change the selected theme. */
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/* -------------------------------------------------------------------------- */
/*  Resolved theme classes — applied to <html>                                */
/* -------------------------------------------------------------------------- */

const THEME_CLASSES: readonly ResolvedTheme[] = [
  "light",
  "dark",
  "high-contrast",
  "cleanroom",
] as const;

function applyThemeClass(resolved: ResolvedTheme): void {
  const root = document.documentElement;
  // Remove all theme classes, then add the active one.
  root.classList.remove(...THEME_CLASSES);
  root.classList.add(resolved);
}

/* -------------------------------------------------------------------------- */
/*  ThemeProvider                                                              */
/* -------------------------------------------------------------------------- */

interface ThemeProviderProps {
  children: ReactNode;
  /** Override the initial theme (e.g. for Storybook). Defaults to stored or 'system'. */
  defaultTheme?: Theme;
}

export function ThemeProvider({ children, defaultTheme }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(
    () => defaultTheme ?? readStoredTheme(),
  );

  // Track system preference reactively so 'system' auto-resolves.
  const systemTheme = useSyncExternalStore(
    subscribeSystemTheme,
    getSystemTheme,
    // Server snapshot — fallback to light.
    () => "light" as ResolvedTheme,
  );

  const resolvedTheme: ResolvedTheme =
    theme === "system" ? systemTheme : theme;

  // Apply the resolved theme class to <html> whenever it changes.
  useEffect(() => {
    applyThemeClass(resolvedTheme);
  }, [resolvedTheme]);

  const setTheme = useCallback((next: Theme) => {
    writeStoredTheme(next);
    setThemeState(next);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

/* -------------------------------------------------------------------------- */
/*  useTheme hook                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Access the current theme and a setter.
 *
 * Must be called inside a `<ThemeProvider>`.
 */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (ctx === null) {
    throw new Error("useTheme must be used within a <ThemeProvider>");
  }
  return ctx;
}
