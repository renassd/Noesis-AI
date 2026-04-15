import { createClient } from "@supabase/supabase-js";

export function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error("Falta NEXT_PUBLIC_SUPABASE_URL en el entorno.");
  }

  if (!supabaseServiceRoleKey) {
    throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY en el entorno.");
  }

  // Cliente solo para el servidor. Nunca se importa desde componentes cliente.
  return createClient(supabaseUrl, supabaseServiceRoleKey);
}
