"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { useLang } from "@/app/i18n";

function ResetPasswordContent() {
  const router = useRouter();
  const { t } = useLang();
  const a = t.auth;

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [ready, setReady] = useState(false);

  // Supabase embeds the session in the URL hash on redirect — exchange it first
  useEffect(() => {
    const supabase = getSupabaseBrowser();
    if (!supabase) return;

    // The recovery token arrives as a hash fragment; onAuthStateChange picks it up
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleReset() {
    const supabase = getSupabaseBrowser();
    if (!supabase || !password.trim()) return;
    setLoading(true);
    setError("");
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setSuccess(true);
      setTimeout(() => router.replace("/"), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : a.resetError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 400, display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 4px" }}>Neuvra AI</p>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0 }}>{a.resetTitle}</h1>
          <p style={{ fontSize: "0.9rem", color: "var(--muted)", margin: "8px 0 0" }}>{a.resetDescription}</p>
        </div>

        {success ? (
          <p style={{ fontSize: 14, color: "#15803d", padding: "12px 16px", background: "#f0fdf4", borderRadius: 10, border: "1px solid #bbf7d0", margin: 0 }}>
            {a.resetSuccess}
          </p>
        ) : !ready ? (
          <p style={{ fontSize: 14, color: "var(--muted)" }}>Verificando enlace...</p>
        ) : (
          <>
            <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 14, fontWeight: 500 }}>
              {a.newPassword}
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void handleReset()}
                placeholder={a.newPasswordPlaceholder}
                autoFocus
                style={{
                  padding: "10px 14px",
                  border: "1.5px solid var(--line, #dbe4f1)",
                  borderRadius: 10,
                  fontSize: 14,
                  fontFamily: "inherit",
                  outline: "none",
                  background: "var(--surface, #fff)",
                  color: "var(--ink)",
                }}
              />
            </label>

            <button
              type="button"
              onClick={() => void handleReset()}
              disabled={loading || password.length < 6}
              style={{
                padding: "12px",
                background: "var(--blue-700, #3b6de0)",
                color: "#fff",
                border: "none",
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 700,
                cursor: loading || password.length < 6 ? "not-allowed" : "pointer",
                opacity: loading || password.length < 6 ? 0.6 : 1,
                fontFamily: "inherit",
              }}
            >
              {loading ? "Actualizando..." : a.resetCta}
            </button>

            {error && (
              <p style={{ fontSize: 13, color: "#c2410c", margin: 0 }}>{error}</p>
            )}
          </>
        )}
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <p>Cargando...</p>
      </main>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
