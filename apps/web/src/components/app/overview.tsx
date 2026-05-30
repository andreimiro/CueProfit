import type { ReactNode } from "react";

import {
  type AccountFact,
  type Recommendation,
  formatMoney,
  netProfitBars,
  severityTone,
  summarizeAccountFacts,
} from "@/lib/dashboard";

import { EmptyState, Panel, PanelHeader, StatusTag } from "./cards";
import { ConnectGoogleButton, DateRangePill, SearchField } from "./controls";
import { Icon } from "./icons";
import { PageHeader } from "./page-header";

const SETUP_STEPS = [
  {
    n: 1,
    title: "Connect Google Ads",
    desc: "Import campaigns, spend and conversions — your primary profit source.",
    now: true,
  },
  {
    n: 2,
    title: "Connect Merchant Center",
    desc: "Pull the product feed and catch diagnostics before spend drifts.",
    now: false,
  },
  {
    n: 3,
    title: "Add product costs",
    desc: "Set COGS, shipping and fees so every profit number is exact.",
    now: false,
  },
] as const;

const SKELETON_BARS = [42, 56, 49, 64, 58, 72, 60, 80, 74, 88, 70, 84];

const TONE_TEXT: Record<string, string> = {
  loss: "text-loss",
  profit: "text-profit",
  fg: "text-fg",
  muted: "text-muted",
};

