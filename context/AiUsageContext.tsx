"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { fetchWithSupabaseAuth } from "@/lib/supabase-browser";
import { useAuth } from "@/context/AuthContext";
import type { AiUsageSnapshot } from "@/lib/ai-usage";

type AiUsageContextValue = {
  usage: AiUsageSnapshot | null;
  loading: boolean;
  error: string;
  refreshUsage: () => Promise<void>;
  applyUsage: (nextUsage?: AiUsageSnapshot | null) => void;
};

const AiUsageContext = createContext<AiUsageContextValue>({
  usage: null,
  loading: false,
  error: "",
  refreshUsage: async () => {},
  applyUsage: () => {},
});

export function AiUsageProvider({ children }: { children: ReactNode }) {
  const { auth } = useAuth();
  const [usage, setUsage] = useState<AiUsageSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const refreshUsage = useCallback(async () => {
    if (!auth.signedIn) {
      setUsage(null);
      setError("");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetchWithSupabaseAuth("/api/ai/usage");
      const data = (await res.json().catch(() => null)) as
        | { usage?: AiUsageSnapshot; error?: string }
        | null;

      if (!res.ok) {
        if (res.status === 401) {
          setUsage(null);
          setError("");
          return;
        }

        throw new Error(data?.error || "No se pudo cargar el uso de IA.");
      }

      setUsage(data?.usage ?? null);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "No se pudo cargar el uso de IA.");
    } finally {
      setLoading(false);
    }
  }, [auth.signedIn]);

  const applyUsage = useCallback((nextUsage?: AiUsageSnapshot | null) => {
    if (!nextUsage) return;
    setUsage(nextUsage);
    setError("");
  }, []);

  useEffect(() => {
    void refreshUsage();
  }, [refreshUsage, auth.userId]);

  const value = useMemo(
    () => ({
      usage,
      loading,
      error,
      refreshUsage,
      applyUsage,
    }),
    [usage, loading, error, refreshUsage, applyUsage],
  );

  return <AiUsageContext.Provider value={value}>{children}</AiUsageContext.Provider>;
}

export function useAiUsage() {
  return useContext(AiUsageContext);
}
