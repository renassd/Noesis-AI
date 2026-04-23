"use client";

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

const COPY = {
  signin: {
    title: "Ingresar a tu cuenta",
    description: "Entra a Neuvra para seguir con tus flujos de investigacion, estudio y mazos guardados.",
    cta: "Ingresar",
    progress: "Retoma tu avance",
  },
  signup: {
    title: "Crear tu cuenta",
    description: "Crea una cuenta para guardar progreso, mazos y sesiones de estudio en un solo lugar.",
    cta: "Crear cuenta",
    progress: "Activa tu espacio",
  },
} as const;

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
  const copy = COPY[mode];
  const completion = Math.min(
    100,
    (name.trim() ? 34 : 0) + (email.includes("@") ? 33 : 0) + (password.trim() ? 33 : 0),
  );

  return (
    <>
      <div className="auth-modal-header">
        <span className="eyebrow">Neuvra AI</span>
        <h3>{copy.title}</h3>
        <p>{copy.description}</p>
      </div>

      <div className="glc-hero">
        <div className="glc-hero-main">
          <span className="glc-kicker">{copy.progress}</span>
          <strong>{mode === "signup" ? "Research + Study" : "Welcome back"}</strong>
          <p>
            {mode === "signup"
              ? "Crea tu acceso y entra directo a investigacion, flashcards y repaso."
              : "Sigue donde lo dejaste sin perder tus preferencias ni tus decks."}
          </p>
        </div>
        <div className="glc-meter" aria-hidden="true">
          <div className="glc-meter-ring">
            <span>{completion}%</span>
          </div>
          <small>setup</small>
        </div>
      </div>

      <div className="auth-switch">
        <button
          type="button"
          className={`auth-switch-btn${mode === "signin" ? " active" : ""}`}
          onClick={() => onModeChange("signin")}
        >
          Iniciar sesion
        </button>
        <button
          type="button"
          className={`auth-switch-btn${mode === "signup" ? " active" : ""}`}
          onClick={() => onModeChange("signup")}
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
              onChange={(event) => onNameChange(event.target.value)}
              placeholder="Tu nombre"
            />
          </label>
        )}

        <label className="auth-field">
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(event) => onEmailChange(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && void onSubmit()}
            placeholder="tu@email.com"
            autoFocus
          />
        </label>

        <label className="auth-field">
          <span>Contraseña</span>
          <input
            type="password"
            value={password}
            onChange={(event) => onPasswordChange(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && void onSubmit()}
            placeholder="Tu contraseña"
          />
        </label>

        <button
          type="button"
          className="auth-submit"
          onClick={onSubmit}
          disabled={loading || !email.includes("@")}
        >
          {loading ? "Entrando..." : copy.cta}
        </button>

        <div className="auth-divider">
          <span>o</span>
        </div>

        <button type="button" className="auth-google" onClick={onGoogle}>
          Continuar con Google
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
