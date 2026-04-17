"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import GamifiedLoginCard from "@/components/ui/gamified-login-card";

interface AuthState {
  signedIn: boolean;
  email: string;
  name: string;
}

interface AuthCtx {
  auth: AuthState;
  openModal: () => void;
  signIn: (email: string, name: string) => void;
  signOut: () => void;
}

const STORAGE_KEY = "study-buddy-auth-demo";
const DEFAULT: AuthState = { signedIn: false, email: "", name: "" };

function loadAuth(): AuthState {
  if (typeof window === "undefined") return DEFAULT;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT;

    const parsed = JSON.parse(raw) as Partial<AuthState>;
    return {
      signedIn: Boolean(parsed.signedIn),
      email: parsed.email ?? "",
      name: parsed.name ?? "",
    };
  } catch {
    return DEFAULT;
  }
}

function saveAuth(state: AuthState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

const AuthContext = createContext<AuthCtx>({
  auth: DEFAULT,
  openModal: () => {},
  signIn: () => {},
  signOut: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>(DEFAULT);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    setAuth(loadAuth());
  }, []);

  const signIn = useCallback((email: string, name: string) => {
    const next: AuthState = { signedIn: true, email, name };
    setAuth(next);
    saveAuth(next);
    setModalOpen(false);
  }, []);

  const signOut = useCallback(() => {
    setAuth(DEFAULT);
    saveAuth(DEFAULT);
  }, []);

  const openModal = useCallback(() => setModalOpen(true), []);

  return (
    <AuthContext.Provider value={{ auth, openModal, signIn, signOut }}>
      {children}
      {modalOpen && <AuthModal onClose={() => setModalOpen(false)} onSignIn={signIn} />}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthCtx {
  return useContext(AuthContext);
}

type AuthMode = "signin" | "signup";

function AuthModal({
  onClose,
  onSignIn,
}: {
  onClose: () => void;
  onSignIn: (email: string, name: string) => void;
}) {
  const [mode, setMode] = useState<AuthMode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  async function submit() {
    if (!email.includes("@")) return;

    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 600));
    setLoading(false);
    onSignIn(email.trim(), name.trim() || email.split("@")[0]);
  }

  function google() {
    onSignIn(email || "google.user@noesis.ai", name || "User");
  }

  return (
    <div className="auth-modal-backdrop" onClick={onClose} style={{ zIndex: 200 }}>
      <div
        className="auth-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={mode === "signup" ? "Crear cuenta" : "Iniciar sesion"}
      >
        <button
          type="button"
          className="auth-modal-close"
          onClick={onClose}
          aria-label="Cerrar"
        >
          x
        </button>
        <GamifiedLoginCard
          mode={mode}
          name={name}
          email={email}
          password={password}
          loading={loading}
          onModeChange={setMode}
          onNameChange={setName}
          onEmailChange={setEmail}
          onPasswordChange={setPassword}
          onSubmit={() => void submit()}
          onGoogle={google}
        />
      </div>
    </div>
  );
}
