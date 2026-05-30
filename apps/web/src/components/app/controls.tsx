import type { ReactNode } from "react";

import { GoogleGlyph } from "@/components/google-glyph";

import { Icon } from "./icons";

/** The primary, always-obvious action: connect a Google Ads account. */
export function ConnectGoogleButton({
  children = "Connect Google Ads",
  variant = "primary",
}: {
  children?: ReactNode;
  variant?: "primary" | "secondary";
}) {
  const base =
    "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition";
  const styles =
    variant === "primary"
      ? "bg-profit text-on-profit shadow-[0_18px_35px_-22px_var(--color-profit)] hover:bg-profit-strong"
      : "border border-edge bg-panel text-fg hover:border-profit/40";
  return (
    <a href="/api/connect/google/start" className={`${base} ${styles}`}>
      <GoogleGlyph size={16} />
      {children}
    </a>
  );
}

export function DateRangePill({ label = "Last 7 days" }: { label?: string }) {
  return (
    <button
      type="button"
      className="inline-flex items-center gap-2 rounded-xl border border-edge bg-panel px-3.5 py-2.5 text-sm font-medium text-muted transition hover:border-profit/30 hover:text-fg"
    >
      <Icon name="calendar" width={16} height={16} className="text-faint" />
      {label}
      <Icon name="chevronDown" width={15} height={15} className="text-faint" />
    </button>
  );
}

export function SearchField() {
  return (
    <div className="relative hidden md:block">
      <Icon
        name="search"
        width={16}
        height={16}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint"
      />
      <input
        type="search"
        placeholder="Search campaigns, products…"
        aria-label="Search"
        className="w-52 rounded-xl border border-edge bg-panel py-2.5 pl-9 pr-3 text-sm text-fg outline-none transition placeholder:text-faint focus:border-profit/40 lg:w-64"
      />
    </div>
  );
}
