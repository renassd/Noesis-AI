"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null | undefined;

export function getSupabaseBrowser() {
  if (browserClient !== undefined) {
    return browserClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    browserClient = null;
    return browserClient;
  }

  browserClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return browserClient;
}

export async function getBrowserAccessToken() {
  const supabase = getSupabaseBrowser();
  if (!supabase) return null;

  const { data, error } = await supabase.auth.getSession();
  if (error) return null;

  return data.session?.access_token ?? null;
}

export async function fetchWithSupabaseAuth(input: RequestInfo | URL, init: RequestInit = {}) {
  const token = await getBrowserAccessToken();
  const headers = new Headers(init.headers);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(input, {
    ...init,
    headers,
  });
}
