"use client";

import { useTheme } from "./theme/ThemeContext";

export default function ColorModeToggle() {
  const { prefs, update } = useTheme();
  const isDark = prefs.colorScheme === "dark";

  return (
    <button
      type="button"
      className="color-mode-toggle"
      onClick={() => update({ colorScheme: isDark ? "default" : "dark" })}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
    >
      <span className="color-mode-track">
        <span className={`color-mode-thumb${isDark ? " dark" : ""}`}>
          {isDark ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="1.8" />
              <path
                d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          )}
        </span>
      </span>
    </button>
  );
}
