import Link from "next/link";

import type { WorkspaceSources } from "@/lib/workspace";

/** Mobile-only summary — mirrors sidebar connection state without duplicating connect flows. */
export function WorkspaceSourcesCompact({ sources }: { sources: WorkspaceSources }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-edge bg-canvas/60 px-3 py-2">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <SourcePill
          label="Ads"
          ok={sources.googleAds.connected}
          syncing={sources.googleAds.syncState === "syncing"}
        />
        <SourcePill
          label="Merchant"
          ok={sources.merchant.connected}
          syncing={sources.merchant.syncState === "syncing"}
          muted={!sources.hasGoogleAdsConnection}
        />
        <SourcePill label="Costs" ok={sources.hasProductCosts} muted={!sources.hasGoogleAdsConnection} />
      </div>
      <Link
        href="/dashboard/settings"
        className="shrink-0 text-[11px] font-semibold text-faint transition hover:text-profit"
      >
        Manage
      </Link>
    </div>
  );
}

function SourcePill({
  label,
  ok,
  syncing,
  muted,
}: {
  label: string;
  ok: boolean;
  syncing?: boolean;
  muted?: boolean;
}) {
  const dot = syncing ? "bg-amber animate-pulse" : ok ? "bg-profit" : "bg-faint";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-edge bg-panel px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
        muted ? "text-faint opacity-60" : ok ? "text-muted" : "text-faint"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}
