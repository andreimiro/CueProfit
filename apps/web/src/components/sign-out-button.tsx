"use client";

import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
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
      className="rounded-lg border border-edge px-3 py-2 text-sm text-muted transition hover:border-loss/40 hover:text-fg disabled:opacity-60"
    >
      {loading ? "Signing out…" : "Sign out"}
    </button>
  );
}
