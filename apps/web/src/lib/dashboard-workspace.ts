import { cache } from "react";

import { createAdminClient } from "@/lib/supabase/admin";
import { ensurePersonalWorkspace } from "@/lib/ensure-workspace";
import { createClient } from "@/lib/supabase/server";
import {
  getWorkspaceSources,
  type SetupStatus,
  type WorkspaceSources,
} from "@/lib/workspace";

export type DashboardWorkspace = {
  workspaceId: string | undefined;
  currency: string;
  workspaceName: string;
  /** @deprecated use `sources` — kept for gradual migration */
  setup: SetupStatus;
  sources: WorkspaceSources;
};

const emptySources: WorkspaceSources = {
  hasGoogleAdsConnection: false,
  hasMerchantConnection: false,
  hasProductCosts: false,
  setupCount: 0,
  googleAds: { connected: false, label: null, lastSyncedAt: null, syncState: "disconnected" },
  merchant: { connected: false, label: null, lastSyncedAt: null, syncState: "disconnected" },
};

/** Cached per request — layout + pages share one membership/sources load. */
export const loadDashboardWorkspace = cache(async (): Promise<DashboardWorkspace> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await ensurePersonalWorkspace(user.id);
  }

  const { data: memberships } = await supabase
    .from("workspace_members")
    .select("workspace_id, workspaces(name, currency)")
    .eq("user_id", user?.id ?? "")
    .order("created_at", { ascending: true })
    .limit(1);

  const membership = memberships?.[0];
  const workspaceId = membership?.workspace_id as string | undefined;
  const workspace = membership?.workspaces as { name?: string; currency?: string } | null;

  const sources = workspaceId
    ? await getWorkspaceSources(supabase, workspaceId, {
        connectionsClient: process.env.SUPABASE_SERVICE_ROLE_KEY
          ? createAdminClient()
          : supabase,
      })
    : emptySources;

  return {
    workspaceId,
    currency: workspace?.currency ?? "RON",
    workspaceName: workspace?.name ?? "Personal workspace",
    setup: sources,
    sources,
  };
});
