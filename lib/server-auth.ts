import { createClient, type User } from "@supabase/supabase-js";

type RequestLike = {
  headers: Headers;
};

export class AuthError extends Error {
  status: number;

  constructor(message: string, status = 401) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

function getSupabaseUrl() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error("Falta NEXT_PUBLIC_SUPABASE_URL en el entorno.");
  }
  return url;
}

function getSupabaseAnonKey() {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) {
    throw new Error("Falta NEXT_PUBLIC_SUPABASE_ANON_KEY en el entorno.");
  }
  return key;
}

export function getBearerToken(request: RequestLike): string | null {
  const header = request.headers.get("authorization") ?? request.headers.get("Authorization");
  if (!header) return null;

  const [scheme, token] = header.split(" ");
  if (!scheme || scheme.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token.trim();
}

export async function requireAuthenticatedUser(request: RequestLike): Promise<{
  accessToken: string;
  user: User;
}> {
  const accessToken = getBearerToken(request);

  if (!accessToken) {
    throw new AuthError("Authentication required.", 401);
  }

  const supabase = createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });

  const { data, error } = await supabase.auth.getUser(accessToken);

  if (error || !data.user) {
    throw new AuthError("Invalid or expired session.", 401);
  }

  return {
    accessToken,
    user: data.user,
  };
}
