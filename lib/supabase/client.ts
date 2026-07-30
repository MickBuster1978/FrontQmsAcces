// lib/supabase/client.ts
import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase-klient til CLIENT components ("use client").
 * Bruger anon key – al dataadgang styres af RLS, aldrig af klienten.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
