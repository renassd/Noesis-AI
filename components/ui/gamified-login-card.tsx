"use client";

import { useLang } from "@/app/i18n";

type AuthMode = "signin" | "signup";

interface GamifiedLoginCardProps {
  mode: AuthMode;
  name: string;
  email: string;
  password: string;
  loading: boolean;
  error?: string;
  onModeChange: (mode: AuthMode) => void;
  onNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: () => void;
  onGoogle: () => void;
}

export default function GamifiedLoginCard({
  mode,
  name,
  email,
  password,
  loading,
  error,
  onModeChange,
  onNameChange,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  onGoogle,
}: GamifiedLoginCardProps) {
  const { t } = useLang();
  const authText = t.auth;

  const copy = mode === "signup"
    ? {
        title: authText.signupTitle,
        description: authText.signupDescription,
        cta: authText.signupCta,
      }
    : {
        title: authText.signinTitle,
        description: authText.signinDescription,
        cta: authText.signinCta,
      };

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
              onChange={(event) => onNameChange(event.target.value)}
              placeholder={authText.namePlaceholder}
            />
          </label>
        )}

        <label className="auth-field">
          <span>{authText.email}</span>
          <input
            type="email"
            value={email}
            onChange={(event) => onEmailChange(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && void onSubmit()}
            placeholder={authText.emailPlaceholder}
            autoFocus
          />
        </label>

        <label className="auth-field">
          <span>{authText.password}</span>
          <input
            type="password"
            value={password}
            onChange={(event) => onPasswordChange(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && void onSubmit()}
            placeholder={authText.passwordPlaceholder}
          />
        </label>

        <button
          type="button"
          className="auth-submit"
          onClick={onSubmit}
          disabled={loading || !email.includes("@")}
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

        {error ? (
          <p style={{ fontSize: 13, color: "#c2410c", margin: 0 }}>
            {error}
          </p>
        ) : null}
      </div>
    </>
  );
}
