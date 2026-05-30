import type { ReactNode } from "react";

import Link from "next/link";

import type { WorkspaceSources } from "@/lib/workspace";

import { Icon } from "./icons";

function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/** Top strip — confirms workspace auth is active; only nags when setup or sync is incomplete. */
export function WorkspaceStatusStrip({ sources }: { sources: WorkspaceSources }) {
  const ads = sources.googleAds;
  const syncing = ads.syncState === "syncing" || sources.merchant.syncState === "syncing";
  const setupIncomplete = sources.setupCount < 3;
  const fullyReady =
    sources.setupCount >= 3 &&
    ads.syncState === "ready" &&
    sources.merchant.syncState !== "syncing";

  if (!ads.connected) return null;
  if (fullyReady && !syncing) return null;

  if (ads.syncState === "needs_reauth") {
    return (
      <Strip tone="warn">
        Google Ads needs re-authorization.{" "}
        <Link href="/dashboard/settings" className="font-semibold text-fg underline-offset-2 hover:underline">
          Reconnect in Settings
        </Link>
      </Strip>
    );
  }

  if (syncing) {
    return (
      <Strip tone="sync">
        <span className="inline-flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber/60 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-amber" />
          </span>
          {ads.label ? `${ads.label} · ` : null}
          Initial sync in progress — browse freely; data fills in automatically.
        </span>
      </Strip>
    );
  }

  if (setupIncomplete) {
    const todo: string[] = [];
    if (!sources.hasMerchantConnection) todo.push("Merchant Center");
    if (!sources.hasProductCosts) todo.push("product costs");
    return (
      <Strip tone="ok">
        <span className="inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
          <span className="inline-flex items-center gap-1.5 font-medium text-profit">
            <Icon name="check" width={14} height={14} />
            Google Ads connected
          </span>
          {ads.lastSyncedAt ? (
            <span className="text-faint">· synced {formatRelative(ads.lastSyncedAt)}</span>
          ) : null}
          {todo.length > 0 ? (
            <>
              <span className="text-faint">·</span>
              <span>
                Finish setup: {todo.join(" & ")}{" "}
                <Link href="/dashboard/settings" className="font-semibold text-fg underline-offset-2 hover:underline">
                  in Settings
                </Link>
              </span>
            </>
          ) : null}
        </span>
      </Strip>
    );
  }

  return null;
}

function Strip({ tone, children }: { tone: "ok" | "sync" | "warn"; children: ReactNode }) {
  const bg =
    tone === "sync"
      ? "bg-amber/[0.08] border-amber/20"
      : tone === "warn"
        ? "bg-loss/[0.06] border-loss/20"
        : "bg-profit/[0.06] border-edge";
  return (
    <div className={`border-b px-5 py-2.5 text-center text-sm text-muted lg:px-10 ${bg}`}>
      {children}
    </div>
  );
}
