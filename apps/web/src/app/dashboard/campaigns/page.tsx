import { Panel, PanelHeader, StatusTag } from "@/components/app/cards";
import { DataSourceEmpty, GoogleAdsHeaderAction } from "@/components/app/data-source-empty";
import { DateRangePicker } from "@/components/app/date-range-picker";
import { PageHeader } from "@/components/app/page-header";
import { SearchField } from "@/components/app/search-field";
import {
  type CampaignMeta,
  type EntityFact,
  aggregateEntityFacts,
  campaignMetaById,
  deriveAction,
  formatMoney,
} from "@/lib/dashboard";
import { loadDashboardWorkspace } from "@/lib/dashboard-workspace";
import { fuzzyMatch, rangeDaysFromParam } from "@/lib/fuzzy";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const COLS = "grid-cols-[2.2fr_1fr_0.7fr_1fr_1fr_0.8fr]";

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const range = typeof sp.range === "string" ? sp.range : undefined;
  const q = typeof sp.q === "string" ? sp.q : undefined;
  const days = rangeDaysFromParam(range, 30);
  const query = (q ?? "").trim();

  const { workspaceId, currency, sources } = await loadDashboardWorkspace();
  const supabase = await createClient();

  let allRows: ReturnType<typeof aggregateEntityFacts> = [];
  let meta = new Map<string, CampaignMeta>();
  if (workspaceId) {
    const since = new Date(Date.now() - days * 864e5).toISOString().slice(0, 10);
    const [factsRes, statsRes] = await Promise.all([
      supabase
        .from("profit_daily_facts")
        .select("entity_id,spend,revenue,gross_profit_before_ads,net_profit,waste_amount,poas,break_even_roas,currency")
        .eq("workspace_id", workspaceId)
        .eq("entity_type", "campaign")
        .gte("date", since),
      supabase
        .from("campaign_daily_stats")
        .select("campaign_id,campaign_name,campaign_type,status")
        .eq("workspace_id", workspaceId)
        .gte("date", since),
    ]);
    allRows = aggregateEntityFacts((factsRes.data ?? []) as EntityFact[]);
    meta = campaignMetaById(statsRes.data ?? []);
  }

  const rows = query
    ? allRows.filter((r) => fuzzyMatch(query, meta.get(r.entityId)?.name ?? `Campaign ${r.entityId}`))
    : allRows;

  return (
    <div className="px-5 py-6 sm:px-8 lg:px-10 lg:py-8">
      <div className="mx-auto w-full max-w-[1760px] animate-reveal space-y-7">
        <PageHeader
          title="Campaigns"
          subtitle={`True profit, POAS and the next action for every campaign · ${currency}`}
          actions={
            <>
              <SearchField placeholder="Search campaigns…" />
              <DateRangePicker />
              <GoogleAdsHeaderAction sources={sources} />
            </>
          }
        />
        <Panel className="overflow-hidden">
          <PanelHeader
            title="Campaigns by net profit"
            hint={query ? `Matches for “${query}”` : `Worst performers first · last ${days} days`}
          />
          {allRows.length === 0 ? (
            <DataSourceEmpty sources={sources} source="google_ads" icon="campaigns" />
          ) : rows.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-muted">
              No campaigns match “{query}”.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[760px]">
                <div className={`grid ${COLS} gap-4 border-b border-edge px-5 py-3 text-xs font-semibold uppercase tracking-wide text-faint`}>
                  <span>Campaign</span>
                  <span className="text-right">Net profit</span>
                  <span className="text-right">POAS</span>
                  <span className="text-right">Break-even ROAS</span>
                  <span className="text-right">Spend</span>
                  <span className="text-right">Action</span>
                </div>
                <div className="divide-y divide-edge">
                  {rows.map((row) => {
                    const m = meta.get(row.entityId);
                    const cur = row.currency ?? currency;
                    return (
                      <div key={row.entityId} className={`grid ${COLS} items-center gap-4 px-5 py-4`}>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-fg">{m?.name ?? `Campaign ${row.entityId}`}</p>
                          <p className="mt-0.5 text-xs uppercase tracking-wide text-faint">
                            {m?.type ?? "—"}
                            {m?.status ? ` · ${m.status.toLowerCase()}` : ""}
                          </p>
                        </div>
                        <p
                          title={`Revenue ${formatMoney(row.revenue, cur)} · Spend ${formatMoney(row.spend, cur)} · Net ${formatMoney(row.net, cur)}`}
                          className={`cursor-default text-right font-mono text-sm ${row.net < 0 ? "text-loss" : "text-profit"}`}
                        >
                          {formatMoney(row.net, cur)}
                        </p>
                        <p
                          title="Gross profit ÷ ad spend (POAS). 1.00× means gross profit just covers ad spend."
                          className="cursor-default text-right font-mono text-sm text-muted"
                        >
                          {row.poas != null ? `${row.poas.toFixed(2)}×` : "—"}
                        </p>
                        <p
                          title="The ROAS this campaign needs just to break even, given its margins."
                          className="cursor-default text-right font-mono text-sm text-muted"
                        >
                          {row.breakEvenRoas != null ? `${row.breakEvenRoas.toFixed(2)}×` : "—"}
                        </p>
                        <p
                          title={`Ad spend over the last ${days} days`}
                          className="cursor-default text-right font-mono text-sm text-muted"
                        >
                          {formatMoney(row.spend, cur)}
                        </p>
                        <div className="flex justify-end">
                          <StatusTag status={deriveAction(row)} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
