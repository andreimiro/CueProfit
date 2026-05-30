import { Panel, PanelHeader } from "@/components/app/cards";
import { DataSourceEmpty, MerchantHeaderAction } from "@/components/app/data-source-empty";
import { PageHeader } from "@/components/app/page-header";
import { loadDashboardWorkspace } from "@/lib/dashboard-workspace";
import { type CatalogProduct, FEED_SEVERITY_CLASS, summarizeFeed } from "@/lib/feed-health";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const STATS: { key: "total" | "approved" | "disapproved" | "issues"; label: string; dot: string; text: string }[] = [
  { key: "total", label: "Products in feed", dot: "bg-faint", text: "text-fg" },
  { key: "approved", label: "Approved", dot: "bg-profit", text: "text-profit" },
  { key: "disapproved", label: "Disapproved", dot: "bg-loss", text: "text-loss" },
  { key: "issues", label: "Need attention", dot: "bg-amber", text: "text-amber" },
];

export default async function FeedHealthPage() {
  const { workspaceId, sources } = await loadDashboardWorkspace();
  const supabase = await createClient();

  let products: CatalogProduct[] = [];
  if (workspaceId) {
    const { data } = await supabase
      .from("products")
      .select("id,offer_id,title,gtin,image_url,price,availability,status")
      .eq("workspace_id", workspaceId)
      .limit(2000);
    products = (data ?? []) as CatalogProduct[];
  }

  const feed = summarizeFeed(products);
  const statValue = {
    total: feed.total,
    approved: feed.approved,
    disapproved: feed.disapproved,
    issues: feed.issues.length,
  };

  return (
    <div className="px-5 py-6 sm:px-8 lg:px-10 lg:py-8">
      <div className="mx-auto w-full max-w-[1760px] animate-reveal space-y-7">
        <PageHeader
          title="Feed health"
          subtitle="Catch Merchant Center disapprovals and weak listings before they cost you spend"
          actions={<MerchantHeaderAction sources={sources} />}
        />

        {feed.total > 0 ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {STATS.map((s) => (
                <Panel key={s.key} className="p-5">
                  <p className="flex items-center gap-2 text-sm font-medium text-muted">
                    <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                    {s.label}
                  </p>
                  <p className={`mt-4 font-mono text-3xl font-semibold nums ${s.text}`}>
                    {statValue[s.key].toLocaleString()}
                  </p>
                </Panel>
              ))}
            </div>

            <Panel className="overflow-hidden">
              <PanelHeader
                title="Needs attention"
                hint={
                  feed.issues.length > 0
                    ? `${feed.issues.length} products with feed problems · most severe first`
                    : "Every synced product passed the feed checks"
                }
              />
              {feed.issues.length > 0 ? (
                <div className="divide-y divide-edge">
                  {feed.issues.slice(0, 100).map((row) => (
                    <div key={row.id} className="grid grid-cols-[1fr_auto] items-center gap-4 px-5 py-4">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-fg">{row.title ?? row.offer}</p>
                        <p className="mt-0.5 font-mono text-xs text-faint">{row.offer}</p>
                      </div>
                      <div className="flex max-w-[60%] flex-wrap justify-end gap-1.5">
                        {row.problems.map((q) => (
                          <span
                            key={q.label}
                            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${FEED_SEVERITY_CLASS[q.severity]}`}
                          >
                            {q.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-6 py-12 text-center">
                  <p className="font-display text-base font-semibold text-profit">Feed looks healthy</p>
                  <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-muted">
                    All {feed.total.toLocaleString()} synced products passed the disapproval and listing-quality checks.
                  </p>
                </div>
              )}
            </Panel>
          </>
        ) : (
          <Panel>
            <DataSourceEmpty
              sources={sources}
              source="merchant"
              icon="feed"
              title="Connect Merchant Center to monitor feed health"
              description="We watch for disapprovals, weak titles, missing images and out-of-stock items, then flag what is quietly costing you spend."
            />
          </Panel>
        )}
      </div>
    </div>
  );
}
