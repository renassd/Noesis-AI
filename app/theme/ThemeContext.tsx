"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { FONT_LABELS, SCHEMES } from "./schemes";
import { DEFAULT_CARD_VISUAL, DEFAULT_THEME, type CardVisual, type ThemePreferences } from "./types";

const STORAGE_KEY = "noesis_theme_v1";

function toAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function cardRadiusValue(radius: ThemePreferences["cardRadius"]): string {
  return { none: "0px", sm: "8px", md: "14px", lg: "22px", xl: "32px" }[radius];
}

function cardPaddingValue(size: ThemePreferences["cardSize"]): string {
  return { compact: "16px", default: "28px", large: "42px" }[size];
}

function cardHeightValue(size: ThemePreferences["cardSize"]): string {
  return { compact: "160px", default: "260px", large: "340px" }[size];
}

function cardStyleVars(
  style: ThemePreferences["cardStyle"],
  shadowIntensity: number,
  shadowColor: string,
): Record<string, string> {
  const alpha = shadowIntensity / 100;
  const base: Record<string, string> = {
    "--card-shadow-intensity": String(alpha),
    "--card-shadow-color": shadowColor,
  };

  switch (style) {
    case "flat":
      return { ...base, "--card-shadow": "none", "--card-border-width": "1px", "--card-backdrop": "none" };
    case "elevated":
      return {
        ...base,
        "--card-shadow": `0 8px 32px rgba(${shadowColor},${alpha * 0.18}), 0 2px 8px rgba(${shadowColor},${alpha * 0.1})`,
        "--card-border-width": "1px",
        "--card-backdrop": "none",
      };
    case "glass":
      return {
        ...base,
        "--card-shadow": `0 8px 32px rgba(${shadowColor},${alpha * 0.2}), inset 0 1px 0 rgba(255,255,255,0.15)`,
        "--card-border-width": "1px",
        "--card-backdrop": "blur(12px) saturate(1.5)",
      };
    case "outlined":
      return { ...base, "--card-shadow": "none", "--card-border-width": "2px", "--card-backdrop": "none" };
    case "brutal":
      return {
        ...base,
        "--card-shadow": `4px 4px 0 0 rgba(${shadowColor},0.85)`,
        "--card-border-width": "2px",
        "--card-backdrop": "none",
      };
    default:
      return base;
  }
}

export function applyCardVisualToCss(visual: CardVisual): void {
  const root = document.documentElement;
  if (visual.textColor) root.style.setProperty("--card-text-color", visual.textColor);
  else root.style.removeProperty("--card-text-color");
}

export function applyThemeToCss(prefs: ThemePreferences): void {
  const scheme = SCHEMES[prefs.colorScheme];
  const font = FONT_LABELS[prefs.fontFamily];
  const accent = prefs.accentColor ?? scheme.blue700;
  const accentLight = prefs.accentColor ? toAlpha(prefs.accentColor, 0.12) : scheme.surfaceBlue;
  const isDarkLike =
    prefs.colorScheme === "dark" ||
    prefs.colorScheme === "forest" ||
    prefs.colorScheme === "ocean";

  const vars: Record<string, string> = {
    "--bg": scheme.bg,
    "--paper": scheme.paper,
    "--surface": scheme.surface,
    "--surface-alt": scheme.surfaceAlt,
    "--surface-blue": accentLight,
    "--ink": scheme.ink,
    "--ink-2": scheme.ink2,
    "--muted": scheme.muted,
    "--line": scheme.line,
    "--blue-950": scheme.blue900,
    "--blue-900": scheme.blue900,
    "--blue-700": accent,
    "--blue-500": scheme.blue500,
    "--blue-200": scheme.blue200,
    "--green": scheme.green,
    "--green-bg": scheme.greenBg,
    "--amber": scheme.amber,
    "--amber-bg": scheme.amberBg,
    "--red": scheme.red,
    "--red-bg": scheme.redBg,
    "--font-body": font.stack,
    "--font-display": font.stack,
    "--card-radius": cardRadiusValue(prefs.cardRadius),
    "--card-padding": cardPaddingValue(prefs.cardSize),
    "--card-height": cardHeightValue(prefs.cardSize),
    "--card-front-bg": scheme.cardFront,
    "--card-back-bg": scheme.cardBack,
    "--card-border-color": scheme.cardBorder,
    "--card-back-border-color": scheme.cardBackBorder,
    "--transition-speed": prefs.animationsEnabled ? "0.46s" : "0s",
    "--study-transition-speed": prefs.animationsEnabled ? "0.5s" : "0s",
    ...cardStyleVars(prefs.cardStyle, prefs.cardShadowIntensity, scheme.shadowColor),
  };

  const root = document.documentElement;
  Object.entries(vars).forEach(([key, value]) => root.style.setProperty(key, value));
  root.classList.remove("light", "dark");
  root.classList.add(isDarkLike ? "dark" : "light");
  root.setAttribute("data-color-mode", isDarkLike ? "dark" : "light");
  document.body.setAttribute("data-theme", prefs.colorScheme);
  applyCardVisualToCss(prefs.cardVisual ?? DEFAULT_CARD_VISUAL);
}

export function injectFontLink(fontFamily: ThemePreferences["fontFamily"]): void {
  const font = FONT_LABELS[fontFamily];
  const existing = document.getElementById("noesis-font-link");
  if (existing) existing.remove();
  const link = document.createElement("link");
  link.id = "noesis-font-link";
  link.rel = "stylesheet";
  link.href = font.import;
  document.head.appendChild(link);
}

type ThemeCtx = {
  prefs: ThemePreferences;
  update: (patch: Partial<ThemePreferences>) => void;
  reset: () => void;
};

const ThemeContext = createContext<ThemeCtx>({
  prefs: DEFAULT_THEME,
  update: () => {},
  reset: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefs] = useState<ThemePreferences>(DEFAULT_THEME);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<ThemePreferences>;
        const merged = { ...DEFAULT_THEME, ...saved };
        setPrefs(merged);
        applyThemeToCss(merged);
        injectFontLink(merged.fontFamily);
        return;
      }
    } catch {
      // ignore parse errors
    }
    applyThemeToCss(DEFAULT_THEME);
    injectFontLink(DEFAULT_THEME.fontFamily);
  }, []);

  const update = useCallback((patch: Partial<ThemePreferences>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore storage write issues
      }
      applyThemeToCss(next);
      if (patch.fontFamily) injectFontLink(next.fontFamily);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore storage delete issues
    }
    const fresh = { ...DEFAULT_THEME, cardVisual: DEFAULT_CARD_VISUAL };
    setPrefs(fresh);
    applyThemeToCss(fresh);
    injectFontLink(fresh.fontFamily);
  }, []);

  return <ThemeContext.Provider value={{ prefs, update, reset }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeCtx {
  return useContext(ThemeContext);
}
