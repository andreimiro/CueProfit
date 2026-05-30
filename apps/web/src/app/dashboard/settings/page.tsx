import type { ReactNode } from "react";

import Link from "next/link";

import { ConnectGoogleButton, ConnectMerchantButton } from "@/components/app/controls";
import { Panel, PanelHeader } from "@/components/app/cards";
import { PageHeader } from "@/components/app/page-header";
import { SyncNowButton } from "@/components/app/sync-now-button";
import { SignOutButton } from "@/components/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { loadDashboardWorkspace } from "@/lib/dashboard-workspace";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: memberships } = await supabase
    .from("workspace_members")
    .select("workspace_id, role, workspaces(name, currency)");

  const membership = memberships?.[0];
  const role = (membership?.role as string | undefined) ?? "owner";
  const { sources, workspaceName, currency, workspaceId } = await loadDashboardWorkspace();

  return (
    <div className="px-5 py-6 sm:px-8 lg:px-10 lg:py-8">
      <div className="mx-auto w-full max-w-[1760px] animate-reveal space-y-7">
        <PageHeader title="Settings" subtitle="Manage your account, workspace and appearance" />

        <div className="grid gap-5 lg:grid-cols-2">
          <Panel>
            <PanelHeader title="Account" hint="The Google account you sign in with" />
            <div className="divide-y divide-edge">
              <Row label="Email" value={user?.email ?? "—"} />
              <Row label="Session" value="Signed in" />
              <div className="flex items-center justify-between gap-4 px-5 py-4">
                <span className="text-sm text-muted">Sign out of CueProfit</span>
                <SignOutButton />
              </div>
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="Workspace" hint="Reporting currency applies across the dashboard" />
            <div className="divide-y divide-edge">
              <Row label="Name" value={workspaceName} />
              <Row label="Reporting currency" value={currency} mono />
              <Row label="Your role" value={role} />
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="Appearance" hint="Choose how CueProfit looks" />
            <div className="flex items-center justify-between gap-4 px-5 py-4">
              <div>
                <p className="text-sm font-medium text-fg">Theme</p>
                <p className="text-sm text-muted">Switch between dark and light.</p>
              </div>
              <ThemeToggle />
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="Data sources" hint="One-time authorization per workspace" />
            <div className="divide-y divide-edge">
              <Row
                label="Google Ads"
                value={
                  sources.googleAds.connected
                    ? sources.googleAds.label ?? "Connected"
                    : "Not connected"
                }
                detail={
                  sources.googleAds.connected
                    ? sources.googleAds.syncState === "syncing"
                      ? "Initial sync in progress"
                      : sources.googleAds.lastSyncedAt
                        ? `Last synced ${formatRelative(sources.googleAds.lastSyncedAt)}`
                        : "Connected"
                    : undefined
                }
                action={
                  sources.googleAds.connected && workspaceId ? (
                    <SyncNowButton workspaceId={workspaceId} />
                  ) : !sources.googleAds.connected ? (
                    <ConnectGoogleButton variant="secondary" />
                  ) : undefined
                }
              />
              <Row
                label="Merchant Center"
                value={
                  sources.merchant.connected
                    ? sources.merchant.label ?? "Connected"
                    : "Not connected"
                }
                detail={
                  sources.merchant.connected && sources.merchant.syncState === "syncing"
                    ? "Catalog sync in progress"
                    : undefined
                }
                action={
                  !sources.merchant.connected && sources.hasGoogleAdsConnection ? (
                    <ConnectMerchantButton variant="secondary" />
                  ) : undefined
                }
              />
              <Row
                label="Product costs"
                value={sources.hasProductCosts ? "Configured" : "Not set"}
                action={
                  !sources.hasProductCosts && sources.hasGoogleAdsConnection ? (
                    <Link
                      href="/dashboard/costs"
                      className="rounded-lg border border-edge bg-panel px-3 py-1.5 text-xs font-semibold text-fg transition hover:border-profit/40"
                    >
                      Add costs
                    </Link>
                  ) : undefined
                }
              />
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function Row({
  label,
  value,
  detail,
  mono,
  action,
}: {
  label: string;
  value: ReactNode;
  detail?: string;
  mono?: boolean;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4">
      <span className="text-sm text-muted">{label}</span>
      <div className="flex items-center gap-3 text-right">
        <div>
          <span className={`block text-sm font-medium text-fg ${mono ? "font-mono nums" : ""}`}>
            {value}
          </span>
          {detail ? <span className="block text-xs text-faint">{detail}</span> : null}
        </div>
        {action}
      </div>
    </div>
  );
}
