"use client";

import { useSearchParams } from "next/navigation";

const MESSAGES: Record<string, { tone: "ok" | "err"; text: string }> = {
  "connect=success": { tone: "ok", text: "Google Ads connected — sync is starting." },
  "connect=error": { tone: "err", text: "Google Ads connection failed. Try again from Settings." },
  "connect=no_workspace": {
    tone: "err",
    text: "We couldn't create your workspace. Sign out and back in, or contact support if this persists.",
  },
  "merchant=success": { tone: "ok", text: "Merchant Center connected — catalog sync is starting." },
  "merchant=error": {
    tone: "err",
    text: "Merchant Center connection failed. Confirm your Google account has Merchant Center admin access, then try again.",
  },
};

export function ConnectFlash() {
  const params = useSearchParams();
  const key = ["connect", "merchant"]
    .map((k) => {
      const v = params.get(k);
      return v ? `${k}=${v}` : null;
    })
    .find(Boolean);

  if (!key) return null;
  const msg = MESSAGES[key];
  if (!msg) return null;

  const styles =
    msg.tone === "ok"
      ? "border-profit/30 bg-profit/10 text-profit"
      : "border-loss/30 bg-loss/10 text-fg";

  return (
    <div className={`mx-5 mt-4 rounded-xl border px-4 py-3 text-sm font-medium sm:mx-8 lg:mx-10 ${styles}`}>
      {msg.text}
    </div>
  );
}
