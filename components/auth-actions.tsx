"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const STORAGE_KEY = "study-buddy-auth-demo";
const DEMO_EMAIL = "marcelo@student.ai";

type AuthMode = "signin" | "signup";

export function AuthActions() {
  const [signedIn, setSignedIn] = useState(false);
  const [email, setEmail] = useState(DEMO_EMAIL);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<AuthMode>("signin");
  const [name, setName] = useState("Marcelo");
  const [formEmail, setFormEmail] = useState(DEMO_EMAIL);
  const [password, setPassword] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);

    if (!saved) {
      return;
    }

    try {
      const parsed = JSON.parse(saved) as { signedIn?: boolean; email?: string };
      setSignedIn(Boolean(parsed.signedIn));
      setEmail(parsed.email || DEMO_EMAIL);
      setFormEmail(parsed.email || DEMO_EMAIL);
    } catch {
      setSignedIn(saved === "true");
    }
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function persistSession(nextSignedIn: boolean, nextEmail: string) {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ signedIn: nextSignedIn, email: nextEmail }),
    );
  }

  function openModal(nextMode: AuthMode) {
    setMode(nextMode);
    setOpen(true);
  }

  function closeModal() {
    setOpen(false);
  }

  function submitAuth() {
    const resolvedEmail = formEmail.trim() || DEMO_EMAIL;
    setEmail(resolvedEmail);
    setSignedIn(true);
    persistSession(true, resolvedEmail);
    setPassword("");
    setOpen(false);
  }

  function signInWithGoogle() {
    const resolvedEmail = formEmail.trim() || "google.user@neuvra.ai";
    setEmail(resolvedEmail);
    setSignedIn(true);
    persistSession(true, resolvedEmail);
    setOpen(false);
  }

  function signOut() {
    persistSession(false, email);
    setSignedIn(false);
  }

  const modal =
    mounted && open
      ? createPortal(
          <div className="auth-modal-backdrop" onClick={closeModal}>
            <div
              className="auth-modal"
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label={mode === "signup" ? "Crear cuenta" : "Iniciar sesión"}
            >
              <button type="button" className="auth-modal-close" onClick={closeModal} aria-label="Cerrar">
                ×
              </button>

              <div className="auth-modal-header">
                <span className="eyebrow">Neuvra AI</span>
                <h3>{mode === "signup" ? "Crear tu cuenta" : "Ingresar a tu cuenta"}</h3>
                <p>
                  {mode === "signup"
                    ? "Crea una cuenta para guardar tu progreso, mazos y sesiones de estudio."
                    : "Ingresa para seguir con tus mazos, historial y herramientas guardadas."}
                </p>
              </div>

              <div className="auth-switch">
                <button
                  type="button"
                  className={`auth-switch-btn${mode === "signin" ? " active" : ""}`}
                  onClick={() => setMode("signin")}
                >
                  Iniciar sesión
                </button>
                <button
                  type="button"
                  className={`auth-switch-btn${mode === "signup" ? " active" : ""}`}
                  onClick={() => setMode("signup")}
                >
                  Crear cuenta
                </button>
              </div>

              <div className="auth-form">
                {mode === "signup" && (
                  <label className="auth-field">
                    <span>Nombre</span>
                    <input
                      type="text"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Tu nombre"
                    />
                  </label>
                )}

                <label className="auth-field">
                  <span>Email</span>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(event) => setFormEmail(event.target.value)}
                    placeholder="tu@email.com"
                  />
                </label>

                <label className="auth-field">
                  <span>Contraseña</span>
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={mode === "signup" ? "Crea una contraseña" : "Ingresa tu contraseña"}
                  />
                </label>

                <button type="button" className="auth-submit" onClick={submitAuth}>
                  {mode === "signup" ? "Crear cuenta" : "Ingresar"}
                </button>

                <div className="auth-divider">
                  <span>o</span>
                </div>

                <button type="button" className="auth-google" onClick={signInWithGoogle}>
                  Continuar con Google
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  if (signedIn) {
    return (
      <>
        <div className="auth-actions">
          <div className="auth-chip" aria-label="Usuario conectado">
            <span className="auth-avatar">{name.slice(0, 1).toUpperCase()}</span>
            <span className="auth-meta">
              <strong>Sesión activa</strong>
              <span>{email}</span>
            </span>
          </div>
          <button
            type="button"
            className="auth-button auth-button-secondary"
            onClick={signOut}
            suppressHydrationWarning
          >
            Salir
          </button>
        </div>
        {modal}
      </>
    );
  }

  return (
    <>
      <div className="auth-actions">
        <button
          type="button"
          className="auth-button auth-button-secondary"
          onClick={() => openModal("signin")}
          suppressHydrationWarning
        >
          Iniciar sesión
        </button>
        <button
          type="button"
          className="auth-button auth-button-primary"
          onClick={() => openModal("signup")}
          suppressHydrationWarning
        >
          Crear cuenta
        </button>
      </div>
      {modal}
    </>
  );
}
