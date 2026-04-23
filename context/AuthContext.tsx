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
import { getSupabaseBrowser } from "@/lib/supabase-browser";

interface AuthState {
  signedIn: boolean;
  email: string;
  name: string;
  userId: string;
}

interface AuthCtx {
  auth: AuthState;
  openModal: () => void;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

type AuthMode = "signin" | "signup";

const DEFAULT: AuthState = { signedIn: false, email: "", name: "", userId: "" };

function readName(email: string, metadata?: Record<string, unknown>) {
  const fullName = metadata?.full_name;
  const name = metadata?.name;

  if (typeof fullName === "string" && fullName.trim()) return fullName.trim();
  if (typeof name === "string" && name.trim()) return name.trim();
  return email.split("@")[0] ?? "User";
}

const AuthContext = createContext<AuthCtx>({
  auth: DEFAULT,
  openModal: () => {},
  signInWithGoogle: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>(DEFAULT);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setAuth(DEFAULT);
      return;
    }

    let active = true;

    const syncSession = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!active) {
        return;
      }

      if (error || !data.user?.email) {
        setAuth(DEFAULT);
        return;
      }

      const next = {
        signedIn: true,
        email: data.user.email,
        name: readName(data.user.email, data.user.user_metadata),
        userId: data.user.id,
      };

      setAuth(next);
    };

    void syncSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) {
        return;
      }

      const user = session?.user;
      if (!user?.email) {
        setAuth(DEFAULT);
        return;
      }

      const next = {
        signedIn: true,
        email: user.email,
        name: readName(user.email, user.user_metadata),
        userId: user.id,
      };

      setAuth(next);
      setModalOpen(false);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const supabase = getSupabaseBrowser();
    if (!supabase) {
      throw new Error("Falta NEXT_PUBLIC_SUPABASE_ANON_KEY para Google Login.");
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    const supabase = getSupabaseBrowser();
    if (supabase) {
      await supabase.auth.signOut();
    }

    setAuth(DEFAULT);
  }, []);

  const openModal = useCallback(() => setModalOpen(true), []);

  return (
    <AuthContext.Provider value={{ auth, openModal, signInWithGoogle, signOut }}>
      {children}
      {modalOpen && (
        <AuthModal
          onClose={() => setModalOpen(false)}
          onGoogleSignIn={signInWithGoogle}
        />
      )}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthCtx {
  return useContext(AuthContext);
}

function AuthModal({
  onClose,
  onGoogleSignIn,
}: {
  onClose: () => void;
  onGoogleSignIn: () => Promise<void>;
}) {
  const [mode, setMode] = useState<AuthMode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  async function handleSubmit() {
    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setError("Falta la configuración de Supabase para iniciar sesión.");
      return;
    }

    if (!email.includes("@")) {
      setError("Ingresa un email válido.");
      return;
    }

    if (!password.trim()) {
      setError("Ingresa tu contraseña.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
            data: {
              full_name: name.trim() || email.split("@")[0],
            },
          },
        });

        if (error) {
          throw error;
        }

        if (!data.session) {
          setError("Revisa tu email para confirmar la cuenta antes de entrar.");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          throw error;
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesión.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError("");
    setLoading(true);

    try {
      await onGoogleSignIn();
    } catch (err) {
      setLoading(false);
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesion con Google.");
    }
  }

  return (
    <div
      className="auth-modal-backdrop"
      onClick={onClose}
      style={{ zIndex: 200, animation: "ce-fade-in 0.2s ease" }}
    >
      <div
        className="auth-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={mode === "signup" ? "Crear cuenta" : "Iniciar sesion"}
        style={{ animation: "ce-slide-up 0.26s cubic-bezier(0.22, 1, 0.36, 1)" }}
      >
        <button type="button" className="auth-modal-close" onClick={onClose} aria-label="Cerrar">
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
          onSubmit={() => void handleSubmit()}
          onGoogle={() => void handleGoogle()}
          error={error}
        />
      </div>
    </div>
  );
}
