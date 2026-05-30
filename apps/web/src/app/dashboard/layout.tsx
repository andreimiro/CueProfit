import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { Brand, MobileNav, Sidebar } from "@/components/app/sidebar";
import { WorkspaceSourcesCompact } from "@/components/app/workspace-sources-compact";
import { WorkspaceTopbar } from "@/components/app/workspace-topbar";
import { SignOutButton } from "@/components/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { loadDashboardWorkspace } from "@/lib/dashboard-workspace";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: memberships } = await supabase
    .from("workspace_members")
    .select("role, workspaces(name, currency)");

  const workspaceName =
    (memberships?.[0]?.workspaces as { name?: string } | null)?.name ?? "Personal workspace";

  const { sources } = await loadDashboardWorkspace();

  return (
    <div className="min-h-screen bg-canvas">
      {/* Persistent static sidebar (desktop) */}
      <Sidebar workspaceName={workspaceName} userEmail={user.email ?? ""} />

      {/* Mobile header + nav (sidebar is hidden below lg) */}
      <header className="sticky top-0 z-20 flex flex-col gap-3 border-b border-edge bg-panel/85 px-5 py-3 backdrop-blur-xl lg:hidden">
        <div className="flex items-center justify-between">
          <Brand />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <SignOutButton />
          </div>
        </div>
        <MobileNav />
        <WorkspaceSourcesCompact sources={sources} />
      </header>

      {/* Content fills all remaining width to the right of the sidebar */}
      <div className="lg:pl-64">
        <WorkspaceTopbar sources={sources} />
        {children}
      </div>
    </div>
  );
}
