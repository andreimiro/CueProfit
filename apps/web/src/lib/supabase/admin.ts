import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client — BYPASSES RLS. Server-only: never import this into
 * a client component or expose the key to the browser. Use only for reads/writes
 * that legitimately need to cross the row-level-security boundary (e.g. checking a
 * workspace's connection rows the user can't select directly).
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
