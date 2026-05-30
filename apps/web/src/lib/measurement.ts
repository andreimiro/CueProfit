import { formatMoney } from "@/lib/dashboard";

type SupabaseLike = {
  from: (table: string) => any;
};

export type ModelType = "attribution" | "mmm" | "incrementality";

export type MeasurementRun = {
  id: string;
  status: string;
  period_start: string | null;
  period_end: string | null;
  confidence: string | null;
  data_quality_score: number | string | null;
  metrics: Record<string, unknown> | null;
  summary: Record<string, unknown> | null;
  computed_at: string | null;
};

export type AttributionResult = {
  entity_name: string | null;
  entity_id: string;
  dimension: string;
  touchpoints: number | string;
  conversions: number | string;
  attributed_revenue: number | string;
  attributed_profit: number | string;
  assisted_profit: number | string;
  match_rate: number | string | null;
  currency: string | null;
};

export type MmmContribution = {
  channel: string;
  spend: number | string;
  contribution_revenue: number | string;
  contribution_profit: number | string;
  roi: number | string | null;
  saturation_level: string | null;
  recommended_spend_change: number | string | null;
  confidence: string | null;
  currency: string | null;
};

export type IncrementalityTest = {
  name: string;
  status: string;
  test_start: string | null;
  test_end: string | null;
  holdout_share: number | string | null;
  incremental_revenue: number | string | null;
  incremental_profit: number | string | null;
  lift_pct: number | string | null;
  confidence_pct: number | string | null;
  payback_days: number | null;
  decision: string | null;
  currency: string | null;
};

export type MeasurementData<T> = {
  run: MeasurementRun | null;
  rows: T[];
  error: string | null;
};

export const num = (v: unknown): number => (v == null ? 0 : Number(v) || 0);

export function pct(value: unknown, digits = 0): string {
  return `${(num(value) * 100).toFixed(digits)}%`;
}

export function signedMoney(value: unknown, currency?: string | null): string {
  const n = num(value);
  const formatted = formatMoney(Math.abs(n), currency);
  return `${n >= 0 ? "+" : "-"}${formatted}`;
}

export function periodLabel(run: MeasurementRun | null): string {
  if (!run?.period_start || !run.period_end) return "No modeled period yet";
  return `${run.period_start} to ${run.period_end}`;
}

export async function loadLatestRun(
  supabase: SupabaseLike,
  workspaceId: string | null | undefined,
  modelType: ModelType,
): Promise<{ run: MeasurementRun | null; error: string | null }> {
  if (!workspaceId) return { run: null, error: null };

  const { data, error } = await supabase
    .from("measurement_model_runs")
    .select("id,status,period_start,period_end,confidence,data_quality_score,metrics,summary,computed_at")
    .eq("workspace_id", workspaceId)
    .eq("model_type", modelType)
    .order("computed_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    run: (data as MeasurementRun | null) ?? null,
    error: error?.message ?? null,
  };
}

export async function loadAttributionData(
  supabase: SupabaseLike,
  workspaceId: string | null | undefined,
): Promise<MeasurementData<AttributionResult>> {
  const { run, error } = await loadLatestRun(supabase, workspaceId, "attribution");
  if (!workspaceId || !run || error) return { run, rows: [], error };

  const query = supabase
    .from("attribution_results")
    .select("entity_name,entity_id,dimension,touchpoints,conversions,attributed_revenue,attributed_profit,assisted_profit,match_rate,currency")
    .eq("workspace_id", workspaceId)
    .eq("run_id", run.id)
    .order("attributed_profit", { ascending: false })
    .limit(8);
  const { data, error: rowsError } = await query;

  return {
    run,
    rows: ((data ?? []) as AttributionResult[]),
    error: rowsError?.message ?? null,
  };
}

export async function loadMmmData(
  supabase: SupabaseLike,
  workspaceId: string | null | undefined,
): Promise<MeasurementData<MmmContribution>> {
  const { run, error } = await loadLatestRun(supabase, workspaceId, "mmm");
  if (!workspaceId || !run || error) return { run, rows: [], error };

  const query = supabase
    .from("mmm_channel_contributions")
    .select("channel,spend,contribution_revenue,contribution_profit,roi,saturation_level,recommended_spend_change,confidence,currency")
    .eq("workspace_id", workspaceId)
    .eq("run_id", run.id)
    .order("contribution_profit", { ascending: false })
    .limit(8);
  const { data, error: rowsError } = await query;

  return {
    run,
    rows: ((data ?? []) as MmmContribution[]),
    error: rowsError?.message ?? null,
  };
}

export async function loadIncrementalityData(
  supabase: SupabaseLike,
  workspaceId: string | null | undefined,
): Promise<MeasurementData<IncrementalityTest>> {
  if (!workspaceId) return { run: null, rows: [], error: null };

  const { run, error } = await loadLatestRun(supabase, workspaceId, "incrementality");
  const query = supabase
    .from("incrementality_tests")
    .select("name,status,test_start,test_end,holdout_share,incremental_revenue,incremental_profit,lift_pct,confidence_pct,payback_days,decision,currency")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(6);
  const { data, error: rowsError } = await query;

  return {
    run,
    rows: ((data ?? []) as IncrementalityTest[]),
    error: error ?? rowsError?.message ?? null,
  };
}

export function metricValue(run: MeasurementRun | null, key: string): unknown {
  return run?.metrics?.[key] ?? run?.summary?.[key] ?? null;
}
