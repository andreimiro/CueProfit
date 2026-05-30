import { Overview } from "@/components/app/overview";
import {
  type AccountFact,
  type CampaignMeta,
  type EntityFact,
  type Recommendation,
  aggregateEntityFacts,
  campaignMetaById,
} from "@/lib/dashboard";
import { loadDashboardWorkspace } from "@/lib/dashboard-workspace";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DashboardPage() {
  const { workspaceId, currency, sources } = await loadDashboardWorkspace();
  const supabase = await createClient();

  let facts: AccountFact[] = [];
  let recommendations: Recommendation[] = [];
  let campaignRows: ReturnType<typeof aggregateEntityFacts> = [];
  let campaignMeta = new Map<string, CampaignMeta>();

  if (workspaceId) {
    const since = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
    const [factsRes, recsRes, campaignFactsRes, statsRes] = await Promise.all([
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
    facts = (factsRes.data ?? []) as AccountFact[];
    recommendations = (recsRes.data ?? []) as Recommendation[];
    campaignRows = aggregateEntityFacts((campaignFactsRes.data ?? []) as EntityFact[]);
    campaignMeta = campaignMetaById(statsRes.data ?? []);
  }

  return (
    <Overview
      currency={currency}
      facts={facts}
      sources={sources}
      hasGoogleAdsConnection={sources.hasGoogleAdsConnection}
      hasMerchantConnection={sources.hasMerchantConnection}
      hasProductCosts={sources.hasProductCosts}
      setupCount={sources.setupCount}
      recommendations={recommendations}
      campaignRows={campaignRows}
      campaignMeta={campaignMeta}
    />
  );
}