export function Overview({
  currency = "RON",
  facts = [],
  recommendations = [],
}: {
  currency?: string;
  facts?: AccountFact[];
  recommendations?: Recommendation[];
}) {
  const summary = summarizeAccountFacts(facts, currency);
  const bars = netProfitBars(facts);
  const kpis = [
    {
      label: "Net profit",
      value: summary.hasData ? formatMoney(summary.net, summary.currency) : "—",
      hint: "After COGS, fees, returns and ad spend.",
      tone: summary.hasData ? (summary.net < 0 ? "loss" : "profit") : "neutral",
    },
    {
      label: "POAS",
      value: summary.poas != null ? `${summary.poas.toFixed(2)}×` : "—",
      hint: "Gross profit per unit of ad spend.",
      tone: "neutral",
    },
    {
      label: "Wasted spend",
      value: summary.hasData ? formatMoney(summary.waste, summary.currency) : "—",
      hint: "Spend with no or negative return.",
      tone: "loss",
    },
    {
      label: "Incremental profit",
      value: "—",
      hint: "Modeled, with a confidence band.",
      tone: "neutral",
    },
  ] as const;

  return (
    <div className="px-5 py-6 sm:px-8 lg:px-10 lg:py-8">
      <div className="mx-auto w-full max-w-[1760px] animate-reveal space-y-7">
        <PageHeader
          title="Overview"
          subtitle={`Profit across all connected sources · ${currency}`}
          actions={
            <>
              <SearchField />
              <DateRangePill />
              <ConnectGoogleButton />
            </>
          }
        />

        {/* Setup flow — the clearest path to value */}
        <Panel className="overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-edge bg-profit/[0.06] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-profit/15 text-profit">
                <Icon name="spark" width={20} height={20} />
              </span>
              <div>
                <p className="font-display text-base font-semibold">Finish setup to see live profit</p>
                <p className="text-sm text-muted">Three quick steps. You can start with Google Ads now.</p>
              </div>
            </div>
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-edge bg-panel px-3 py-1.5 text-xs font-semibold text-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-amber" />
              {summary.hasData ? "Live data connected" : "0 of 3 connected"}
            </span>
          </div>
          <div className="grid gap-px bg-edge sm:grid-cols-3">
            {SETUP_STEPS.map((step) => (
              <div key={step.n} className="bg-panel p-5">
                <div className="flex items-center gap-3">
                  <span
                    className={`grid h-7 w-7 place-items-center rounded-full text-sm font-semibold ${
                      step.now
                        ? "bg-profit text-on-profit"
                        : "border border-edge bg-panel-2 text-faint"
                    }`}
                  >
                    {step.n}
                  </span>
                  <p className="font-medium text-fg">{step.title}</p>
                </div>
                <p className="mt-2.5 text-sm leading-6 text-muted">{step.desc}</p>
                <div className="mt-4">
                  {step.now ? (
                    <ConnectGoogleButton />
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-faint">
                      <Icon name="chevronRight" width={14} height={14} />
                      Unlocks after Google Ads
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Panel>

        {/* KPI row */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((kpi) => (
            <KpiCard key={kpi.label} label={kpi.label} value={kpi.value} hint={kpi.hint} tone={kpi.tone} />
          ))}
        </div>

        {/* Chart + recommendations */}
        <div className="grid gap-5 xl:grid-cols-[1.55fr_1fr]">
          <Panel>
            <PanelHeader
              title="Daily net profit"
              hint={summary.hasData ? formatMoney(summary.net, summary.currency) : "Spend-weighted contribution by day"}
              action={<DateRangePill />}
            />
            <div className="relative p-5">
              <div className="flex h-64 items-end gap-2 rounded-xl border border-edge bg-canvas/60 p-4">
                {(summary.hasData ? bars : SKELETON_BARS.map((height, index) => ({ date: String(index), net: 0, height, loss: false }))).map((bar) => (
                  <span
                    key={bar.date}
                    title={summary.hasData ? `${bar.date}: ${formatMoney(bar.net, summary.currency)}` : undefined}
                    className={`flex-1 rounded-t ${summary.hasData ? (bar.loss ? "bg-loss/60" : "bg-profit/70") : "bg-edge"}`}
                    style={{ height: `${bar.height}%`, opacity: summary.hasData ? 1 : 0.5 }}
                  />
                ))}
              </div>
              {!summary.hasData ? (
                <div className="absolute inset-0 flex items-center justify-center p-5">
                  <div className="flex max-w-xs flex-col items-center gap-3 rounded-2xl border border-edge bg-panel/90 px-6 py-5 text-center shadow-design backdrop-blur">
                    <span className="grid h-11 w-11 place-items-center rounded-2xl border border-edge bg-panel-2 text-faint">
                      <Icon name="trendUp" width={22} height={22} />
                    </span>
                    <p className="font-display text-base font-semibold">
                      Your profit curve appears after the first sync
                    </p>
                    <p className="text-sm leading-6 text-muted">
                      Connect Google Ads to chart net profit by day, with loss days flagged.
                    </p>
                    <ConnectGoogleButton variant="secondary" />
                  </div>
                </div>
              ) : null}
            </div>
          </Panel>

          <Panel className="flex flex-col">
            <PanelHeader title="Recommended next actions" hint="Ranked by profit impact" />
            {recommendations.length > 0 ? (
              <div className="divide-y divide-edge">
                {recommendations.map((rec) => (
                  <div key={`${rec.kind}-${rec.entity_type}-${rec.entity_id}`} className="grid grid-cols-[1fr_auto] gap-4 p-5">
                    <div>
                      <p className="font-medium text-fg">{rec.title}</p>
                      <p className="mt-1 text-xs uppercase tracking-wide text-faint">
                        {rec.kind.replace(/_/g, " ")} · {rec.entity_type}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`font-mono text-sm ${TONE_TEXT[severityTone(rec.severity)] ?? "text-fg"}`}>
                        {rec.expected_impact != null
                          ? formatMoney(Number(rec.expected_impact), rec.impact_currency)
                          : "—"}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-wide text-faint">{rec.severity}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon="recommendations"
                title="No recommendations yet"
                description="Once we can see profit, we rank what to stop, fix, or scale — each with an estimated weekly impact."
                action={<ConnectGoogleButton variant="secondary" />}
              />
            )}
          </Panel>
        </div>

        {/* Campaigns & products table */}
        <Panel className="overflow-hidden">
          <PanelHeader
            title="Campaigns & products"
            hint="Per-source profit, POAS and the action to take"
            action={<SearchField />}
          />
          <div className="hidden grid-cols-[2fr_1fr_0.7fr_1fr_auto] gap-4 border-b border-edge px-5 py-3 text-xs font-semibold uppercase tracking-wide text-faint sm:grid">
            <span>Source / campaign</span>
            <span className="text-right">Net profit</span>
            <span className="text-right">POAS</span>
            <span className="text-right">Spend</span>
            <span className="text-right">Action</span>
          </div>
          <EmptyState
            icon="campaigns"
            title="No campaigns yet"
            description="Connect Google Ads to import campaigns and see per-campaign and per-product profit."
            action={<ConnectGoogleButton />}
          >
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-faint">
              <span className="mr-1">Actions you&apos;ll see:</span>
              <StatusTag status="Scale" />
              <StatusTag status="Hold" />
              <StatusTag status="Cap" />
              <StatusTag status="Pause" />
            </div>
          </EmptyState>
        </Panel>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  tone: "profit" | "loss" | "neutral";
}): ReactNode {
  const dot =
    tone === "loss" ? "bg-loss" : tone === "profit" ? "bg-profit" : "bg-faint";
  return (
    <Panel className="p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-medium text-muted">
          <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
          {label}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-edge bg-panel-2 px-2 py-0.5 text-[11px] font-medium text-faint">
          Awaiting data
        </span>
      </div>
      <p className={`mt-6 font-mono text-4xl font-semibold nums ${value === "—" ? "text-faint" : TONE_TEXT[tone] ?? "text-fg"}`}>{value}</p>
      <svg
        className="mt-4 w-full text-edge"
        height="22"
        viewBox="0 0 200 22"
        fill="none"
        preserveAspectRatio="none"
        aria-hidden
      >
        <line x1="0" y1="11" x2="200" y2="11" stroke="currentColor" strokeWidth="1" strokeDasharray="3 6" />
      </svg>
      <p className="mt-3 text-sm leading-6 text-muted">{hint}</p>
    </Panel>
  );
}
