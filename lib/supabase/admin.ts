// lib/supabase/admin.ts
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Admin-klient med service role – omgår RLS.
 * MÅ KUN importeres i server actions og route handlers.
 * Bruges udelukkende hvor RLS ikke kan: brugeroprettelse, onboarding,
 * senere invitationer og cron-jobs. Al almindelig CRUD går via
 * lib/supabase/server.ts og RLS.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY mangler i miljøvariablerne (Vercel → Settings → Environment Variables)."
    );
  }

  return createSupabaseClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
