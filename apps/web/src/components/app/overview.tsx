import type { ReactNode } from "react";

import {
  type AccountFact,
  type CampaignMeta,
  type EntityFact,
  type Recommendation,
  aggregateEntityFacts,
  campaignMetaById,
  deriveAction,
  formatMoney,
  netProfitBars,
  severityTone,
  summarizeAccountFacts,
} from "@/lib/dashboard";

import type { WorkspaceSources } from "@/lib/workspace";

import { EmptyState, Panel, PanelHeader, StatusTag } from "./cards";
import {
  AddProductCostsButton,
  ConnectGoogleButton,
  ConnectMerchantButton,
  DateRangePill,
  SearchField,
} from "./controls";
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

const connectedLabel = (
  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-profit">
    <Icon name="check" width={14} height={14} />
    Connected
  </span>
);

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
  sources,
  hasGoogleAdsConnection = false,
  hasMerchantConnection = false,
  hasProductCosts = false,
  setupCount = 0,
  recommendations = [],
  campaignRows = [],
  campaignMeta,
}: {
  currency?: string;
  facts?: AccountFact[];
  sources?: WorkspaceSources;
  hasGoogleAdsConnection?: boolean;
  hasMerchantConnection?: boolean;
  hasProductCosts?: boolean;
  setupCount?: number;
  recommendations?: Recommendation[];
  campaignRows?: ReturnType<typeof aggregateEntityFacts>;
  campaignMeta?: Map<string, CampaignMeta>;
}) {
  const adsSyncing = sources?.googleAds.syncState === "syncing";
  const adsReady = sources?.googleAds.syncState === "ready";
  const adsLabel = sources?.googleAds.label;
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

  const setupHeadline =
    summary.hasData
      ? "Live profit from your connected sources"
      : setupCount >= 3
        ? adsSyncing
          ? "Setup complete — first sync in progress"
          : "Setup complete — waiting for synced data"
        : hasGoogleAdsConnection
          ? adsSyncing
            ? "Google Ads connected — syncing your account"
            : adsReady
              ? "Google Ads connected"
              : "Google Ads is connected"
          : "Finish setup to see live profit";
  const setupSubline =
    summary.hasData
      ? "Numbers refresh on a daily schedule — no extra Google sign-in per page."
      : setupCount >= 3
        ? adsSyncing
          ? `${adsLabel ? `${adsLabel} · ` : ""}Browse freely while the import runs.`
          : "Campaign sync and profit recompute run on a schedule."
        : hasGoogleAdsConnection
          ? adsSyncing
            ? "Campaign data appears automatically when the import finishes."
            : "Next, connect Merchant Center and add product costs."
          : "Three quick steps. You can start with Google Ads now.";

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
              {!hasGoogleAdsConnection ? <ConnectGoogleButton /> : null}
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
                <p className="font-display text-base font-semibold">{setupHeadline}</p>
                <p className="text-sm text-muted">{setupSubline}</p>
              </div>
            </div>
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-edge bg-panel px-3 py-1.5 text-xs font-semibold text-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-amber" />
              {setupCount} of 3 connected
            </span>
          </div>
          <div className="grid gap-px bg-edge sm:grid-cols-3">
            {SETUP_STEPS.map((step) => {
              const isGoogleAdsStep = step.n === 1;
              const isMerchantStep = step.n === 2;
              const isCostsStep = step.n === 3;
              const isUnlocked =
                (isMerchantStep || isCostsStep) && hasGoogleAdsConnection;
              const isDone =
                (isGoogleAdsStep && hasGoogleAdsConnection) ||
                (isMerchantStep && hasMerchantConnection) ||
                (isCostsStep && hasProductCosts);

              return (
              <div key={step.n} className="bg-panel p-5">
                <div className="flex items-center gap-3">
                  <span
                    className={`grid h-7 w-7 place-items-center rounded-full text-sm font-semibold ${
                      isDone
                        ? "bg-profit text-on-profit"
                        : isUnlocked
                          ? "border border-profit/30 bg-profit/10 text-profit"
                          : "border border-edge bg-panel-2 text-faint"
                    }`}
                  >
                    {step.n}
                  </span>
                  <p className="font-medium text-fg">{step.title}</p>
                </div>
                <p className="mt-2.5 text-sm leading-6 text-muted">{step.desc}</p>
                <div className="mt-4">
                  {isDone ? (
                    connectedLabel
                  ) : isGoogleAdsStep && hasGoogleAdsConnection ? (
                    adsSyncing ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber">
                        <span className="relative flex h-2 w-2">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber/60 opacity-75" />
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-amber" />
                        </span>
                        Syncing
                      </span>
                    ) : (
                      connectedLabel
                    )
                  ) : isGoogleAdsStep ? (
                    <ConnectGoogleButton />
                  ) : isMerchantStep && isUnlocked ? (
                    <ConnectMerchantButton variant="secondary" />
                  ) : isCostsStep && isUnlocked ? (
                    <AddProductCostsButton />
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-faint">
                      <Icon name="chevronRight" width={14} height={14} />
                      Unlocks after Google Ads
                    </span>
                  )}
                </div>
              </div>
              );
            })}
          </div>
        </Panel>

        {/* KPI row */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((kpi) => (
            <KpiCard
              key={kpi.label}
              label={kpi.label}
              value={kpi.value}
              hint={kpi.hint}
              tone={kpi.tone}
              hasData={summary.hasData && kpi.value !== "—"}
            />
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
                      {hasGoogleAdsConnection
                        ? adsSyncing
                          ? "Your first sync is in progress"
                          : summary.hasData
                            ? "Daily net profit"
                            : "Your profit curve appears after the first sync"
                        : "Your profit curve appears after the first sync"}
                    </p>
                    <p className="text-sm leading-6 text-muted">
                      {hasGoogleAdsConnection
                        ? adsSyncing
                          ? "Google Ads is connected. Profit data will appear after campaigns sync."
                          : summary.hasData
                            ? "Connected workspace data — updated on the daily sync schedule."
                            : "Profit data is still processing from your connected account."
                        : "Connect Google Ads to chart net profit by day, with loss days flagged."}
                    </p>
                    {!hasGoogleAdsConnection ? <ConnectGoogleButton variant="secondary" /> : null}
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
                description={
                  hasGoogleAdsConnection
                    ? "Recommendations appear after the first Google Ads sync and profit recompute."
                    : "Once we can see profit, we rank what to stop, fix, or scale — each with an estimated weekly impact."
                }
                action={!hasGoogleAdsConnection ? <ConnectGoogleButton variant="secondary" /> : undefined}
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
          {campaignRows.length > 0 ? (
            <div className="divide-y divide-edge">
              {campaignRows.slice(0, 6).map((row) => {
                const m = campaignMeta?.get(row.entityId);
                const cur = row.currency ?? currency;
                return (
                  <div
                    key={row.entityId}
                    className="grid grid-cols-[2fr_1fr_0.7fr_1fr_auto] items-center gap-4 px-5 py-4"
                  >
                    <p className="truncate font-medium text-fg">
                      {m?.name ?? `Campaign ${row.entityId}`}
                    </p>
                    <p className={`text-right font-mono text-sm ${row.net < 0 ? "text-loss" : "text-profit"}`}>
                      {formatMoney(row.net, cur)}
                    </p>
                    <p className="text-right font-mono text-sm text-muted">
                      {row.poas != null ? `${row.poas.toFixed(2)}×` : "—"}
                    </p>
                    <p className="text-right font-mono text-sm text-muted">{formatMoney(row.spend, cur)}</p>
                    <div className="flex justify-end">
                      <StatusTag status={deriveAction(row)} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
          <EmptyState
            icon="campaigns"
            title={hasGoogleAdsConnection ? "No campaigns in this period" : "No campaigns yet"}
            description={
              hasGoogleAdsConnection
                ? adsSyncing
                  ? "Campaigns will appear after the first Google Ads sync."
                  : "Widen the date range or check the Campaigns page for synced data."
                : "Connect Google Ads to import campaigns and see per-campaign and per-product profit."
            }
            action={!hasGoogleAdsConnection ? <ConnectGoogleButton /> : undefined}
          >
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-faint">
              <span className="mr-1">Actions you&apos;ll see:</span>
              <StatusTag status="Scale" />
              <StatusTag status="Hold" />
              <StatusTag status="Cap" />
              <StatusTag status="Pause" />
            </div>
          </EmptyState>
          )}
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
  hasData,
}: {
  label: string;
  value: string;
  hint: string;
  tone: "profit" | "loss" | "neutral";
  hasData: boolean;
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
        {!hasData ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-edge bg-panel-2 px-2 py-0.5 text-[11px] font-medium text-faint">
            Awaiting data
          </span>
        ) : null}
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
