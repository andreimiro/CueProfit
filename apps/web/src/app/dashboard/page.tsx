import Link from "next/link";
import { redirect } from "next/navigation";

import { GoogleGlyph } from "@/components/google-glyph";
import { SignOutButton } from "@/components/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { createClient } from "@/lib/supabase/server";

const KPIS = [
<<<<<<< ours
  { k: "Net profit", v: "--", hint: "after costs, returns, and ad spend", tone: "neutral" },
  { k: "POAS", v: "--", hint: "gross profit per unit of ad spend", tone: "neutral" },
  { k: "Wasted spend", v: "--", hint: "spend with no or negative return", tone: "loss" },
  { k: "Incremental profit", v: "--", hint: "modeled with confidence", tone: "profit" },
] as const;

const PRODUCTS = [
  ["Connect Google Ads", "Waiting", "--", "Primary source"],
  ["Merchant Center", "Waiting", "--", "Feed diagnostics"],
  ["Product costs", "Missing", "--", "Margin model"],
] as const;

const bars = [40, 58, 45, 62, 74, 52, 82, 70, 88, 76, 94, 84];

=======
  { k: "NET PROFIT", hint: "after product cost, returns & ad spend" },
  { k: "POAS", hint: "gross profit per unit of ad spend" },
  { k: "WASTED SPEND", hint: "spend with no / negative return" },
  { k: "PROJECTED INCREMENTAL PROFIT", hint: "modeled, with confidence" },
  { k: "TRACKING HEALTH", hint: "conversion & measurement integrity" },
  { k: "FEED HEALTH", hint: "Merchant Center product issues" },
] as const;

>>>>>>> theirs
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
<<<<<<< ours
    <main className="relative min-h-screen overflow-x-clip bg-canvas">
      <div className="pointer-events-none absolute inset-0 bg-paper-grid" aria-hidden />
      <div className="pointer-events-none absolute inset-0 grain" aria-hidden />

      <header className="relative border-b border-edge bg-panel/75 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid h-8 w-8 place-items-center rounded-[8px] border border-edge bg-fg text-canvas">
              <span className="h-2.5 w-2.5 rounded-full bg-profit" />
            </span>
            <span className="font-display text-base font-semibold">
              Cue<span className="text-profit">Profit</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="hidden rounded-[8px] border border-edge bg-canvas px-3 py-2 font-mono text-xs text-muted sm:block">
=======
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
>>>>>>> theirs
              {workspaceName}
            </span>
            <ThemeToggle />
            <SignOutButton />
          </div>
        </div>
      </header>

<<<<<<< ours
      <div className="relative mx-auto grid max-w-7xl gap-6 px-5 py-6 sm:px-8 lg:grid-cols-[220px_1fr]">
        <aside className="hidden rounded-[8px] border border-edge bg-panel p-3 lg:block">
          {["Overview", "Campaigns", "Products", "Feed health", "Recommendations"].map((item, index) => (
            <div
              key={item}
              className={`mb-1 rounded-[8px] px-3 py-2.5 text-sm ${index === 0 ? "bg-fg text-canvas" : "text-muted hover:bg-panel-2"}`}
            >
              {item}
            </div>
          ))}
          <div className="mt-10 rounded-[8px] border border-edge bg-canvas p-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-profit">Setup</p>
            <p className="mt-3 text-sm leading-6 text-muted">
              Connect data sources to replace placeholders with live profit data.
            </p>
          </div>
        </aside>

        <section>
          <div className="mb-6 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-profit">Command center</p>
              <h1 className="mt-3 text-4xl font-semibold sm:text-6xl">Profit workspace</h1>
              <p className="mt-3 font-mono text-xs text-faint">{user.email}</p>
            </div>
            <Link
              href="/api/connect/google/start"
              className="inline-flex w-fit items-center gap-2 rounded-[8px] bg-profit px-5 py-3 text-sm font-semibold text-on-profit shadow-[0_18px_35px_-22px_var(--color-profit)] transition hover:bg-profit-strong"
            >
              <GoogleGlyph size={15} />
              Connect Google Ads
            </Link>
          </div>

          <div className="mb-6 rounded-[8px] border border-profit/35 bg-profit/8 p-5">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-profit">First sync</p>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                  Connect Google Ads and Merchant Center, then add product costs to
                  populate profit, waste, feed, and tracking health metrics.
                </p>
              </div>
              <Link
                href="/api/connect/google/start"
                className="shrink-0 rounded-[8px] border border-profit/45 bg-panel px-4 py-2.5 text-sm font-semibold text-profit transition hover:bg-profit/10"
              >
                Connect source
              </Link>
            </div>
          </div>

          <div className="grid gap-px overflow-hidden rounded-[8px] border border-edge bg-edge md:grid-cols-2 xl:grid-cols-4">
            {KPIS.map((kpi, index) => (
              <article key={kpi.k} className="min-h-52 bg-panel p-5">
                <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.16em] text-faint">
                  <span>{kpi.k}</span>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                </div>
                <p className={`mt-14 font-mono text-4xl font-semibold nums ${kpi.tone === "loss" ? "text-loss" : kpi.tone === "profit" ? "text-profit" : "text-fg"}`}>
                  {kpi.v}
                </p>
                <p className="mt-3 text-sm leading-6 text-muted">{kpi.hint}</p>
              </article>
            ))}
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-[8px] border border-edge bg-panel p-5">
              <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted">Daily net profit</p>
                  <h2 className="mt-2 text-2xl font-semibold">Awaiting first sync</h2>
                </div>
                <span className="rounded-full border border-edge bg-canvas px-3 py-1 font-mono text-xs text-faint">
                  last 7 days
                </span>
              </div>
              <div className="flex h-72 items-end gap-2 rounded-[8px] border border-edge bg-canvas p-4">
                {bars.map((bar, index) => (
                  <span
                    key={index}
                    className={`flex-1 rounded-t-[5px] ${index === 2 || index === 5 ? "bg-loss/60" : "bg-profit/70"}`}
                    style={{ height: `${bar}%` }}
                  />
                ))}
              </div>
            </div>

            <div className="overflow-hidden rounded-[8px] border border-edge bg-panel">
              <div className="border-b border-edge p-5">
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted">Data readiness</p>
                <h2 className="mt-2 text-2xl font-semibold">Sources</h2>
              </div>
              {PRODUCTS.map(([name, status, value, note]) => (
                <div key={name} className="grid grid-cols-[1fr_auto] gap-4 border-b border-edge p-5 last:border-b-0">
                  <div>
                    <p className="font-medium text-fg">{name}</p>
                    <p className="mt-1 text-sm text-muted">{note}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm text-fg">{value}</p>
                    <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.14em] text-faint">{status}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
=======
      <div className="relative mx-auto max-w-6xl px-6 py-10">
        {/* title row */}
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Command Center</h1>
            <p className="mt-1 font-mono text-xs text-muted">{user.email}</p>
          </div>
          <Link
            href="/api/connect/google/start"
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
            href="/api/connect/google/start"
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
>>>>>>> theirs
      </div>
    </main>
  );
}
