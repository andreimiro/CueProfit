"use client";

import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

export function SignOutButton({ className = "" }: { className?: string }) {
  const [loading, setLoading] = useState(false);

  async function signOut() {
    setLoading(true);
    await createClient().auth.signOut();
    window.location.assign("/login");
  }

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={loading}
      className={`inline-flex items-center gap-2 rounded-lg border border-edge px-3 py-2 text-sm font-medium text-muted transition hover:border-loss/40 hover:text-fg disabled:opacity-60 ${className}`}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M15 17l5-5-5-5M20 12H9M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3" />
      </svg>
      {loading ? "Signing out…" : "Sign out"}
    </button>
  );
}
