import type { ReactNode } from "react";

import Link from "next/link";

import type { SourceConnection, WorkspaceSources } from "@/lib/workspace";

import {
  AddProductCostsButton,
  ConnectGoogleButton,
  ConnectMerchantButton,
} from "./controls";
import { GoogleGlyph } from "@/components/google-glyph";
import { Icon } from "./icons";

const SYNC_LABEL: Record<SourceConnection["syncState"], string> = {
  disconnected: "Not connected",
  syncing: "Syncing…",
  ready: "Connected",
  needs_reauth: "Reconnect",
  error: "Sync issue",
};

const SYNC_DOT: Record<SourceConnection["syncState"], string> = {
  disconnected: "bg-faint",
  syncing: "bg-amber animate-pulse",
  ready: "bg-profit",
  needs_reauth: "bg-amber",
  error: "bg-loss",
};

/** Persistent sidebar card — one place to see what's authorized for this workspace. */
export function WorkspaceSourcesPanel({ sources }: { sources: WorkspaceSources }) {
  return (
    <div className="mt-4 rounded-xl border border-edge bg-canvas/50 p-3">
      <div className="flex items-center justify-between gap-2 px-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-faint">
          Data sources
        </p>
        <Link
          href="/dashboard/settings"
          className="text-[11px] font-semibold text-faint transition hover:text-profit"
        >
          Manage
        </Link>
      </div>

      <ul className="mt-2.5 space-y-1">
        <SourceRow
          icon={<GoogleGlyph size={14} />}
          name="Google Ads"
          detail={sources.googleAds.label}
          syncState={sources.googleAds.syncState}
          action={
            !sources.googleAds.connected ? (
              <ConnectGoogleButton variant="secondary">Connect</ConnectGoogleButton>
            ) : sources.googleAds.syncState === "needs_reauth" ? (
              <ConnectGoogleButton variant="secondary">Reconnect</ConnectGoogleButton>
            ) : null
          }
        />
        <SourceRow
          icon={<Icon name="feed" width={14} height={14} />}
          name="Merchant Center"
          detail={sources.merchant.label}
          syncState={sources.merchant.connected ? sources.merchant.syncState : "disconnected"}
          muted={!sources.hasGoogleAdsConnection}
          action={
            sources.hasGoogleAdsConnection && !sources.merchant.connected ? (
              <ConnectMerchantButton variant="secondary">Connect</ConnectMerchantButton>
            ) : null
          }
        />
        <SourceRow
          icon={<Icon name="products" width={14} height={14} />}
          name="Product costs"
          detail={sources.hasProductCosts ? "Defaults saved" : null}
          syncState={sources.hasProductCosts ? "ready" : "disconnected"}
          muted={!sources.hasGoogleAdsConnection}
          action={
            sources.hasGoogleAdsConnection && !sources.hasProductCosts ? (
              <AddProductCostsButton variant="secondary">Add</AddProductCostsButton>
            ) : null
          }
        />
      </ul>

      {sources.hasGoogleAdsConnection ? (
        <p className="mt-3 border-t border-edge pt-3 text-[11px] leading-5 text-faint">
          Authorized once per workspace — every page reuses this connection.
        </p>
      ) : null}
    </div>
  );
}

function SourceRow({
  icon,
  name,
  detail,
  syncState,
  muted,
  action,
}: {
  icon: ReactNode;
  name: string;
  detail: string | null;
  syncState: SourceConnection["syncState"] | "disconnected";
  muted?: boolean;
  action?: ReactNode;
}) {
  return (
    <li
      className={`rounded-lg px-2 py-2 ${muted ? "opacity-50" : ""}`}
    >
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md border border-edge bg-panel text-faint">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium text-fg">{name}</p>
            <span className="inline-flex shrink-0 items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
              <span className={`h-1.5 w-1.5 rounded-full ${SYNC_DOT[syncState]}`} />
              {SYNC_LABEL[syncState]}
            </span>
          </div>
          {detail ? (
            <p className="truncate text-xs text-faint" title={detail}>
              {detail}
            </p>
          ) : null}
          {action ? <div className="mt-2 [&_a]:px-2.5 [&_a]:py-1.5 [&_a]:text-xs">{action}</div> : null}
        </div>
      </div>
    </li>
  );
}
