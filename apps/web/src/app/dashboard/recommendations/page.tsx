import { Panel, PanelHeader } from "@/components/app/cards";
import { DataSourceEmpty, GoogleAdsHeaderAction } from "@/components/app/data-source-empty";
import { PageHeader } from "@/components/app/page-header";
import { type Recommendation, formatMoney, severityTone } from "@/lib/dashboard";
import { loadDashboardWorkspace } from "@/lib/dashboard-workspace";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const TONE_TEXT: Record<string, string> = {
  loss: "text-loss",
  profit: "text-profit",
  fg: "text-fg",
  muted: "text-muted",
};

const BUCKETS = [
  { key: "stop", title: "Stop the bleed", hint: "Cut spend that loses money", kinds: ["wasted_spend", "reduce", "pause", "exclude"] },
  { key: "fix", title: "Fix", hint: "Profitable once you fix the leak", kinds: ["good_roas_bad_profit", "fix", "tracking_issue", "feed_issue", "low_margin_pmax"] },
  { key: "scale", title: "Scale", hint: "Profitable with headroom to grow", kinds: ["scale", "keep"] },
  { key: "watch", title: "Watch", hint: "Monitor — not enough signal yet", kinds: ["watch", "needs_more_data"] },
] as const;

function bucketOf(kind: string): string {
  for (const b of BUCKETS) if ((b.kinds as readonly string[]).includes(kind)) return b.key;
  return "fix";
}

const sumImpact = (recs: Recommendation[]) =>
  recs.reduce((a, r) => a + (r.expected_impact != null ? Number(r.expected_impact) : 0), 0);

function RecRow({ rec, currency }: { rec: Recommendation; currency: string }) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-4 px-5 py-4">
      <div className="min-w-0">
        <p className="font-medium text-fg">{rec.title}</p>
        <p className="mt-1 text-xs uppercase tracking-wide text-faint">
          {rec.kind.replace(/_/g, " ")} · {rec.entity_type} {rec.entity_id}
          {rec.confidence ? ` · ${rec.confidence} confidence` : ""}
        </p>
      </div>
      <div className="text-right">
        <p className={`font-mono text-sm ${TONE_TEXT[severityTone(rec.severity)] ?? "text-fg"}`}>
          {rec.expected_impact != null ? formatMoney(Number(rec.expected_impact), rec.impact_currency ?? currency) : "—"}
        </p>
        <p className="mt-1 text-xs uppercase tracking-wide text-faint">{rec.severity}</p>
      </div>
    </div>
  );
}

export default async function RecommendationsPage() {
  const { workspaceId, currency, sources } = await loadDashboardWorkspace();
  const supabase = await createClient();

  let recommendations: Recommendation[] = [];
  if (workspaceId) {
    const { data } = await supabase
      .from("recommendations")
      .select("kind,entity_type,entity_id,title,severity,expected_impact,impact_currency,confidence")
      .eq("workspace_id", workspaceId)
      .eq("status", "open")
      .order("expected_impact", { ascending: false, nullsFirst: false })
      .limit(100);
    recommendations = (data ?? []) as Recommendation[];
  }

  const grouped = new Map<string, Recommendation[]>();
  for (const rec of recommendations) {
    const key = bucketOf(rec.kind);
    (grouped.get(key) ?? grouped.set(key, []).get(key)!).push(rec);
  }
  const totalImpact = sumImpact(recommendations);

  return (
    <div className="px-5 py-6 sm:px-8 lg:px-10 lg:py-8">
      <div className="mx-auto w-full max-w-[1760px] animate-reveal space-y-7">
        <PageHeader
          title="Recommendations"
          subtitle="What to stop, fix or scale — ranked by profit impact"
          actions={<GoogleAdsHeaderAction sources={sources} />}
        />

        {recommendations.length > 0 ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Panel className="p-5">
                <p className="flex items-center gap-2 text-sm font-medium text-muted">
                  <span className="h-1.5 w-1.5 rounded-full bg-profit" />
                  Open recommendations
                </p>
                <p className="mt-4 font-mono text-3xl font-semibold nums text-fg">{recommendations.length}</p>
              </Panel>
              <Panel className="p-5">
                <p className="flex items-center gap-2 text-sm font-medium text-muted">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber" />
                  Estimated profit at stake
                </p>
                <p className="mt-4 font-mono text-3xl font-semibold nums text-fg">
                  {formatMoney(totalImpact, currency)}
                </p>
              </Panel>
            </div>

            {BUCKETS.map((bucket) => {
              const recs = grouped.get(bucket.key);
              if (!recs || recs.length === 0) return null;
              return (
                <Panel key={bucket.key} className="overflow-hidden">
                  <PanelHeader
                    title={`${bucket.title} · ${recs.length}`}
                    hint={`${bucket.hint} · ${formatMoney(sumImpact(recs), currency)} impact`}
                  />
                  <div className="divide-y divide-edge">
                    {recs.map((rec) => (
                      <RecRow key={`${rec.kind}-${rec.entity_type}-${rec.entity_id}`} rec={rec} currency={currency} />
                    ))}
                  </div>
                </Panel>
              );
            })}
          </>
        ) : (
          <Panel>
            <DataSourceEmpty sources={sources} source="profit" icon="recommendations" />
          </Panel>
        )}
      </div>
    </div>
  );
}
