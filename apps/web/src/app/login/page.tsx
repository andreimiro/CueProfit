"use client";

import Link from "next/link";
import { useState } from "react";

import { GoogleGlyph } from "@/components/google-glyph";
import { ThemeToggle } from "@/components/theme-toggle";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  async function signInWithGoogle() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  return (
    <main className="relative grid min-h-screen lg:grid-cols-2">
      {/* left — brand panel */}
      <aside className="relative hidden flex-col justify-between overflow-hidden border-r border-edge p-12 lg:flex">
        <div className="pointer-events-none absolute inset-0 bg-ambient" aria-hidden />
        <div className="pointer-events-none absolute inset-0 grain" aria-hidden />

        <Link href="/" className="relative flex items-center gap-2.5">
          <span className="grid h-7 w-7 place-items-center rounded-md border border-profit/40 bg-profit/10">
            <span className="h-2.5 w-2.5 rounded-full bg-profit shadow-[0_0_12px_2px] shadow-profit/60" />
          </span>
          <span className="font-display text-[15px] font-extrabold tracking-tight">
            Cue<span className="text-profit">Profit</span>
          </span>
        </Link>

        <div className="relative">
          <p className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-profit">command-center</p>
          <h2 className="max-w-sm text-3xl font-bold leading-tight">
            Stop optimizing for ROAS. Start optimizing for profit.
          </h2>
          <div className="mt-8 max-w-xs space-y-2 rounded-xl border border-edge bg-panel/70 p-4 font-mono text-sm nums">
            <div className="flex justify-between">
              <span className="text-faint">net profit</span>
              <span className="text-profit">+12,480 RON</span>
            </div>
            <div className="flex justify-between">
              <span className="text-faint">wasted spend</span>
              <span className="text-loss">−740 RON</span>
            </div>
            <div className="flex justify-between">
              <span className="text-faint">break-even roas</span>
              <span className="text-muted">3.75</span>
            </div>
          </div>
        </div>

        <p className="relative font-mono text-xs text-faint">
          ./profit intelligence for Google Ads &amp; Merchant Center
        </p>
      </aside>

      {/* right — sign in */}
      <section className="relative flex items-center justify-center px-6 py-16">
        <div className="pointer-events-none absolute inset-0 bg-ambient opacity-60 lg:hidden" aria-hidden />
        <div className="absolute right-6 top-6">
          <ThemeToggle />
        </div>
        <div className="relative w-full max-w-sm animate-reveal">
          <Link
            href="/"
            className="mb-10 inline-flex items-center gap-2 font-mono text-xs text-faint transition hover:text-fg"
          >
            ← back home
          </Link>

          <h1 className="text-3xl font-bold">Sign in to CueProfit</h1>
          <p className="mt-2 text-sm text-muted">
            Use your Google account to access your command center.
          </p>

          <button
            type="button"
            onClick={signInWithGoogle}
            disabled={loading}
            className="mt-8 flex w-full items-center justify-center gap-3 rounded-lg border border-edge bg-panel px-5 py-3.5 font-semibold text-fg transition hover:border-profit/40 hover:bg-panel-2 disabled:opacity-60"
          >
            <GoogleGlyph />
            {loading ? "Redirecting…" : "Continue with Google"}
          </button>

          <div className="mt-8 rounded-xl border border-edge bg-panel/50 p-4">
            <p className="font-mono text-[11px] uppercase tracking-wider text-faint">heads up</p>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              This is app sign-in only. Connecting a Google Ads or Merchant Center account
              happens later, from inside the dashboard, through a separate consent flow.
            </p>
          </div>

          <p className="mt-8 text-xs text-faint">
            By continuing you agree to the Terms and Privacy Policy.
          </p>
        </div>
      </section>
    </main>
  );
}
