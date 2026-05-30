import { Panel, PanelHeader } from "@/components/app/cards";
import { DataSourceEmpty, GoogleAdsHeaderAction } from "@/components/app/data-source-empty";
import { PageHeader } from "@/components/app/page-header";
import { type EntityFact, aggregateEntityFacts, formatMoney } from "@/lib/dashboard";
import { loadDashboardWorkspace } from "@/lib/dashboard-workspace";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const COLS = "grid-cols-[2.2fr_1fr_0.7fr_1fr_1fr_0.9fr]";

const COST_BADGE: Record<string, { label: string; cls: string }> = {
  high: { label: "Exact cost", cls: "border-profit/30 bg-profit/12 text-profit" },
  medium: { label: "Est. margin", cls: "border-amber/30 bg-amber/12 text-amber" },
  low: { label: "No cost data", cls: "border-edge bg-panel-2 text-faint" },
};

export default async function ProductsPage() {
  const { workspaceId, currency, sources } = await loadDashboardWorkspace();
  const supabase = await createClient();

  let rows: ReturnType<typeof aggregateEntityFacts> = [];
  const titleByItem = new Map<string, string>();
  if (workspaceId) {
    const since = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
    const { data } = await supabase
      .from("profit_daily_facts")
      .select("entity_id,spend,revenue,gross_profit_before_ads,net_profit,waste_amount,poas,break_even_roas,confidence,currency")
      .eq("workspace_id", workspaceId)
      .eq("entity_type", "product")
      .gte("date", since);
    rows = aggregateEntityFacts((data ?? []) as EntityFact[]);

    if (rows.length > 0) {
      // Resolve SKU titles: ads_item_id → product_id (resolver) → products.title,
      // with a direct products.offer_id == ads_item_id fallback.
      const [mapRes, prodRes] = await Promise.all([
        supabase
          .from("product_identity_map")
          .select("ads_item_id,product_id")
          .eq("workspace_id", workspaceId)
          .limit(5000),
        supabase
          .from("products")
          .select("id,offer_id,title")
          .eq("workspace_id", workspaceId)
          .limit(5000),
      ]);

      const titleById = new Map<string, string>();
      const titleByOffer = new Map<string, string>();
      for (const p of (prodRes.data ?? []) as { id: string; offer_id: string | null; title: string | null }[]) {
        if (p.title) {
          titleById.set(String(p.id), p.title);
          if (p.offer_id) titleByOffer.set(String(p.offer_id), p.title);
        }
      }
      const productIdByItem = new Map<string, string>();
      for (const m of (mapRes.data ?? []) as { ads_item_id: string; product_id: string | null }[]) {
        if (m.product_id) productIdByItem.set(String(m.ads_item_id), String(m.product_id));
      }
      for (const row of rows) {
        const viaMap = productIdByItem.get(row.entityId);
        const title = (viaMap ? titleById.get(viaMap) : undefined) ?? titleByOffer.get(row.entityId);
        if (title) titleByItem.set(row.entityId, title);
      }
    }
  }

  return (
    <div className="px-5 py-6 sm:px-8 lg:px-10 lg:py-8">
      <div className="mx-auto w-full max-w-[1760px] animate-reveal space-y-7">
        <PageHeader
          title="Products"
          subtitle={`Margin truth per SKU — find the products that lose money after costs · ${currency}`}
          actions={<GoogleAdsHeaderAction sources={sources} />}
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
                    const title = titleByItem.get(row.entityId);
                    return (
                      <div key={row.entityId} className={`grid ${COLS} items-center gap-4 px-5 py-4`}>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-fg" title={title ?? row.entityId}>
                            {title ?? row.entityId}
                          </p>
                          {title ? (
                            <p className="mt-0.5 truncate font-mono text-xs text-faint">{row.entityId}</p>
                          ) : null}
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
            <DataSourceEmpty sources={sources} source="profit" icon="products" />
          )}
        </Panel>
      </div>
    </div>
  );
}
