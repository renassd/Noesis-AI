"use client";

import { useState } from "react";
import ThemePanel from "./ThemePanel";

export default function ThemeToggle() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="theme-fab"
        onClick={() => setOpen(true)}
        aria-label="Abrir panel de personalizacion"
      >
        <span aria-hidden="true">Tema</span>
        <span aria-hidden="true">+</span>
      </button>
      <ThemePanel open={open} onClose={() => setOpen(false)} />
    </>
  );
}
