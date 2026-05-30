// Pure helpers for the dashboard. Supabase returns numeric columns as strings (to
// preserve precision), so everything is coerced through `num` before arithmetic.

export type AccountFact = {
  date: string;
  spend: number | string | null;
  revenue: number | string | null;
  gross_profit_before_ads: number | string | null;
  net_profit: number | string | null;
  waste_amount: number | string | null;
  currency: string | null;
};

export type Recommendation = {
  kind: string;
  entity_type: string;
  entity_id: string;
  title: string;
  severity: string;
  expected_impact: number | string | null;
  impact_currency: string | null;
  confidence: string | null;
};

export type ProfitSummary = {
  hasData: boolean;
  spend: number;
  revenue: number;
  gross: number;
  net: number;
  waste: number;
  poas: number | null;
  currency: string | null;
};

const num = (v: unknown): number => (v == null ? 0 : Number(v) || 0);

export function summarizeAccountFacts(
  facts: AccountFact[],
  fallbackCurrency?: string | null,
): ProfitSummary {
  const spend = facts.reduce((a, f) => a + num(f.spend), 0);
  const gross = facts.reduce((a, f) => a + num(f.gross_profit_before_ads), 0);
  return {
    hasData: facts.length > 0,
    spend,
    revenue: facts.reduce((a, f) => a + num(f.revenue), 0),
    gross,
    net: facts.reduce((a, f) => a + num(f.net_profit), 0),
    waste: facts.reduce((a, f) => a + num(f.waste_amount), 0),
    poas: spend > 0 ? gross / spend : null,
    currency: facts[0]?.currency ?? fallbackCurrency ?? null,
  };
}

export function formatMoney(value: number, currency?: string | null): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency ?? "EUR",
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${Math.round(value).toLocaleString()} ${currency ?? ""}`.trim();
  }
}

/** Daily net-profit bars, normalized to 0–100% height (losses flagged). */
export function netProfitBars(facts: AccountFact[]): { date: string; net: number; height: number; loss: boolean }[] {
  const nets = facts.map((f) => ({ date: f.date, net: num(f.net_profit) }));
  const maxAbs = Math.max(1, ...nets.map((b) => Math.abs(b.net)));
  return nets.map((b) => ({
    ...b,
    height: Math.max(4, Math.round((Math.abs(b.net) / maxAbs) * 100)),
    loss: b.net < 0,
  }));
}

const SEVERITY_TONE: Record<string, string> = {
  critical: "loss",
  high: "loss",
  medium: "fg",
  low: "profit",
  info: "muted",
};

export function severityTone(severity: string): string {
  return SEVERITY_TONE[severity] ?? "muted";
}

// ── Campaign / product detail tables ─────────────────────────────────────────
export type EntityFact = {
  entity_id: string;
  spend: number | string | null;
  revenue: number | string | null;
  gross_profit_before_ads: number | string | null;
  net_profit: number | string | null;
  waste_amount: number | string | null;
  poas: number | string | null;
  break_even_roas: number | string | null;
  confidence?: string | null;
  currency: string | null;
};

export type EntityRow = {
  entityId: string;
  spend: number;
  revenue: number;
  net: number;
  waste: number;
  poas: number | null;
  roas: number | null;
  breakEvenRoas: number | null;
  confidence: string | null;
  currency: string | null;
};

const CONF_RANK: Record<string, number> = { low: 0, medium: 1, high: 2 };

/** Aggregate daily entity facts (campaign or product) per entity over the period,
 *  worst net profit first. Ratios are recomputed from the summed money. */
export function aggregateEntityFacts(facts: EntityFact[]): EntityRow[] {
  const groups = new Map<
    string,
    { spend: number; revenue: number; gross: number; net: number; waste: number; confs: string[]; currency: string | null }
  >();
  for (const f of facts) {
    const id = String(f.entity_id);
    const g = groups.get(id) ?? { spend: 0, revenue: 0, gross: 0, net: 0, waste: 0, confs: [], currency: null };
    g.spend += num(f.spend);
    g.revenue += num(f.revenue);
    g.gross += num(f.gross_profit_before_ads);
    g.net += num(f.net_profit);
    g.waste += num(f.waste_amount);
    if (f.confidence) g.confs.push(f.confidence);
    if (!g.currency && f.currency) g.currency = f.currency;
    groups.set(id, g);
  }
  const rows: EntityRow[] = [];
  for (const [entityId, g] of groups) {
    rows.push({
      entityId,
      spend: g.spend,
      revenue: g.revenue,
      net: g.net,
      waste: g.waste,
      poas: g.spend > 0 ? g.gross / g.spend : null,
      roas: g.spend > 0 ? g.revenue / g.spend : null,
      breakEvenRoas: g.gross > 0 ? g.revenue / g.gross : null,
      // worst (lowest-rank) confidence across the entity's days
      confidence: g.confs.length
        ? g.confs.reduce((w, c) => ((CONF_RANK[c] ?? 0) < (CONF_RANK[w] ?? 0) ? c : w))
        : null,
      currency: g.currency,
    });
  }
  return rows.sort((a, b) => a.net - b.net);
}

export type CampaignMeta = { name: string | null; type: string | null; status: string | null };

type CampaignStatRow = {
  campaign_id: number | string;
  campaign_name: string | null;
  campaign_type: string | null;
  status: string | null;
};

/** First non-null name/type/status per campaign_id, keyed by string id (matches fact entity_id). */
export function campaignMetaById(rows: CampaignStatRow[]): Map<string, CampaignMeta> {
  const map = new Map<string, CampaignMeta>();
  for (const r of rows) {
    const id = String(r.campaign_id);
    const prev = map.get(id);
    map.set(id, {
      name: prev?.name ?? r.campaign_name ?? null,
      type: prev?.type ?? r.campaign_type ?? null,
      status: prev?.status ?? r.status ?? null,
    });
  }
  return map;
}

export type EntityAction = "Scale" | "Hold" | "Cap" | "Pause";

/** A coarse next-action from the summed numbers (mirrors the rules-engine cascade). */
export function deriveAction(row: { spend: number; net: number; revenue: number; poas: number | null }): EntityAction {
  if (row.spend < 1) return "Hold";
  if (row.net < 0) return row.revenue <= 0 ? "Pause" : "Cap";
  if ((row.poas ?? 0) >= 1.2) return "Scale";
  return "Hold";
}
