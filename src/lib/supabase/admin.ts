import { createClient } from "@supabase/supabase-js";

/* Service-role client: bypasses RLS. Server-only — never import from a client component. */
export function supabaseAdmin() {
  if (typeof window !== "undefined") throw new Error("supabaseAdmin is server-only");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase is not configured");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
