"use client";

import { useState } from "react";

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
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-6">
      <h1 className="text-2xl font-semibold">Sign in to CueProfit</h1>
      <button
        type="button"
        onClick={signInWithGoogle}
        disabled={loading}
        className="rounded-lg bg-white px-5 py-3 font-medium text-black transition hover:bg-neutral-200 disabled:opacity-60"
      >
        {loading ? "Redirecting…" : "Continue with Google"}
      </button>
      <p className="text-sm text-neutral-500">
        App sign-in only. Connecting a Google Ads or Merchant Center account happens
        later, from inside the dashboard, via a separate consent flow.
      </p>
    </main>
  );
}
