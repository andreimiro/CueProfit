-- ════════════════════════════════════════════════════════════════════════
-- 0009 · Measurement models: attribution, MMM, incrementality
--
-- These tables store model outputs, not raw ad/order ingestion. Workers own
-- writes through service_role; workspace members can read the resulting pages.
-- ════════════════════════════════════════════════════════════════════════

create table public.measurement_model_runs (
  id                  uuid primary key default gen_random_uuid(),
  workspace_id        uuid not null references public.workspaces(id) on delete cascade,
  model_type          text not null check (model_type in ('attribution', 'mmm', 'incrementality')),
  status              text not null default 'draft' check (status in ('draft', 'queued', 'running', 'ready', 'failed')),
  period_start        date,
  period_end          date,
  confidence          confidence_level,
  data_quality_score  numeric(5,2) check (data_quality_score is null or (data_quality_score >= 0 and data_quality_score <= 100)),
  metrics             jsonb not null default '{}'::jsonb,
  summary             jsonb not null default '{}'::jsonb,
  error_message       text,
  computed_at         timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index idx_measurement_runs_ws_type on public.measurement_model_runs(workspace_id, model_type, created_at desc);
create trigger trg_measurement_runs_updated_at
  before update on public.measurement_model_runs
  for each row execute function public.set_updated_at();

create table public.attribution_results (
  id                    uuid primary key default gen_random_uuid(),
  workspace_id          uuid not null references public.workspaces(id) on delete cascade,
  run_id                uuid not null references public.measurement_model_runs(id) on delete cascade,
  model                 text not null default 'linear',
  dimension             text not null check (dimension in ('channel', 'campaign', 'ad_group', 'keyword', 'product')),
  entity_id             text not null,
  entity_name           text,
  touchpoints           bigint not null default 0,
  conversions           numeric(16,4) not null default 0,
  attributed_revenue    numeric(16,2) not null default 0,
  attributed_profit     numeric(16,2) not null default 0,
  assisted_profit       numeric(16,2) not null default 0,
  first_touch_profit    numeric(16,2) not null default 0,
  last_touch_profit     numeric(16,2) not null default 0,
  match_rate            numeric(7,4),
  currency              char(3),
  created_at            timestamptz not null default now()
);
create index idx_attribution_results_run on public.attribution_results(run_id, dimension, attributed_profit desc);
create index idx_attribution_results_ws on public.attribution_results(workspace_id, created_at desc);

create table public.mmm_channel_contributions (
  id                       uuid primary key default gen_random_uuid(),
  workspace_id             uuid not null references public.workspaces(id) on delete cascade,
  run_id                   uuid not null references public.measurement_model_runs(id) on delete cascade,
  channel                  text not null,
  spend                    numeric(16,2) not null default 0,
  contribution_revenue     numeric(16,2) not null default 0,
  contribution_profit      numeric(16,2) not null default 0,
  roi                      numeric(12,4),
  saturation_level         text check (saturation_level is null or saturation_level in ('low', 'medium', 'high')),
  recommended_spend_change numeric(16,2),
  confidence               confidence_level,
  currency                 char(3),
  created_at               timestamptz not null default now()
);
create index idx_mmm_contributions_run on public.mmm_channel_contributions(run_id, contribution_profit desc);
create index idx_mmm_contributions_ws on public.mmm_channel_contributions(workspace_id, created_at desc);

create table public.incrementality_tests (
  id                    uuid primary key default gen_random_uuid(),
  workspace_id          uuid not null references public.workspaces(id) on delete cascade,
  run_id                uuid references public.measurement_model_runs(id) on delete set null,
  name                  text not null,
  entity_type           text not null default 'campaign',
  entity_id             text,
  status                text not null default 'draft' check (status in ('draft', 'running', 'ready', 'stopped', 'failed')),
  test_start            date,
  test_end              date,
  control_definition    jsonb not null default '{}'::jsonb,
  test_definition       jsonb not null default '{}'::jsonb,
  holdout_share         numeric(7,4),
  baseline_profit       numeric(16,2),
  test_profit           numeric(16,2),
  control_profit        numeric(16,2),
  incremental_revenue   numeric(16,2),
  incremental_profit    numeric(16,2),
  lift_pct              numeric(9,4),
  confidence_pct        numeric(7,4),
  payback_days          integer,
  decision              text check (decision is null or decision in ('scale', 'hold', 'stop', 'inconclusive')),
  currency              char(3),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index idx_incrementality_tests_ws on public.incrementality_tests(workspace_id, status, created_at desc);
create trigger trg_incrementality_tests_updated_at
  before update on public.incrementality_tests
  for each row execute function public.set_updated_at();

alter table public.measurement_model_runs    enable row level security;
alter table public.attribution_results       enable row level security;
alter table public.mmm_channel_contributions enable row level security;
alter table public.incrementality_tests      enable row level security;

create policy measurement_runs_select on public.measurement_model_runs
  for select using (public.is_workspace_member(workspace_id));
create policy attribution_results_select on public.attribution_results
  for select using (public.is_workspace_member(workspace_id));
create policy mmm_contributions_select on public.mmm_channel_contributions
  for select using (public.is_workspace_member(workspace_id));
create policy incrementality_tests_select on public.incrementality_tests
  for select using (public.is_workspace_member(workspace_id));
