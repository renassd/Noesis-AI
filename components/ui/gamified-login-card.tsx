"use client";

import { useState } from "react";
import { useLang } from "@/app/i18n";

function getPasswordStrength(pwd: string): { score: number; label: string; color: string } {
  if (!pwd) return { score: 0, label: "", color: "#dbe4f1" };
  let score = 0;
  if (pwd.length >= 8) score++;
  if (pwd.length >= 12) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  if (score <= 1) return { score: 1, label: "Débil", color: "#ef4444" };
  if (score <= 2) return { score: 2, label: "Regular", color: "#f97316" };
  if (score <= 3) return { score: 3, label: "Buena", color: "#eab308" };
  return { score: 4, label: "Fuerte", color: "#22c55e" };
}

type AuthMode = "signin" | "signup" | "forgot";

interface GamifiedLoginCardProps {
  mode: AuthMode;
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  loading: boolean;
  error?: string;
  forgotSent?: boolean;
  onModeChange: (mode: AuthMode) => void;
  onNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onSubmit: () => void;
  onGoogle: () => void;
  onForgotSubmit: () => void;
}

export default function GamifiedLoginCard({
  mode,
  name,
  email,
  password,
  confirmPassword,
  loading,
  error,
  forgotSent,
  onModeChange,
  onNameChange,
  onEmailChange,
  onPasswordChange,
  onConfirmPasswordChange,
  onSubmit,
  onGoogle,
  onForgotSubmit,
}: GamifiedLoginCardProps) {
  const { t, lang } = useLang();
  const authText = t.auth;
  const [showPassword, setShowPassword] = useState(false);

  // ── Forgot password view ───────────────────────────────────
  if (mode === "forgot") {
    return (
      <>
        <div className="auth-modal-header">
          <span className="eyebrow">{authText.brand}</span>
          <h3>{authText.forgotTitle}</h3>
          <p>{authText.forgotDescription}</p>
        </div>

        <div className="auth-form">
          {forgotSent ? (
            <p style={{ fontSize: 14, color: "#15803d", margin: 0, padding: "12px", background: "#f0fdf4", borderRadius: 8, border: "1px solid #bbf7d0" }}>
              {authText.forgotSent}
            </p>
          ) : (
            <>
              <label className="auth-field">
                <span>{authText.email}</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => onEmailChange(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && onForgotSubmit()}
                  placeholder={authText.emailPlaceholder}
                  autoFocus
                />
              </label>

              <button
                type="button"
                className="auth-submit"
                onClick={onForgotSubmit}
                disabled={loading || !email.includes("@")}
              >
                {loading ? authText.forgotLoading : authText.forgotCta}
              </button>

              {error && (
                <p style={{ fontSize: 13, color: "#c2410c", margin: 0 }}>{error}</p>
              )}
            </>
          )}

          <button
            type="button"
            onClick={() => onModeChange("signin")}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--muted)", textDecoration: "underline", padding: 0, alignSelf: "center" }}
          >
            {authText.backToSignin}
          </button>
        </div>
      </>
    );
  }

  // ── Sign in / Sign up view ─────────────────────────────────
  const copy = mode === "signup"
    ? { title: authText.signupTitle, description: authText.signupDescription, cta: authText.signupCta }
    : { title: authText.signinTitle, description: authText.signinDescription, cta: authText.signinCta };

  return (
    <>
      <div className="auth-modal-header">
        <span className="eyebrow">{authText.brand}</span>
        <h3>{copy.title}</h3>
        <p>{copy.description}</p>
      </div>

      <div className="auth-switch">
        <button
          type="button"
          className={`auth-switch-btn${mode === "signin" ? " active" : ""}`}
          onClick={() => onModeChange("signin")}
        >
          {authText.signinTab}
        </button>
        <button
          type="button"
          className={`auth-switch-btn${mode === "signup" ? " active" : ""}`}
          onClick={() => onModeChange("signup")}
        >
          {authText.signupTab}
        </button>
      </div>

      <div className="auth-form">
        {mode === "signup" && (
          <label className="auth-field">
            <span>{authText.name}</span>
            <input
              type="text"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder={authText.namePlaceholder}
            />
          </label>
        )}

        <label className="auth-field">
          <span>{authText.email}</span>
          <input
            type="email"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void onSubmit()}
            placeholder={authText.emailPlaceholder}
            autoFocus
          />
        </label>

        <label className="auth-field">
          <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            {authText.password}
            {mode === "signin" && (
              <button
                type="button"
                onClick={() => onModeChange("forgot")}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "var(--blue-700, #3b6de0)", padding: 0, fontWeight: 500 }}
              >
                {authText.forgotPassword}
              </button>
            )}
          </span>
          <div style={{ position: "relative" }}>
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void onSubmit()}
              placeholder={authText.passwordPlaceholder}
              style={{ paddingRight: 40, width: "100%", boxSizing: "border-box" }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--muted, #66768f)", lineHeight: 1 }}
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {showPassword ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
                  <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              )}
            </button>
          </div>
        </label>

        {mode === "signup" && password.length > 0 && (() => {
          const { score, label, color } = getPasswordStrength(password);
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: -8 }}>
              <div style={{ display: "flex", gap: 4 }}>
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} style={{
                    flex: 1, height: 4, borderRadius: 2,
                    background: i <= score ? color : "#dbe4f1",
                    transition: "background 0.2s",
                  }} />
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, color: "var(--muted, #66768f)" }}>
                  {[
                    { ok: password.length >= 8, text: "8+ caracteres" },
                    { ok: /[A-Z]/.test(password), text: "Mayúscula" },
                    { ok: /[0-9]/.test(password), text: "Número" },
                  ].map((req, i) => (
                    <span key={i} style={{ marginRight: 8, color: req.ok ? "#22c55e" : "var(--muted, #66768f)" }}>
                      {req.ok ? "✓" : "·"} {req.text}
                    </span>
                  ))}
                </span>
                <span style={{ fontSize: 11, fontWeight: 600, color }}>{label}</span>
              </div>
            </div>
          );
        })()}

        {mode === "signup" && (
          <label className="auth-field">
            <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              {lang === "en" ? "Confirm password" : "Confirmar contraseña"}
              {confirmPassword.length > 0 && (
                <span style={{ fontSize: 12, fontWeight: 600, color: confirmPassword === password ? "#22c55e" : "#ef4444" }}>
                  {confirmPassword === password ? "✓ Coinciden" : "✗ No coinciden"}
                </span>
              )}
            </span>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => onConfirmPasswordChange(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void onSubmit()}
                placeholder={lang === "en" ? "Repeat your password" : "Repetí tu contraseña"}
                style={{ paddingRight: 40, width: "100%", boxSizing: "border-box", borderColor: confirmPassword.length > 0 ? (confirmPassword === password ? "#22c55e" : "#ef4444") : undefined }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--muted, #66768f)", lineHeight: 1 }}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
                    <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </label>
        )}

        <button
          type="button"
          className="auth-submit"
          onClick={onSubmit}
          disabled={loading || !email.includes("@") || (mode === "signup" && confirmPassword !== password)}
        >
          {loading ? authText.loading : copy.cta}
        </button>

        <div className="auth-divider">
          <span>{authText.or}</span>
        </div>

        <button type="button" className="auth-google" onClick={onGoogle}>
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true" style={{ flexShrink: 0 }}>
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          {authText.continueWithGoogle}
        </button>

        {error && (
          <p style={{ fontSize: 13, color: "#c2410c", margin: 0 }}>{error}</p>
        )}
      </div>
    </>
  );
}
