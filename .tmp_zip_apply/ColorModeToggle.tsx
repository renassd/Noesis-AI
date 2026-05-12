"use client";

import { useColorMode } from "@/context/ThemeContext";

export default function ColorModeToggle() {
  const { colorMode, toggleColorMode } = useColorMode();

  return (
    <button
      type="button"
      className="color-mode-toggle"
      onClick={toggleColorMode}
      aria-label={colorMode === "light" ? "Switch to dark mode" : "Switch to light mode"}
      title={colorMode === "light" ? "Dark mode" : "Light mode"}
    >
      <span className="color-mode-track">
        <span className={`color-mode-thumb${colorMode === "dark" ? " dark" : ""}`}>
          {colorMode === "light" ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="1.8"/>
              <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
                stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z"
                stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </span>
      </span>
    </button>
  );
}
