import type { ReactNode } from "react";

import Link from "next/link";

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

/** Connect a Merchant Center account (content scope only). */
export function ConnectMerchantButton({
  children = "Connect Merchant Center",
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
    <a href="/api/connect/merchant/start" className={`${base} ${styles}`}>
      <Icon name="feed" width={16} height={16} />
      {children}
    </a>
  );
}

/** Link to the product-cost defaults form. */
export function AddProductCostsButton({
  children = "Add product costs",
  variant = "secondary",
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
    <Link href="/dashboard/costs" className={`${base} ${styles}`}>
      <Icon name="products" width={16} height={16} />
      {children}
    </Link>
  );
}

// DateRangePill + SearchField now live in date-range-picker.tsx / search-field.tsx
// (client components that actually drive the ?range and ?q params).
