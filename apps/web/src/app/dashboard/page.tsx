import Link from "next/link";
import { redirect } from "next/navigation";

import { GoogleGlyph } from "@/components/google-glyph";
import { SignOutButton } from "@/components/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  type AccountFact,
  type Recommendation,
  formatMoney,
  netProfitBars,
  severityTone,
  summarizeAccountFacts,
} from "@/lib/dashboard";
import { createClient } from "@/lib/supabase/server";

const TONE_TEXT: Record<string, string> = {
  loss: "text-loss",
  profit: "text-profit",
  fg: "text-fg",
  muted: "text-muted",
};

const PRODUCTS = [
  ["Connect Google Ads", "Waiting", "--", "Primary source"],
  ["Merchant Center", "Waiting", "--", "Feed diagnostics"],
  ["Product costs", "Missing", "--", "Margin model"],
] as const;

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: memberships } = await supabase
    .from("workspace_members")
    .select("workspace_id, role, workspaces(name, currency)");

  const membership = memberships?.[0];
  const workspaceId = membership?.workspace_id as string | undefined;
  const workspace = membership?.workspaces as { name?: string; currency?: string } | null;
  const workspaceName = workspace?.name ?? "No workspace yet";

  let facts: AccountFact[] = [];
  let recommendations: Recommendation[] = [];
  if (workspaceId) {
    const since = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
    const [factsRes, recsRes] = await Promise.all([
      supabase
        .from("profit_daily_facts")
        .select("date,spend,revenue,gross_profit_before_ads,net_profit,waste_amount,currency")
        .eq("workspace_id", workspaceId)
        .eq("entity_type", "account")
        .gte("date", since)
        .order("date", { ascending: true }),
      supabase
        .from("recommendations")
        .select("kind,entity_type,entity_id,title,severity,expected_impact,impact_currency,confidence")
        .eq("workspace_id", workspaceId)
        .eq("status", "open")
        .order("expected_impact", { ascending: false, nullsFirst: false })
        .limit(6),
    ]);
    facts = (factsRes.data ?? []) as AccountFact[];
    recommendations = (recsRes.data ?? []) as Recommendation[];
  }

  const s = summarizeAccountFacts(facts, workspace?.currency ?? null);
  const bars = netProfitBars(facts);

  const kpis = [
    {
      k: "Net profit",
      v: s.hasData ? formatMoney(s.net, s.currency) : "--",
      hint: "after costs, returns, and ad spend",
      tone: s.hasData ? (s.net < 0 ? "loss" : "profit") : "muted",
    },
    {
      k: "POAS",
      v: s.poas != null ? `${s.poas.toFixed(2)}×` : "--",
      hint: "gross profit per unit of ad spend",
      tone: "fg",
    },
    {
      k: "Wasted spend",
      v: s.hasData ? formatMoney(s.waste, s.currency) : "--",
      hint: "spend with no or negative return",
      tone: "loss",
    },
    {
      k: "Incremental profit",
      v: "--",
      hint: "projected — modeling pending",
      tone: "muted",
    },
  ];

  return (
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
              {workspaceName}
            </span>
            <ThemeToggle />
            <SignOutButton />
          </div>
        </div>
      </header>

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
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-profit">
              {s.hasData ? "Live" : "Setup"}
            </p>
            <p className="mt-3 text-sm leading-6 text-muted">
              {s.hasData
                ? `${bars.length} days of profit data across ${formatMoney(s.spend, s.currency)} spend.`
                : "Connect data sources to replace placeholders with live profit data."}
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

          {!s.hasData && (
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
          )}

          <div className="grid gap-px overflow-hidden rounded-[8px] border border-edge bg-edge md:grid-cols-2 xl:grid-cols-4">
            {kpis.map((kpi, index) => (
              <article key={kpi.k} className="min-h-52 bg-panel p-5">
                <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.16em] text-faint">
                  <span>{kpi.k}</span>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                </div>
                <p className={`mt-14 font-mono text-4xl font-semibold nums ${TONE_TEXT[kpi.tone] ?? "text-fg"}`}>
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
                  <h2 className="mt-2 text-2xl font-semibold">
                    {s.hasData ? formatMoney(s.net, s.currency) : "Awaiting first sync"}
                  </h2>
                </div>
                <span className="rounded-full border border-edge bg-canvas px-3 py-1 font-mono text-xs text-faint">
                  last 30 days
                </span>
              </div>
              {s.hasData ? (
                <div className="flex h-72 items-end gap-1 rounded-[8px] border border-edge bg-canvas p-4">
                  {bars.map((bar) => (
                    <span
                      key={bar.date}
                      title={`${bar.date}: ${formatMoney(bar.net, s.currency)}`}
                      className={`flex-1 rounded-t-[4px] ${bar.loss ? "bg-loss/60" : "bg-profit/70"}`}
                      style={{ height: `${bar.height}%` }}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex h-72 items-center justify-center rounded-[8px] border border-dashed border-edge bg-canvas p-4 text-sm text-muted">
                  Net profit by day appears here after the first sync + recompute.
                </div>
              )}
            </div>

            <div className="overflow-hidden rounded-[8px] border border-edge bg-panel">
              {recommendations.length > 0 ? (
                <>
                  <div className="border-b border-edge p-5">
                    <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted">Act on profit</p>
                    <h2 className="mt-2 text-2xl font-semibold">Recommendations</h2>
                  </div>
                  {recommendations.map((rec) => (
                    <div
                      key={`${rec.kind}-${rec.entity_type}-${rec.entity_id}`}
                      className="grid grid-cols-[1fr_auto] gap-4 border-b border-edge p-5 last:border-b-0"
                    >
                      <div>
                        <p className="font-medium text-fg">{rec.title}</p>
                        <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.14em] text-faint">
                          {rec.kind.replace(/_/g, " ")} · {rec.entity_type}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`font-mono text-sm ${TONE_TEXT[severityTone(rec.severity)] ?? "text-fg"}`}>
                          {rec.expected_impact != null
                            ? formatMoney(Number(rec.expected_impact), rec.impact_currency)
                            : "—"}
                        </p>
                        <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.14em] text-faint">
                          {rec.severity}
                        </p>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <>
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
                </>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
