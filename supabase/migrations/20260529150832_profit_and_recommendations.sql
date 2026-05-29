-- ════════════════════════════════════════════════════════════════════════
-- 0006 · Profit facts, recommendation thresholds, recommendations
-- ════════════════════════════════════════════════════════════════════════

-- ── profit_daily_facts (materialized by the profit-recompute worker) ─────────
create table public.profit_daily_facts (
  workspace_id            uuid not null references public.workspaces(id) on delete cascade,
  date                    date not null,
  entity_type             entity_type not null,
  entity_id               text not null,         -- campaign_id / ads_item_id / category / 'account'
  spend                   numeric(16,2) not null default 0,
  revenue                 numeric(16,2) not null default 0,   -- gross conversion value
  adjusted_revenue        numeric(16,2) not null default 0,   -- VAT/returns/validation applied
  variable_cost           numeric(16,2) not null default 0,
  gross_profit_before_ads numeric(16,2) not null default 0,
  net_profit              numeric(16,2) not null default 0,
  poas                    numeric(12,4),
  net_poas                numeric(12,4),
  break_even_roas         numeric(12,4),
  waste_amount            numeric(16,2) not null default 0,
  confidence              confidence_level,
  currency                char(3),
  computed_at             timestamptz not null default now(),
  primary key (workspace_id, date, entity_type, entity_id)
);
create index idx_profit_facts_ws_date on public.profit_daily_facts(workspace_id, date);
create index idx_profit_facts_entity  on public.profit_daily_facts(workspace_id, entity_type, entity_id);

-- ── recommendation_thresholds (one tunable config row per workspace) ─────────
create table public.recommendation_thresholds (
  workspace_id  uuid primary key references public.workspaces(id) on delete cascade,
  config        jsonb not null default jsonb_build_object(
                  'min_clicks_for_waste', 20,
                  'waste_spend_threshold', 50,
                  'conversion_drop_pct', 0.6,
                  'low_margin_threshold', 0.18,
                  'pmax_spend_share_threshold', 0.15,
                  'min_conversions_to_scale', 10,
                  'scale_poas_multiplier', 1.2
                ),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger trg_thresholds_updated_at
  before update on public.recommendation_thresholds
  for each row execute function public.set_updated_at();

-- ── recommendations (rules engine output; AI explains them) ──────────────────
create table public.recommendations (
  id                 uuid primary key default gen_random_uuid(),
  workspace_id       uuid not null references public.workspaces(id) on delete cascade,
  entity_type        entity_type not null,
  entity_id          text not null,
  kind               recommendation_kind not null,
  severity           recommendation_severity not null default 'medium',
  title              text not null,
  description        text,
  expected_impact    numeric(16,2),
  impact_currency    char(3),
  confidence         confidence_level,
  status             recommendation_status not null default 'open',
  evidence           jsonb,                  -- the numbers behind the call
  rule_key           text not null,          -- which deterministic rule fired
  period_start       date,
  period_end         date,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  resolved_at        timestamptz,
  -- idempotent upsert key so re-running the rules engine refreshes, not duplicates
  unique (workspace_id, rule_key, entity_type, entity_id, period_start)
);
create index idx_recommendations_ws_status on public.recommendations(workspace_id, status);
create trigger trg_recommendations_updated_at
  before update on public.recommendations
  for each row execute function public.set_updated_at();

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table public.profit_daily_facts        enable row level security;
alter table public.recommendation_thresholds enable row level security;
alter table public.recommendations           enable row level security;

create policy profit_facts_select on public.profit_daily_facts
  for select using (public.is_workspace_member(workspace_id));

create policy thresholds_select on public.recommendation_thresholds
  for select using (public.is_workspace_member(workspace_id));
create policy thresholds_write on public.recommendation_thresholds
  for all using (public.has_workspace_role(workspace_id, array['owner','admin']::member_role[]))
  with check (public.has_workspace_role(workspace_id, array['owner','admin']::member_role[]));

-- recommendations: members read + change status; generation happens via service_role.
create policy recommendations_select on public.recommendations
  for select using (public.is_workspace_member(workspace_id));
create policy recommendations_update on public.recommendations
  for update using (public.has_workspace_role(workspace_id, array['owner','admin','member']::member_role[]))
  with check (public.has_workspace_role(workspace_id, array['owner','admin','member']::member_role[]));
