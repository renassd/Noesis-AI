"use client";

import { useLang } from "./i18n";

export default function LangToggle() {
  const { lang, setLang } = useLang();

  return (
    <div className="lang-toggle" role="group" aria-label="Language">
      <button
        className={`lang-btn${lang === "en" ? " active" : ""}`}
        onClick={() => setLang("en")}
        aria-pressed={lang === "en"}
        type="button"
      >
        EN
      </button>
      <button
        className={`lang-btn${lang === "es" ? " active" : ""}`}
        onClick={() => setLang("es")}
        aria-pressed={lang === "es"}
        type="button"
      >
        ES
      </button>
    </div>
  );
}
