import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

const KPIS = [
  { label: "Net profit", hint: "after product cost, returns & ad spend" },
  { label: "POAS", hint: "gross profit per ad spend" },
  { label: "Wasted spend", hint: "spend with no/negative return" },
  { label: "Projected incremental profit", hint: "modeled, with confidence" },
  { label: "Tracking health", hint: "conversion/measurement integrity" },
  { label: "Feed health", hint: "Merchant Center product issues" },
] as const;

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: memberships } = await supabase
    .from("workspace_members")
    .select("role, workspaces(name, currency)");

  const workspaceName =
    (memberships?.[0]?.workspaces as { name?: string } | null)?.name ??
    "No workspace yet";

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Command Center</h1>
          <p className="text-sm text-neutral-400">
            {workspaceName} · signed in as {user.email}
          </p>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {KPIS.map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-5"
          >
            <p className="text-sm text-neutral-400">{kpi.label}</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums">—</p>
            <p className="mt-1 text-xs text-neutral-500">{kpi.hint}</p>
          </div>
        ))}
      </section>

      <p className="mt-8 text-sm text-neutral-500">
        Connect Google Ads and Merchant Center to populate these metrics. (Wiring
        lands in Milestone 1.)
      </p>
    </main>
  );
}
