import { EmptyState, Panel, PanelHeader, StatusTag } from "@/components/app/cards";
import { ConnectGoogleButton } from "@/components/app/controls";
import { PageHeader } from "@/components/app/page-header";
import {
  type CampaignMeta,
  type EntityFact,
  aggregateEntityFacts,
  campaignMetaById,
  deriveAction,
  formatMoney,
} from "@/lib/dashboard";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const COLS = "grid-cols-[2.2fr_1fr_0.7fr_1fr_1fr_0.8fr]";

export default async function CampaignsPage() {
  const supabase = await createClient();
  const { data: memberships } = await supabase
    .from("workspace_members")
    .select("workspace_id, workspaces(currency)");
  const membership = memberships?.[0];
  const workspaceId = membership?.workspace_id as string | undefined;
  const currency = (membership?.workspaces as { currency?: string } | null)?.currency ?? "RON";

  let rows: ReturnType<typeof aggregateEntityFacts> = [];
  let meta = new Map<string, CampaignMeta>();
  if (workspaceId) {
    const since = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
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
    rows = aggregateEntityFacts((factsRes.data ?? []) as EntityFact[]);
    meta = campaignMetaById(statsRes.data ?? []);
  }

  return (
    <div className="px-5 py-6 sm:px-8 lg:px-10 lg:py-8">
      <div className="mx-auto w-full max-w-[1760px] animate-reveal space-y-7">
        <PageHeader
          title="Campaigns"
          subtitle={`True profit, POAS and the next action for every campaign · ${currency}`}
          actions={<ConnectGoogleButton />}
        />
        <Panel className="overflow-hidden">
          <PanelHeader
            title="Campaigns by net profit"
            hint="Worst performers first — scale the winners, cap the losers"
          />
          {rows.length > 0 ? (
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
                        <p className={`text-right font-mono text-sm ${row.net < 0 ? "text-loss" : "text-profit"}`}>
                          {formatMoney(row.net, cur)}
                        </p>
                        <p className="text-right font-mono text-sm text-muted">
                          {row.poas != null ? `${row.poas.toFixed(2)}×` : "—"}
                        </p>
                        <p className="text-right font-mono text-sm text-muted">
                          {row.breakEvenRoas != null ? `${row.breakEvenRoas.toFixed(2)}×` : "—"}
                        </p>
                        <p className="text-right font-mono text-sm text-muted">{formatMoney(row.spend, cur)}</p>
                        <div className="flex justify-end">
                          <StatusTag status={deriveAction(row)} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <EmptyState
              icon="campaigns"
              title="No campaigns yet"
              description="Connect Google Ads and run the first sync — campaigns appear here ranked by net profit, each with the action to take."
              action={<ConnectGoogleButton variant="secondary" />}
            />
          )}
        </Panel>
      </div>
    </div>
  );
}
