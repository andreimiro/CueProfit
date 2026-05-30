import { Overview } from "@/components/app/overview";
import { type AccountFact, type Recommendation } from "@/lib/dashboard";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: memberships } = await supabase
    .from("workspace_members")
    .select("workspace_id, workspaces(name, currency)");

  const membership = memberships?.[0];
  const workspaceId = membership?.workspace_id as string | undefined;
  const workspace = membership?.workspaces as { name?: string; currency?: string } | null;

  let facts: AccountFact[] = [];
  let recommendations: Recommendation[] = [];
  let hasGoogleAdsConnection = false;
  if (workspaceId) {
    const since = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
    const admin = createAdminClient();
    const [factsRes, recsRes, connectionsRes] = await Promise.all([
      supabase
        .from("profit_daily_facts")
        .select("date,spend,revenue,gross_profit_before_ads,net_profit,waste_amount,currency")
        .eq("workspace_id", workspaceId)
        .eq("entity_type", "account")
        .gte("date", since)
        .order("date", { ascending: true }),
      supabase
        .from("recommendations")
        .select("kind,entity_type,entity_id,title,severity,expected_impact,impact_currency,confidence")
        .eq("workspace_id", workspaceId)
        .eq("status", "open")
        .order("expected_impact", { ascending: false, nullsFirst: false })
        .limit(6),
      admin
        .from("oauth_connections")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("provider", "google_ads")
        .eq("status", "active")
        .limit(1),
    ]);
    facts = (factsRes.data ?? []) as AccountFact[];
    recommendations = (recsRes.data ?? []) as Recommendation[];
    hasGoogleAdsConnection = Boolean(connectionsRes.data?.length);
  }

  return (
    <Overview
      currency={workspace?.currency ?? "RON"}
      facts={facts}
      hasGoogleAdsConnection={hasGoogleAdsConnection}
      recommendations={recommendations}
    />
  );
}
