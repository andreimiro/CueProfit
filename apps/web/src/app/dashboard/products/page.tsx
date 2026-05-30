import { EmptyState, Panel, PanelHeader } from "@/components/app/cards";
import { ConnectGoogleButton } from "@/components/app/controls";
import { PageHeader } from "@/components/app/page-header";
import { type EntityFact, aggregateEntityFacts, formatMoney } from "@/lib/dashboard";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const COLS = "grid-cols-[2.2fr_1fr_0.7fr_1fr_1fr_0.9fr]";

// profit-engine confidence → how the per-SKU cost was derived.
const COST_BADGE: Record<string, { label: string; cls: string }> = {
  high: { label: "Exact cost", cls: "border-profit/30 bg-profit/12 text-profit" },
  medium: { label: "Est. margin", cls: "border-amber/30 bg-amber/12 text-amber" },
  low: { label: "No cost data", cls: "border-edge bg-panel-2 text-faint" },
};

export default async function ProductsPage() {
  const supabase = await createClient();
  const { data: memberships } = await supabase
    .from("workspace_members")
    .select("workspace_id, workspaces(currency)");
  const membership = memberships?.[0];
  const workspaceId = membership?.workspace_id as string | undefined;
  const currency = (membership?.workspaces as { currency?: string } | null)?.currency ?? "RON";

  let rows: ReturnType<typeof aggregateEntityFacts> = [];
  if (workspaceId) {
    const since = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
    const { data } = await supabase
      .from("profit_daily_facts")
      .select("entity_id,spend,revenue,gross_profit_before_ads,net_profit,waste_amount,poas,break_even_roas,confidence,currency")
      .eq("workspace_id", workspaceId)
      .eq("entity_type", "product")
      .gte("date", since);
    rows = aggregateEntityFacts((data ?? []) as EntityFact[]);
  }

  return (
    <div className="px-5 py-6 sm:px-8 lg:px-10 lg:py-8">
      <div className="mx-auto w-full max-w-[1760px] animate-reveal space-y-7">
        <PageHeader
          title="Products"
          subtitle={`Margin truth per SKU — find the products that lose money after costs · ${currency}`}
          actions={<ConnectGoogleButton />}
        />
        <Panel className="overflow-hidden">
          <PanelHeader
            title="Products by net profit"
            hint="Worst performers first. Cost data quality is flagged per SKU."
          />
          {rows.length > 0 ? (
            <div className="overflow-x-auto">
              <div className="min-w-[780px]">
                <div className={`grid ${COLS} gap-4 border-b border-edge px-5 py-3 text-xs font-semibold uppercase tracking-wide text-faint`}>
                  <span>Product</span>
                  <span className="text-right">Net profit</span>
                  <span className="text-right">POAS</span>
                  <span className="text-right">Break-even ROAS</span>
                  <span className="text-right">Spend</span>
                  <span className="text-right">Cost data</span>
                </div>
                <div className="divide-y divide-edge">
                  {rows.map((row) => {
                    const cur = row.currency ?? currency;
                    const badge = COST_BADGE[row.confidence ?? "low"] ?? COST_BADGE.low;
                    return (
                      <div key={row.entityId} className={`grid ${COLS} items-center gap-4 px-5 py-4`}>
                        <p className="truncate font-mono text-sm text-fg" title={row.entityId}>
                          {row.entityId}
                        </p>
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
                          <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${badge.cls}`}>
                            {badge.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <EmptyState
              icon="products"
              title="No products yet"
              description="Connect Google Ads (and add product costs) to reveal per-SKU profit, break-even ROAS and margin pressure. Product titles fill in once Merchant Center is connected."
              action={<ConnectGoogleButton variant="secondary" />}
            />
          )}
        </Panel>
      </div>
    </div>
  );
}
