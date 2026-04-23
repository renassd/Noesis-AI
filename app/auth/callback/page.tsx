"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

function resolveNextPath(value: string | null) {
  if (!value || !value.startsWith("/")) {
    return "/";
  }

  return value;
}

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("Conectando tu cuenta de Google...");

  useEffect(() => {
    let cancelled = false;

    async function finishGoogleSignIn() {
      const supabase = getSupabaseBrowser();
      const code = searchParams.get("code");
      const errorDescription = searchParams.get("error_description");
      const next = resolveNextPath(searchParams.get("next"));

      if (!supabase) {
        setMessage("Falta NEXT_PUBLIC_SUPABASE_ANON_KEY para cerrar el login de Google.");
        return;
      }

      if (errorDescription) {
        setMessage(errorDescription);
        return;
      }

      if (!code) {
        setMessage("No llego el codigo de autorizacion de Google. Reinicia el login una vez mas.");
        return;
      }

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
    }

    void finishGoogleSignIn();

    return () => {
      cancelled = true;
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
