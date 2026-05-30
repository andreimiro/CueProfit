import type { SupabaseClient } from "@supabase/supabase-js";

import { ensurePersonalWorkspace } from "@/lib/ensure-workspace";

type WorkspaceResult =
  | { ok: true; workspaceId: string }
  | { ok: false; redirect: string };

/** Resolve the user's workspace for OAuth connect flows (create one if missing). */
export async function getWorkspaceForConnect(
  _supabase: SupabaseClient,
  userId: string,
  _requestUrl: string,
): Promise<WorkspaceResult> {
  return ensurePersonalWorkspace(userId);
}

export type SetupStatus = {
  hasGoogleAdsConnection: boolean;
  hasMerchantConnection: boolean;
  hasProductCosts: boolean;
  setupCount: number;
};

export type SourceSyncState = "disconnected" | "syncing" | "ready" | "needs_reauth" | "error";

export type SourceConnection = {
  connected: boolean;
  label: string | null;
  lastSyncedAt: string | null;
  syncState: SourceSyncState;
};

/** Full workspace source picture — connection, sync, and setup in one load. */
export type WorkspaceSources = SetupStatus & {
  googleAds: SourceConnection;
  merchant: SourceConnection;
};

type ConnectionRow = {
  display_name?: string | null;
  external_account_id?: string | null;
  last_synced_at?: string | null;
  last_error?: string | null;
  status?: string | null;
  created_at?: string | null;
};

type SyncRunRow = { status?: string | null };

function deriveSyncState(
  row: ConnectionRow | null | undefined,
  latestRun: SyncRunRow | null | undefined,
): SourceConnection {
  if (!row || row.status !== "active") {
    const needsReauth = row?.status === "needs_reauth" || row?.status === "revoked";
    return {
      connected: false,
      label: row?.display_name ?? row?.external_account_id ?? null,
      lastSyncedAt: row?.last_synced_at ?? null,
      syncState: needsReauth ? "needs_reauth" : "disconnected",
    };
  }

  const label = row.display_name ?? row.external_account_id ?? null;
  const lastSyncedAt = row.last_synced_at ?? null;
  const runActive = latestRun?.status === "queued" || latestRun?.status === "running";

  if (row.last_error && !lastSyncedAt) {
    return { connected: true, label, lastSyncedAt, syncState: "error" };
  }
  if (!lastSyncedAt || runActive) {
    return { connected: true, label, lastSyncedAt, syncState: "syncing" };
  }
  return { connected: true, label, lastSyncedAt, syncState: "ready" };
}

function aggregateGoogleAdsConnections(
  rows: ConnectionRow[],
  latestRun: SyncRunRow | null | undefined,
): SourceConnection {
  const active = rows.filter((r) => r.status === "active");
  if (active.length === 0) {
    const row = rows[0];
    const needsReauth = row?.status === "needs_reauth" || row?.status === "revoked";
    return {
      connected: false,
      label: row?.display_name ?? row?.external_account_id ?? null,
      lastSyncedAt: row?.last_synced_at ?? null,
      syncState: needsReauth ? "needs_reauth" : "disconnected",
    };
  }

  const synced = active.filter((r) => r.last_synced_at);
  const best = synced.sort(
    (a, b) => new Date(b.last_synced_at!).getTime() - new Date(a.last_synced_at!).getTime(),
  )[0];
  const pick = best ?? active[0];
  const lastSyncedAt = best?.last_synced_at ?? null;
  const runActive = latestRun?.status === "queued" || latestRun?.status === "running";

  const label =
    active.length > 1 && lastSyncedAt
      ? `${active.length} Ads accounts · ${best?.external_account_id ?? "synced"}`
      : (pick.display_name ?? pick.external_account_id ?? null);

  if (active.some((r) => r.last_error && !r.last_synced_at) && !lastSyncedAt) {
    return { connected: true, label, lastSyncedAt, syncState: "error" };
  }
  if (!lastSyncedAt || (runActive && !best)) {
    return { connected: true, label, lastSyncedAt, syncState: "syncing" };
  }
  return { connected: true, label, lastSyncedAt, syncState: "ready" };
}

export async function getWorkspaceSources(
  supabase: SupabaseClient,
  workspaceId: string,
  options?: { connectionsClient?: SupabaseClient },
): Promise<WorkspaceSources> {
  const conn = options?.connectionsClient ?? supabase;
  const [adsRes, merchantRes, workspaceRes, adsSyncRes, merchantSyncRes] = await Promise.all([
    conn
      .from("oauth_connections")
      .select("display_name,external_account_id,last_synced_at,last_error,status,created_at")
      .eq("workspace_id", workspaceId)
      .eq("provider", "google_ads")
      .eq("status", "active")
      .order("last_synced_at", { ascending: false, nullsFirst: false }),
    conn
      .from("oauth_connections")
      .select("display_name,external_account_id,last_synced_at,last_error,status")
      .eq("workspace_id", workspaceId)
      .eq("provider", "merchant_center")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1),
    supabase
      .from("workspaces")
      .select("default_margin_rate, default_shipping_cost")
      .eq("id", workspaceId)
      .single(),
    conn
      .from("sync_runs")
      .select("status")
      .eq("workspace_id", workspaceId)
      .eq("provider", "google_ads")
      .order("created_at", { ascending: false })
      .limit(1),
    conn
      .from("sync_runs")
      .select("status")
      .eq("workspace_id", workspaceId)
      .eq("provider", "merchant_center")
      .order("created_at", { ascending: false })
      .limit(1),
  ]);

  const googleAds = aggregateGoogleAdsConnections(
    (adsRes.data ?? []) as ConnectionRow[],
    adsSyncRes.data?.[0] as SyncRunRow | undefined,
  );
  const merchant = deriveSyncState(
    merchantRes.data?.[0] as ConnectionRow | undefined,
    merchantSyncRes.data?.[0] as SyncRunRow | undefined,
  );

  const ws = workspaceRes.data as
    | { default_margin_rate?: number | null; default_shipping_cost?: number | null }
    | null;
  const hasProductCosts =
    ws?.default_margin_rate != null || ws?.default_shipping_cost != null;

  const hasGoogleAdsConnection = googleAds.connected;
  const hasMerchantConnection = merchant.connected;
  const setupCount =
    Number(hasGoogleAdsConnection) + Number(hasMerchantConnection) + Number(hasProductCosts);

  return {
    hasGoogleAdsConnection,
    hasMerchantConnection,
    hasProductCosts,
    setupCount,
    googleAds,
    merchant,
  };
}

export async function getSetupStatus(
  supabase: SupabaseClient,
  workspaceId: string,
): Promise<SetupStatus> {
  const sources = await getWorkspaceSources(supabase, workspaceId);
  return {
    hasGoogleAdsConnection: sources.hasGoogleAdsConnection,
    hasMerchantConnection: sources.hasMerchantConnection,
    hasProductCosts: sources.hasProductCosts,
    setupCount: sources.setupCount,
  };
}
