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
