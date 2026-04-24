"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

function resolveNextPath(value: string | null) {
  if (!value || !value.startsWith("/")) {
    return "/";
  }

  return value;
}

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("Conectando tu cuenta de Google...");

  useEffect(() => {
    let cancelled = false;
    let timeoutId: number | undefined;
    let unsubscribe: (() => void) | undefined;

    async function finishGoogleSignIn() {
      const supabase = getSupabaseBrowser();
      const code = searchParams.get("code");
      const errorDescription = searchParams.get("error_description");
      const next = resolveNextPath(searchParams.get("next"));
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const hashError = hashParams.get("error_description") ?? hashParams.get("error");

      if (!supabase) {
        setMessage("Falta NEXT_PUBLIC_SUPABASE_ANON_KEY para cerrar el login de Google.");
        return;
      }

      if (errorDescription || hashError) {
        setMessage(errorDescription ?? hashError ?? "No se pudo completar el login con Google.");
        return;
      }

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (cancelled) {
          return;
        }

        if (error) {
          setMessage(error.message);
          return;
        }

        router.replace(next);
        router.refresh();
        return;
      }

      const { data: currentSession } = await supabase.auth.getSession();
      if (cancelled) {
        return;
      }

      if (currentSession.session) {
        router.replace(next);
        router.refresh();
        return;
      }

      const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
        if (cancelled || !session) {
          return;
        }

        router.replace(next);
        router.refresh();
      });
      unsubscribe = () => authListener.subscription.unsubscribe();

      timeoutId = window.setTimeout(() => {
        if (cancelled) {
          return;
        }

        setMessage("No se pudo cerrar el login de Google. Reinicia el intento una vez mas.");
      }, 2000);
    }

    void finishGoogleSignIn();

    return () => {
      cancelled = true;
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
      unsubscribe?.();
    };
  }, [router, searchParams]);

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "24px",
        textAlign: "center",
      }}
    >
      <div>
        <h1 style={{ fontSize: "1.5rem", marginBottom: "0.75rem" }}>Google Login</h1>
        <p style={{ opacity: 0.8 }}>{message}</p>
      </div>
    </main>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <main
          style={{
            minHeight: "100vh",
            display: "grid",
            placeItems: "center",
            padding: "24px",
            textAlign: "center",
          }}
        >
          <div>
            <h1 style={{ fontSize: "1.5rem", marginBottom: "0.75rem" }}>Google Login</h1>
            <p style={{ opacity: 0.8 }}>Conectando tu cuenta de Google...</p>
          </div>
        </main>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
