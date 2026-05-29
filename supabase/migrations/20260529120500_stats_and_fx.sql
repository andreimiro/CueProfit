-- ════════════════════════════════════════════════════════════════════════
-- 0005 · Daily performance facts + FX reference data
--
-- NOTE: started as plain indexed tables. Monthly RANGE partitioning on `date`
-- can be introduced later (pg_partman) once volume warrants — deferred for V1
-- to keep migrations + RLS simple. Indexes below cover the V1 access patterns.
-- Writes happen ONLY via service_role workers; clients read-only.
-- ════════════════════════════════════════════════════════════════════════

-- ── campaign_daily_stats ────────────────────────────────────────────────────
create table public.campaign_daily_stats (
  workspace_id      uuid not null references public.workspaces(id) on delete cascade,
  date              date not null,
  customer_id       bigint not null,           -- Google Ads customer (int64)
  campaign_id       bigint not null,
  campaign_name     text,
  campaign_type     text,                      -- SEARCH | PERFORMANCE_MAX | SHOPPING | ...
  status            text,
  bidding_strategy  text,
  budget_amount     numeric(14,2),
  impressions       bigint not null default 0,
  clicks            bigint not null default 0,
  spend             numeric(14,2) not null default 0,
  conversions       numeric(14,2) not null default 0,
  conversion_value  numeric(16,2) not null default 0,
  currency          char(3),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  primary key (workspace_id, date, customer_id, campaign_id)
);
create index idx_campaign_stats_ws_date on public.campaign_daily_stats(workspace_id, date);
create trigger trg_campaign_stats_updated_at
  before update on public.campaign_daily_stats
  for each row execute function public.set_updated_at();

-- ── product_daily_stats ─────────────────────────────────────────────────────
create table public.product_daily_stats (
  workspace_id      uuid not null references public.workspaces(id) on delete cascade,
  date              date not null,
  customer_id       bigint not null,
  campaign_id       bigint not null,
  ads_item_id       text not null,             -- product id from Ads shopping/PMax report
  product_id        uuid references public.products(id) on delete set null,
  impressions       bigint not null default 0,
  clicks            bigint not null default 0,
  spend             numeric(14,2) not null default 0,
  conversions       numeric(14,2) not null default 0,
  conversion_value  numeric(16,2) not null default 0,
  currency          char(3),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  primary key (workspace_id, date, customer_id, campaign_id, ads_item_id)
);
create index idx_product_stats_ws_date on public.product_daily_stats(workspace_id, date);
create index idx_product_stats_product on public.product_daily_stats(product_id);
create trigger trg_product_stats_updated_at
  before update on public.product_daily_stats
  for each row execute function public.set_updated_at();

-- ── fx_rates (global reference data) ────────────────────────────────────────
create table public.fx_rates (
  date   date not null,
  base   char(3) not null,
  quote  char(3) not null,
  rate   numeric(18,8) not null,
  primary key (date, base, quote)
);

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table public.campaign_daily_stats enable row level security;
alter table public.product_daily_stats  enable row level security;
alter table public.fx_rates              enable row level security;

create policy campaign_stats_select on public.campaign_daily_stats
  for select using (public.is_workspace_member(workspace_id));
create policy product_stats_select on public.product_daily_stats
  for select using (public.is_workspace_member(workspace_id));

-- FX is non-sensitive reference data: any authenticated user may read.
create policy fx_rates_select on public.fx_rates
  for select to authenticated using (true);
