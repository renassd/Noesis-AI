"use client";

import { useEffect, useState } from "react";
import { useLang } from "./i18n";

interface ResearchPrefs {
  bgColor: string;
  fontFamily: string;
}

const DEFAULT: ResearchPrefs = {
  bgColor: "",
  fontFamily: "",
};

const FONTS = [
  { value: "", label: { en: "Default", es: "Por defecto" } },
  { value: "'DM Sans', sans-serif", label: { en: "DM Sans", es: "DM Sans" } },
  { value: "'Lora', Georgia, serif", label: { en: "Lora", es: "Lora" } },
  { value: "'Playfair Display', serif", label: { en: "Playfair", es: "Playfair" } },
  { value: "'JetBrains Mono', monospace", label: { en: "Mono", es: "Mono" } },
  { value: "'Instrument Serif', Georgia, serif", label: { en: "Instrument", es: "Instrument" } },
];

const STORAGE_KEY = "noesis_research_prefs";

function load(): ResearchPrefs {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT, ...(JSON.parse(raw) as Partial<ResearchPrefs>) } : DEFAULT;
  } catch {
    return DEFAULT;
  }
}

function save(prefs: ResearchPrefs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {}
}

function apply(prefs: ResearchPrefs) {
  const root = document.documentElement;
  if (prefs.bgColor) root.style.setProperty("--research-bg", prefs.bgColor);
  else root.style.removeProperty("--research-bg");
  if (prefs.fontFamily) root.style.setProperty("--research-font", prefs.fontFamily);
  else root.style.removeProperty("--research-font");
}

export default function ResearchPrefsBar() {
  const { lang, t } = useLang();
  const [prefs, setPrefs] = useState<ResearchPrefs>(DEFAULT);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const loaded = load();
    setPrefs(loaded);
    apply(loaded);
  }, []);

  function patch(delta: Partial<ResearchPrefs>) {
    const next = { ...prefs, ...delta };
    setPrefs(next);
    save(next);
    apply(next);
  }

  function reset() {
    setPrefs(DEFAULT);
    save(DEFAULT);
    apply(DEFAULT);
  }

  return (
    <div className="rp-bar">
      <button
        className={`rp-trigger${open ? " open" : ""}`}
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        type="button"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.07 4.93l-1.41 1.41M5.34 18.66l-1.41 1.41M20 12h2M2 12H.93M19.07 19.07l-1.41-1.41M5.34 5.34L3.93 3.93M12 20v2M12 2V.93" />
        </svg>
        {t.researchPrefs.label}
      </button>

      {open && (
        <div className="rp-panel">
          <div className="rp-field">
            <label className="rp-label">{t.researchPrefs.bg}</label>
            <div className="rp-color-row">
              <input
                type="color"
                className="rp-color-input"
                value={prefs.bgColor || "#f0f4ff"}
                onChange={(event) => patch({ bgColor: event.target.value })}
              />
              {prefs.bgColor && (
                <button className="rp-clear" onClick={() => patch({ bgColor: "" })} title="Reset" type="button">
                  x
                </button>
              )}
            </div>
          </div>

          <div className="rp-field">
            <label className="rp-label">{t.researchPrefs.font}</label>
            <div className="rp-font-list">
              {FONTS.map((font) => (
                <button
                  key={font.value}
                  className={`rp-font-btn${prefs.fontFamily === font.value ? " active" : ""}`}
                  style={{ fontFamily: font.value || "inherit" }}
                  onClick={() => patch({ fontFamily: font.value })}
                  type="button"
                >
                  {font.label[lang]}
                </button>
              ))}
            </div>
          </div>

          <button className="rp-reset" onClick={reset} type="button">
            {t.researchPrefs.reset}
          </button>
        </div>
      )}
    </div>
  );
}
