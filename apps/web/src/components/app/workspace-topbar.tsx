import Link from "next/link";
import type { ReactNode } from "react";

import { GoogleGlyph } from "@/components/google-glyph";
import type { SourceConnection, WorkspaceSources } from "@/lib/workspace";

import {
  AddProductCostsButton,
  ConnectGoogleButton,
  ConnectMerchantButton,
} from "./controls";
import { Icon } from "./icons";

function formatRelative(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const DOT: Record<SourceConnection["syncState"] | "disconnected", string> = {
  disconnected: "bg-faint",
  syncing: "bg-amber animate-pulse",
  ready: "bg-profit",
  needs_reauth: "bg-amber",
  error: "bg-loss",
};

/** Desktop topbar: the workspace's data sources, with status + inline connect
 *  actions. Replaces the old centered status banner; mirrors the mobile compact. */
export function WorkspaceTopbar({ sources }: { sources: WorkspaceSources }) {
  const ads = sources.googleAds;
  const adsDetail = ads.connected
    ? ads.syncState === "syncing"
      ? "Syncing…"
      : ads.lastSyncedAt
        ? `synced ${formatRelative(ads.lastSyncedAt)}`
        : "Connected"
    : null;

  return (
    <div className="sticky top-0 z-20 hidden border-b border-edge bg-panel/70 backdrop-blur-xl lg:block">
      <div className="flex items-center gap-3 px-6 py-2.5 xl:px-10">
        <span className="mr-1 shrink-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-faint">
          Data sources
        </span>

        <SourceChip
          icon={<GoogleGlyph size={13} />}
          name="Google Ads"
          state={ads.syncState}
          detail={adsDetail}
          action={
            !ads.connected ? (
              <ConnectGoogleButton variant="secondary">Connect</ConnectGoogleButton>
            ) : ads.syncState === "needs_reauth" ? (
              <ConnectGoogleButton variant="secondary">Reconnect</ConnectGoogleButton>
            ) : null
          }
        />
        <SourceChip
          icon={<Icon name="feed" width={13} height={13} />}
          name="Merchant Center"
          state={sources.merchant.connected ? sources.merchant.syncState : "disconnected"}
          detail={sources.merchant.connected ? sources.merchant.label : null}
          muted={!sources.hasGoogleAdsConnection}
          action={
            sources.hasGoogleAdsConnection && !sources.merchant.connected ? (
              <ConnectMerchantButton variant="secondary">Connect</ConnectMerchantButton>
            ) : null
          }
        />
        <SourceChip
          icon={<Icon name="products" width={13} height={13} />}
          name="Product costs"
          state={sources.hasProductCosts ? "ready" : "disconnected"}
          detail={sources.hasProductCosts ? "Defaults saved" : null}
          muted={!sources.hasGoogleAdsConnection}
          action={
            sources.hasGoogleAdsConnection && !sources.hasProductCosts ? (
              <AddProductCostsButton variant="secondary">Add</AddProductCostsButton>
            ) : null
          }
        />

        <Link
          href="/dashboard/settings"
          className="ml-auto shrink-0 text-xs font-semibold text-faint transition hover:text-profit"
        >
          Manage
        </Link>
      </div>
    </div>
  );
}

function SourceChip({
  icon,
  name,
  state,
  detail,
  muted,
  action,
}: {
  icon: ReactNode;
  name: string;
  state: SourceConnection["syncState"] | "disconnected";
  detail: string | null;
  muted?: boolean;
  action?: ReactNode;
}) {
  return (
    <div
      className={`flex min-w-0 items-center gap-2 rounded-full border border-edge bg-canvas/50 py-1 pl-2 pr-2.5 ${
        muted ? "opacity-50" : ""
      }`}
    >
      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md border border-edge bg-panel text-faint">
        {icon}
      </span>
      <span className="flex items-center gap-1.5 text-xs font-medium text-fg">
        <span className={`h-1.5 w-1.5 rounded-full ${DOT[state]}`} />
        {name}
      </span>
      {detail ? <span className="truncate text-xs text-faint">· {detail}</span> : null}
      {action ? (
        <span className="ml-1 [&_a]:rounded-lg [&_a]:px-2 [&_a]:py-1 [&_a]:text-[11px]">{action}</span>
      ) : null}
    </div>
  );
}
