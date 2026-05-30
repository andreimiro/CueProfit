import type { ReactNode } from "react";

import type { SourceConnection, WorkspaceSources } from "@/lib/workspace";

import { EmptyState } from "./cards";
import {
  AddProductCostsButton,
  ConnectGoogleButton,
  ConnectMerchantButton,
} from "./controls";
import type { IconName } from "./icons";

type DataSource = "google_ads" | "merchant" | "profit";

function SyncPendingNote({ connection }: { connection: SourceConnection }) {
  return (
    <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-amber/25 bg-amber/[0.08] px-3 py-1.5 text-xs font-medium text-muted">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber/60 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-amber" />
      </span>
      {connection.label ? `${connection.label} · ` : null}
      Pulling data — no extra sign-in needed
    </div>
  );
}

/** Empty state that respects workspace connection — never re-prompts OAuth when already connected. */
export function DataSourceEmpty({
  sources,
  source,
  icon,
  title,
  description,
}: {
  sources: WorkspaceSources;
  source: DataSource;
  icon: IconName;
  title?: string;
  description?: string;
}) {
  const state = resolveEmptyState(sources, source);
  return (
    <EmptyState
      icon={icon}
      title={title ?? state.title}
      description={description ?? state.description}
      action={state.action}
    >
      {state.syncNote}
    </EmptyState>
  );
}

function resolveEmptyState(
  sources: WorkspaceSources,
  source: DataSource,
): { title: string; description: string; action?: ReactNode; syncNote?: ReactNode } {
  if (source === "google_ads") {
    if (sources.googleAds.connected) {
      if (sources.googleAds.syncState === "syncing") {
        return {
          title: "First sync in progress",
          description:
            "Google Ads is already authorized for this workspace. Campaign rows will land here when the import finishes.",
          syncNote: <SyncPendingNote connection={sources.googleAds} />,
        };
      }
      if (sources.googleAds.syncState === "ready") {
        return {
          title: "No campaigns in this period",
          description:
            "Your Ads account is connected app-wide. Try widening the date range or check that campaigns had spend recently.",
        };
      }
      return {
        title: "Waiting on Google Ads data",
        description: "Your connection is saved — we will retry the sync automatically.",
      };
    }
    return {
      title: "Connect Google Ads once",
      description:
        "Authorize your Ads account a single time. Every dashboard page reuses that connection — you will not sign in again per page.",
      action: <ConnectGoogleButton variant="secondary" />,
    };
  }

  if (source === "merchant") {
    if (sources.merchant.connected) {
      return {
        title: sources.merchant.syncState === "syncing" ? "Catalog sync in progress" : "Feed monitoring starts after sync",
        description:
          "Merchant Center is connected for this workspace. Feed health signals appear once the catalog import completes.",
        syncNote:
          sources.merchant.syncState === "syncing" ? (
            <SyncPendingNote connection={sources.merchant} />
          ) : undefined,
      };
    }
    if (!sources.hasGoogleAdsConnection) {
      return {
        title: "Connect Google Ads first",
        description: "Merchant Center unlocks after your primary Google Ads connection is in place.",
      };
    }
    return {
      title: "Connect Merchant Center once",
      description: "One-time authorization. Your product feed syncs automatically across the app afterward.",
      action: <ConnectMerchantButton variant="secondary" />,
    };
  }

  if (!sources.hasGoogleAdsConnection) {
    return {
      title: "Connect Google Ads first",
      description: "Profit numbers need campaign and product spend from your connected Ads account.",
      action: <ConnectGoogleButton variant="secondary" />,
    };
  }
  if (!sources.hasProductCosts) {
    return {
      title: "Add product costs to unlock profit",
      description:
        "Google Ads is already connected workspace-wide. Set default COGS and fees once — we apply them across every SKU.",
      action: <AddProductCostsButton />,
    };
  }
  if (sources.googleAds.syncState === "syncing") {
    return {
      title: "Profit data is on the way",
      description:
        "Sources are connected. Recommendations and SKU profit appear after the workspace sync and profit recompute finish.",
      syncNote: <SyncPendingNote connection={sources.googleAds} />,
    };
  }
  return {
    title: "Waiting for synced data",
    description: "Your sources are connected. Numbers will populate after the workspace sync completes.",
  };
}

/** Header action: only prompt connect when the workspace is not yet authorized. */
export function GoogleAdsHeaderAction({ sources }: { sources: WorkspaceSources }) {
  if (sources.hasGoogleAdsConnection) return null;
  return <ConnectGoogleButton />;
}

export function MerchantHeaderAction({ sources }: { sources: WorkspaceSources }) {
  if (sources.hasMerchantConnection || !sources.hasGoogleAdsConnection) return null;
  return <ConnectMerchantButton />;
}
