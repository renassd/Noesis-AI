"use client";

import { useState } from "react";
import { useLang } from "../i18n";
import ThemePanel from "./ThemePanel";

export default function ThemeToggle({ inline = false }: { inline?: boolean }) {
  const [open, setOpen] = useState(false);
  const { lang } = useLang();
  const label = lang === "en" ? "Theme" : "Tema";
  const ariaLabel = lang === "en" ? "Open theme customization panel" : "Abrir panel de personalizacion";

  return (
    <>
      <button
        type="button"
        className={`theme-fab${inline ? " theme-fab-inline" : ""}`}
        onClick={() => setOpen(true)}
        aria-label={ariaLabel}
      >
        <span aria-hidden="true">{label}</span>
        <span aria-hidden="true">+</span>
      </button>
      <ThemePanel open={open} onClose={() => setOpen(false)} />
    </>
  );
}
