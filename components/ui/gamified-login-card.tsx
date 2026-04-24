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
        progress: authText.progressSignup,
        progressTitle: authText.progressSignupTitle,
        progressBody: authText.progressSignupBody,
      }
    : {
        title: authText.signinTitle,
        description: authText.signinDescription,
        cta: authText.signinCta,
        progress: authText.progressSignin,
        progressTitle: authText.progressSigninTitle,
        progressBody: authText.progressSigninBody,
      };

  const completion = Math.min(
    100,
    (name.trim() ? 34 : 0) + (email.includes("@") ? 33 : 0) + (password.trim() ? 33 : 0),
  );

  return (
    <>
      <div className="auth-modal-header">
        <span className="eyebrow">{authText.brand}</span>
        <h3>{copy.title}</h3>
        <p>{copy.description}</p>
      </div>

      <div className="glc-hero">
        <div className="glc-hero-main">
          <span className="glc-kicker">{copy.progress}</span>
          <strong>{copy.progressTitle}</strong>
          <p>{copy.progressBody}</p>
        </div>
        <div className="glc-meter" aria-hidden="true">
          <div className="glc-meter-ring">
            <span>{completion}%</span>
          </div>
          <small>{authText.setup}</small>
        </div>
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
