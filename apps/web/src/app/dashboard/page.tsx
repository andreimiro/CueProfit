import Link from "next/link";
import { redirect } from "next/navigation";

import { GoogleGlyph } from "@/components/google-glyph";
import { SignOutButton } from "@/components/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { createClient } from "@/lib/supabase/server";

const KPIS = [
  { k: "NET PROFIT", hint: "after product cost, returns & ad spend" },
  { k: "POAS", hint: "gross profit per unit of ad spend" },
  { k: "WASTED SPEND", hint: "spend with no / negative return" },
  { k: "PROJECTED INCREMENTAL PROFIT", hint: "modeled, with confidence" },
  { k: "TRACKING HEALTH", hint: "conversion & measurement integrity" },
  { k: "FEED HEALTH", hint: "Merchant Center product issues" },
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
    (memberships?.[0]?.workspaces as { name?: string } | null)?.name ?? "No workspace yet";

  return (
    <main className="relative min-h-screen overflow-x-clip">
      <div className="pointer-events-none absolute inset-0 bg-ambient" aria-hidden />
      <div className="pointer-events-none absolute inset-0 grain" aria-hidden />

      {/* top bar */}
      <header className="relative border-b border-edge">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid h-7 w-7 place-items-center rounded-md border border-profit/40 bg-profit/10">
              <span className="h-2.5 w-2.5 rounded-full bg-profit shadow-[0_0_12px_2px] shadow-profit/60" />
            </span>
            <span className="font-display text-[15px] font-extrabold tracking-tight">
              Cue<span className="text-profit">Profit</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden rounded-lg border border-edge bg-panel px-3 py-1.5 font-mono text-xs text-muted sm:block">
              {workspaceName}
            </span>
            <ThemeToggle />
            <SignOutButton />
          </div>
        </div>
      </header>

      <div className="relative mx-auto max-w-6xl px-6 py-10">
        {/* title row */}
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Command Center</h1>
            <p className="mt-1 font-mono text-xs text-muted">{user.email}</p>
          </div>
          <Link
            href="#connect"
            className="flex items-center gap-2 rounded-lg bg-profit px-4 py-2.5 text-sm font-semibold text-on-profit shadow-lg shadow-profit/30 transition hover:bg-profit-strong"
          >
            <GoogleGlyph size={15} />
            Connect Google Ads
          </Link>
        </div>

        {/* connect prompt */}
        <div
          id="connect"
          className="mb-8 flex flex-col gap-4 rounded-2xl border border-profit/30 bg-profit/5 p-5 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p className="font-mono text-[11px] uppercase tracking-wider text-profit">get started</p>
            <p className="mt-1.5 text-sm text-muted">
              Connect Google Ads &amp; Merchant Center and upload product costs to populate
              these metrics. <span className="text-faint">(Sync wiring lands in Milestone 1.)</span>
            </p>
          </div>
          <Link
            href="#connect"
            className="shrink-0 rounded-lg border border-profit/40 bg-profit/10 px-4 py-2 text-sm font-semibold text-profit transition hover:bg-profit/20"
          >
            Connect a data source
          </Link>
        </div>

        {/* KPI grid */}
        <section className="grid gap-px overflow-hidden rounded-2xl border border-edge bg-edge sm:grid-cols-2 lg:grid-cols-3">
          {KPIS.map((kpi, i) => (
            <div key={kpi.k} className="bg-panel p-6">
              <div className="mb-4 flex items-center justify-between font-mono text-[11px] text-faint">
                <span className="uppercase tracking-wider text-muted">{kpi.k}</span>
                <span>{String(i + 1).padStart(2, "0")}</span>
              </div>
              <p className="font-display text-3xl font-bold tabular-nums text-fg">—</p>
              <p className="mt-2 text-xs text-faint">{kpi.hint}</p>
            </div>
          ))}
        </section>

        <p className="mt-8 font-mono text-xs text-faint">
          ./awaiting first sync — connect an account to see live numbers
        </p>
      </div>
    </main>
  );
}
