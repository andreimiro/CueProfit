import { MeasurementPage } from "@/components/app/measurement-page";
import { Panel, PanelHeader } from "@/components/app/cards";
import { formatMoney } from "@/lib/dashboard";
import { loadDashboardWorkspace } from "@/lib/dashboard-workspace";
import {
  loadAttributionData,
  metricValue,
  num,
  pct,
  periodLabel,
} from "@/lib/measurement";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AttributionPage() {
  const { workspaceId, currency } = await loadDashboardWorkspace();
  const supabase = await createClient();
  const data = await loadAttributionData(supabase, workspaceId);
  const run = data.run;
  const rowCurrency = data.rows[0]?.currency ?? currency;
  const matchedRevenue = metricValue(run, "matched_revenue_rate");
  const avgTouches = metricValue(run, "avg_touchpoints");
  const assistedProfit =
    metricValue(run, "assisted_profit") ??
    data.rows.reduce((sum, row) => sum + num(row.assisted_profit), 0);
  const unmatched = matchedRevenue == null ? null : 1 - num(matchedRevenue);

  return (
    <MeasurementPage
      title="Multi-Touch Attribution"
      subtitle="Trace the path from ad click to order and assign credit across touchpoints."
      eyebrow="Journey model"
      icon="link"
      status={{
        label: data.error ? "Schema missing" : run?.status === "ready" ? "Ready" : "Needs data",
        detail: data.error
          ? `The attribution tables are not queryable yet: ${data.error}`
          : run
            ? `Latest attribution run covers ${periodLabel(run)}.`
            : "Connect Google Ads, capture onsite sessions and import orders before attribution can calculate live credit.",
        tone: data.error ? "error" : run?.status === "ready" ? "ready" : "pending",
      }}
      metrics={[
        {
          label: "Matched revenue",
          value: matchedRevenue == null ? "—" : pct(matchedRevenue),
          hint: "Orders tied back to at least one paid touch.",
          tone: "profit",
        },
        {
          label: "Avg touches",
          value: avgTouches == null ? "—" : num(avgTouches).toFixed(1),
          hint: "Paid and onsite steps before purchase.",
        },
        {
          label: "Assisted profit",
          value: run ? formatMoney(num(assistedProfit), rowCurrency) : "—",
          hint: "Profit influenced before the final click.",
          tone: "profit",
        },
        {
          label: "Unmatched orders",
          value: unmatched == null ? "—" : pct(unmatched),
          hint: "Needs click IDs, UTMs or event identity.",
          tone: "amber",
        },
      ]}
      requirements={[
        {
          title: "Google Ads data",
          items: [
            "Campaign, ad group, ad, keyword, asset and product IDs",
            "Daily clicks, impressions, cost, conversions and conversion value",
            "Conversion actions, categories, status and primary goal flags",
            "Segments by date, device, network and product item ID",
            "Search terms and keyword match type for query-level paths",
            "Customer timezone and currency for correct journey windows",
          ],
        },
        {
          title: "First-party data",
          items: [
            "Website sessions, landing pages, UTMs and referrers",
            "Click identifiers such as GCLID, GBRAID and WBRAID when available",
            "Orders, revenue, gross margin, COGS, shipping, fees and returns",
            "User, customer or anonymous visitor IDs across sessions",
            "Event timestamps for view, click, cart, checkout and purchase",
            "Consent state so attribution respects tracking permissions",
          ],
        },
      ]}
      outputs={[
        {
          title: "Channel and campaign credit",
          description: "Show first-touch, last-touch, linear and data-driven-style credit side by side.",
          icon: "overview",
        },
        {
          title: "Assisted profit",
          description: "Reveal campaigns that start or assist profitable journeys but rarely close them.",
          icon: "trendUp",
        },
        {
          title: "Path explorer",
          description: "Display the common sequence of touchpoints before high-margin and low-margin orders.",
          icon: "link",
        },
        {
          title: "Tracking gaps",
          description: "Flag missing UTMs, missing click IDs and orders that cannot be attributed.",
          icon: "alert",
        },
      ]}
      timeline={[
        {
          label: "Collect touchpoints",
          value: "Ads + onsite",
          detail: "Sync Google Ads clicks/performance and capture session-level source data in the webapp.",
        },
        {
          label: "Match orders",
          value: "Identity",
          detail: "Join orders to users, sessions, click IDs and campaign metadata inside the warehouse.",
        },
        {
          label: "Assign credit",
          value: "Model",
          detail: "Calculate first-touch, last-touch, linear and margin-weighted assisted credit.",
        },
        {
          label: "Explain confidence",
          value: "QA",
          detail: "Show match rate, missing data and the share of revenue excluded from the model.",
        },
      ]}
    >
      <Panel>
        <PanelHeader
          title="Top attributed profit"
          hint={data.rows.length ? "Latest modeled entities by attributed profit" : "No attribution model output stored yet"}
        />
        {data.rows.length ? (
          <div className="overflow-x-auto">
            <div className="min-w-[720px] divide-y divide-edge">
              {data.rows.map((row) => (
                <div
                  key={`${row.dimension}:${row.entity_id}`}
                  className="grid grid-cols-[1.6fr_0.8fr_0.9fr_1fr_1fr] items-center gap-4 px-5 py-4 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-fg">{row.entity_name ?? row.entity_id}</p>
                    <p className="mt-0.5 text-xs uppercase tracking-wide text-faint">{row.dimension}</p>
                  </div>
                  <p className="text-right font-mono text-muted nums">{Number(row.touchpoints).toLocaleString()}</p>
                  <p className="text-right font-mono text-muted nums">{num(row.conversions).toFixed(1)}</p>
                  <p className="text-right font-mono text-profit nums">
                    {formatMoney(num(row.attributed_profit), row.currency ?? currency)}
                  </p>
                  <p className="text-right font-mono text-muted nums">
                    {row.match_rate == null ? "—" : pct(row.match_rate)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="px-5 py-8 text-sm leading-6 text-muted">
            This table will show campaigns, products or keywords once a worker writes
            `attribution_results` for the latest attribution run.
          </p>
        )}
      </Panel>
    </MeasurementPage>
  );
}
