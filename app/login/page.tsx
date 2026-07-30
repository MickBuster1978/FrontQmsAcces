// app/login/page.tsx
"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setLoading(false);
      setError(
        error.message === "Invalid login credentials"
          ? "Forkert e-mail eller adgangskode."
          : error.message
      );
      return;
    }

    const next = searchParams.get("next");
    router.push(next && next.startsWith("/") ? next : "/dashboard");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Wordmark */}
        <div className="rule-double pb-4 text-center">
          <p className="text-[26px] font-semibold tracking-tight">AiQMS</p>
          <p className="label mt-1">Kvalitetsstyring for fødevareproducenter</p>
        </div>

        <div className="mt-8 space-y-5">
          <div>
            <label htmlFor="email" className="label">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 w-full rounded-sm border border-raw-edge bg-raw-deep
                         px-3 py-2 text-[16px] outline-none transition-colors
                         focus:border-brand"
            />
          </div>

          <div>
            <label htmlFor="password" className="label">
              Adgangskode
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !loading) handleLogin();
              }}
              className="mt-1.5 w-full rounded-sm border border-raw-edge bg-raw-deep
                         px-3 py-2 text-[16px] outline-none transition-colors
                         focus:border-brand"
            />
          </div>

          {error ? (
            <p className="border border-state-bad/30 bg-state-bad/5 px-3 py-2
                          text-[14px] text-state-bad">
              {error}
            </p>
          ) : null}

          <button
            type="button"
            onClick={handleLogin}
            disabled={loading || !email || !password}
            className="btn w-full disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Logger ind …" : "Log ind"}
          </button>

          <p className="text-center text-[14px] text-ink-faint">
            Ingen konto? Kontakt jeres kvalitetsansvarlige – brugere oprettes
            af virksomhedens administrator.
          </p>
        </div>
      </div>
    </main>
  );
}
