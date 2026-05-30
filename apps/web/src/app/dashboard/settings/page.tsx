import type { ReactNode } from "react";

import { Panel, PanelHeader } from "@/components/app/cards";
import { PageHeader } from "@/components/app/page-header";
import { SignOutButton } from "@/components/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: memberships } = await supabase
    .from("workspace_members")
    .select("role, workspaces(name, currency)");

  const membership = memberships?.[0];
  const role = (membership?.role as string | undefined) ?? "owner";
  const workspace =
    (membership?.workspaces as { name?: string; currency?: string } | null) ?? null;

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
              <Row label="Name" value={workspace?.name ?? "Personal workspace"} />
              <Row label="Reporting currency" value={workspace?.currency ?? "RON"} mono />
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
            <PanelHeader title="Data sources" hint="Connections power your profit numbers" />
            <div className="divide-y divide-edge">
              <Row label="Google Ads" value="Not connected" />
              <Row label="Merchant Center" value="Not connected" />
              <Row label="Product costs" value="Not set" />
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4">
      <span className="text-sm text-muted">{label}</span>
      <span className={`text-sm font-medium text-fg ${mono ? "font-mono nums" : ""}`}>
        {value}
      </span>
    </div>
  );
}
