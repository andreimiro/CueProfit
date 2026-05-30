"use client";

import Link from "next/link";
import { useState } from "react";

import { Icon } from "@/components/app/icons";
import { GoogleGlyph } from "@/components/google-glyph";
import { ThemeToggle } from "@/components/theme-toggle";
import { createClient } from "@/lib/supabase/client";

const PROMISES = [
  "True net profit per campaign and SKU",
  "Wasted spend flagged before it compounds",
  "Ranked actions with profit impact attached",
];

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signInWithGoogle() {
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    // On success the browser redirects to Google, so we only land here on failure.
    if (oauthError) {
      setError(oauthError.message || "We couldn't start Google sign-in. Please try again.");
      setLoading(false);
    }
  }

  return (
    <main className="relative grid min-h-[100dvh] lg:grid-cols-[1.05fr_0.95fr]">
      {/* ── Left — brand panel ─────────────────────────────────────── */}
      <aside className="relative hidden flex-col justify-between overflow-hidden border-r border-edge p-12 lg:flex">
        <div className="pointer-events-none absolute inset-0 bg-ambient" aria-hidden />
        <div className="pointer-events-none absolute inset-0 bg-paper-grid opacity-40" aria-hidden />
        <div className="grain pointer-events-none absolute inset-0" aria-hidden />

        <Link href="/" className="group relative flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl border border-edge bg-fg text-canvas transition group-hover:border-profit/50">
            <span className="h-2.5 w-2.5 rounded-full bg-profit shadow-[0_0_10px_2px] shadow-profit/50" />
          </span>
          <span className="font-display text-[17px] font-semibold tracking-tight">
            Cue<span className="text-profit">Profit</span>
          </span>
        </Link>

        <div className="relative max-w-md">
          <span className="animate-reveal inline-flex items-center gap-2 rounded-full border border-edge bg-panel/70 px-3 py-1.5 text-xs font-medium text-muted">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-profit/70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-profit" />
            </span>
            Your profit command center
          </span>

          <h2
            className="animate-reveal mt-6 text-3xl font-semibold leading-[1.08] tracking-tight"
            style={{ animationDelay: "80ms" }}
          >
            <span className="block font-normal text-faint">Stop optimizing for ROAS.</span>
            <span className="block">
              Start optimizing for <span className="text-profit">profit</span>.
            </span>
          </h2>

          <div
            className="animate-reveal animate-float mt-8 rounded-2xl border border-edge bg-panel/70 p-4 shadow-card backdrop-blur"
            style={{ animationDelay: "160ms" }}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted">Workspace · last 7 days</p>
              <span className="rounded-full bg-profit/12 px-2 py-0.5 font-mono text-[11px] text-profit">
                +18%
              </span>
            </div>
            <div className="mt-3 space-y-2 font-mono text-sm nums">
              <Stat k="net profit" v="+18,420 RON" tone="profit" />
              <Stat k="wasted spend" v="−740 RON" tone="loss" />
              <Stat k="break-even roas" v="3.8×" tone="muted" />
            </div>
          </div>

          <ul
            className="animate-reveal mt-7 space-y-2.5"
            style={{ animationDelay: "240ms" }}
          >
            {PROMISES.map((p) => (
              <li key={p} className="flex items-center gap-2.5 text-sm text-muted">
                <Icon name="check" width={16} height={16} className="shrink-0 text-profit" />
                {p}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative font-mono text-xs text-faint">
          Profit intelligence for Google Ads &amp; Merchant Center
        </p>
      </aside>

      {/* ── Right — sign in ────────────────────────────────────────── */}
      <section className="relative flex items-center justify-center px-6 py-16">
        <div className="pointer-events-none absolute inset-0 bg-ambient opacity-50 lg:hidden" aria-hidden />
        <div className="absolute right-6 top-6">
          <ThemeToggle />
        </div>

        <div className="animate-reveal relative w-full max-w-sm">
          <Link
            href="/"
            className="mb-10 inline-flex items-center gap-1.5 text-sm font-medium text-faint transition hover:text-fg"
          >
            <ArrowLeft />
            Back home
          </Link>

          <h1 className="text-3xl font-semibold tracking-tight">Sign in to CueProfit</h1>
          <p className="mt-2 text-base leading-relaxed text-muted">
            Use your Google account to open your profit command center.
          </p>

          <button
            type="button"
            onClick={signInWithGoogle}
            disabled={loading}
            className="mt-8 flex w-full items-center justify-center gap-3 rounded-xl border border-edge bg-panel px-5 py-3.5 font-semibold text-fg transition duration-300 hover:border-profit/40 hover:bg-panel-2 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? (
              <>
                <span className="relative flex h-3.5 w-3.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-profit/60" />
                  <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-profit/30" />
                </span>
                Redirecting to Google…
              </>
            ) : (
              <>
                <GoogleGlyph />
                Continue with Google
              </>
            )}
          </button>

          {error ? (
            <div
              role="alert"
              className="mt-4 flex items-start gap-2.5 rounded-xl border border-loss/35 bg-loss/10 px-4 py-3 text-sm text-fg"
            >
              <Icon name="alert" width={17} height={17} className="mt-0.5 shrink-0 text-loss" />
              <span className="leading-6">{error}</span>
            </div>
          ) : null}

          <div className="mt-8 rounded-xl border border-edge bg-panel/50 p-4">
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-faint">
              <Icon name="link" width={14} height={14} className="text-profit" />
              Heads up
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              This is app sign-in only. Connecting a Google Ads or Merchant Center account happens
              later, from inside the dashboard, through a separate consent flow.
            </p>
          </div>

          <p className="mt-8 text-xs leading-relaxed text-faint">
            By continuing you agree to the Terms and Privacy Policy.
          </p>
        </div>
      </section>
    </main>
  );
}

function Stat({ k, v, tone }: { k: string; v: string; tone: "profit" | "loss" | "muted" }) {
  const color = tone === "profit" ? "text-profit" : tone === "loss" ? "text-loss" : "text-muted";
  return (
    <div className="flex items-center justify-between">
      <span className="text-faint">{k}</span>
      <span className={color}>{v}</span>
    </div>
  );
}

function ArrowLeft() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M19 12H5M11 18l-6-6 6-6" />
    </svg>
  );
}
