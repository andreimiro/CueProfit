import { EmptyState, Panel, PanelHeader } from "@/components/app/cards";
import { ConnectGoogleButton } from "@/components/app/controls";
import { PageHeader } from "@/components/app/page-header";
import { type Recommendation, formatMoney, severityTone } from "@/lib/dashboard";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const TONE_TEXT: Record<string, string> = {
  loss: "text-loss",
  profit: "text-profit",
  fg: "text-fg",
  muted: "text-muted",
};

export default async function RecommendationsPage() {
  const supabase = await createClient();
  const { data: memberships } = await supabase
    .from("workspace_members")
    .select("workspace_id, workspaces(currency)");
  const membership = memberships?.[0];
  const workspaceId = membership?.workspace_id as string | undefined;
  const currency = (membership?.workspaces as { currency?: string } | null)?.currency ?? "RON";

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

  return (
    <div className="px-5 py-6 sm:px-8 lg:px-10 lg:py-8">
      <div className="mx-auto w-full max-w-[1760px] animate-reveal space-y-7">
        <PageHeader
          title="Recommendations"
          subtitle="What to stop, fix or scale — ranked by profit impact"
          actions={<ConnectGoogleButton />}
        />
        <Panel className="overflow-hidden">
          <PanelHeader
            title="Open recommendations"
            hint={
              recommendations.length > 0
                ? `${recommendations.length} open · ranked by estimated profit impact`
                : "Ranked by estimated profit impact"
            }
          />
          {recommendations.length > 0 ? (
            <div className="divide-y divide-edge">
              {recommendations.map((rec) => (
                <div
                  key={`${rec.kind}-${rec.entity_type}-${rec.entity_id}`}
                  className="grid grid-cols-[1fr_auto] items-center gap-4 px-5 py-4"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-fg">{rec.title}</p>
                    <p className="mt-1 text-xs uppercase tracking-wide text-faint">
                      {rec.kind.replace(/_/g, " ")} · {rec.entity_type} {rec.entity_id}
                      {rec.confidence ? ` · ${rec.confidence} confidence` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`font-mono text-sm ${TONE_TEXT[severityTone(rec.severity)] ?? "text-fg"}`}>
                      {rec.expected_impact != null
                        ? formatMoney(Number(rec.expected_impact), rec.impact_currency ?? currency)
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
              description="After the first Google Ads sync and profit recompute, we rank what to stop, fix or scale — each with an estimated impact and a confidence level."
              action={<ConnectGoogleButton variant="secondary" />}
            />
          )}
        </Panel>
      </div>
    </div>
  );
}
