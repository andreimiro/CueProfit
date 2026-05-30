-- ════════════════════════════════════════════════════════════════════════
-- 0010 · Google Ads measurement inputs
--
-- Google-Ads-only foundation for attribution previews, spend-response
-- previews, and lift planning before ecommerce/other-channel integrations.
-- Writes happen through service_role sync workers; clients read via RLS.
-- ════════════════════════════════════════════════════════════════════════

create table public.google_ads_customers (
  workspace_id        uuid not null references public.workspaces(id) on delete cascade,
  customer_id         bigint not null,
  descriptive_name    text,
  currency            char(3),
  time_zone           text,
  status              text,
  manager             boolean,
  test_account        boolean,
  optimization_score  numeric(8,4),
  synced_at           timestamptz not null default now(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  primary key (workspace_id, customer_id)
);
create trigger trg_google_ads_customers_updated_at
  before update on public.google_ads_customers
  for each row execute function public.set_updated_at();

create table public.google_ads_conversion_actions (
  workspace_id       uuid not null references public.workspaces(id) on delete cascade,
  customer_id        bigint not null,
  conversion_action_id bigint not null,
  name               text,
  category           text,
  type               text,
  status             text,
  primary_for_goal   boolean,
  synced_at          timestamptz not null default now(),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  primary key (workspace_id, customer_id, conversion_action_id)
);
create index idx_google_ads_conversion_actions_ws on public.google_ads_conversion_actions(workspace_id, status);
create trigger trg_google_ads_conversion_actions_updated_at
  before update on public.google_ads_conversion_actions
  for each row execute function public.set_updated_at();

create table public.search_term_daily_stats (
  workspace_id      uuid not null references public.workspaces(id) on delete cascade,
  date              date not null,
  customer_id       bigint not null,
  campaign_id       bigint not null,
  ad_group_id       bigint not null,
  search_term       text not null,
  device            text,
  impressions       bigint not null default 0,
  clicks            bigint not null default 0,
  spend             numeric(14,2) not null default 0,
  conversions       numeric(14,2) not null default 0,
  conversion_value  numeric(16,2) not null default 0,
  currency          char(3),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  primary key (workspace_id, date, customer_id, campaign_id, ad_group_id, search_term, device)
);
create index idx_search_term_stats_ws_date on public.search_term_daily_stats(workspace_id, date);
create index idx_search_term_stats_campaign on public.search_term_daily_stats(workspace_id, campaign_id, date);
create trigger trg_search_term_stats_updated_at
  before update on public.search_term_daily_stats
  for each row execute function public.set_updated_at();

create table public.keyword_daily_stats (
  workspace_id      uuid not null references public.workspaces(id) on delete cascade,
  date              date not null,
  customer_id       bigint not null,
  campaign_id       bigint not null,
  ad_group_id       bigint not null,
  criterion_id      bigint not null,
  keyword_text      text,
  match_type        text,
  device            text,
  impressions       bigint not null default 0,
  clicks            bigint not null default 0,
  spend             numeric(14,2) not null default 0,
  conversions       numeric(14,2) not null default 0,
  conversion_value  numeric(16,2) not null default 0,
  currency          char(3),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  primary key (workspace_id, date, customer_id, campaign_id, ad_group_id, criterion_id, device)
);
create index idx_keyword_stats_ws_date on public.keyword_daily_stats(workspace_id, date);
create index idx_keyword_stats_campaign on public.keyword_daily_stats(workspace_id, campaign_id, date);
create trigger trg_keyword_stats_updated_at
  before update on public.keyword_daily_stats
  for each row execute function public.set_updated_at();

create table public.geographic_daily_stats (
  workspace_id          uuid not null references public.workspaces(id) on delete cascade,
  date                  date not null,
  customer_id           bigint not null,
  campaign_id           bigint not null,
  country_criterion_id  bigint not null,
  device                text,
  impressions           bigint not null default 0,
  clicks                bigint not null default 0,
  spend                 numeric(14,2) not null default 0,
  conversions           numeric(14,2) not null default 0,
  conversion_value      numeric(16,2) not null default 0,
  currency              char(3),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  primary key (workspace_id, date, customer_id, campaign_id, country_criterion_id, device)
);
create index idx_geographic_stats_ws_date on public.geographic_daily_stats(workspace_id, date);
create index idx_geographic_stats_campaign on public.geographic_daily_stats(workspace_id, campaign_id, date);
create trigger trg_geographic_stats_updated_at
  before update on public.geographic_daily_stats
  for each row execute function public.set_updated_at();

create table public.google_ads_recommendation_snapshots (
  workspace_id                uuid not null references public.workspaces(id) on delete cascade,
  customer_id                 bigint not null,
  resource_name               text not null,
  recommendation_type         text,
  campaign_resource_name      text,
  base_cost                   numeric(14,2) not null default 0,
  potential_cost              numeric(14,2) not null default 0,
  base_conversions            numeric(14,2) not null default 0,
  potential_conversions       numeric(14,2) not null default 0,
  base_conversion_value       numeric(16,2) not null default 0,
  potential_conversion_value  numeric(16,2) not null default 0,
  synced_at                   timestamptz not null default now(),
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  primary key (workspace_id, customer_id, resource_name)
);
create index idx_google_ads_recommendations_ws_type on public.google_ads_recommendation_snapshots(workspace_id, recommendation_type);
create trigger trg_google_ads_recommendations_updated_at
  before update on public.google_ads_recommendation_snapshots
  for each row execute function public.set_updated_at();

create table public.google_ads_change_events (
  workspace_id          uuid not null references public.workspaces(id) on delete cascade,
  customer_id           bigint not null,
  resource_name         text not null,
  change_date_time      timestamptz not null,
  change_resource_type  text,
  changed_fields        text,
  client_type           text,
  user_email            text,
  old_resource          jsonb,
  new_resource          jsonb,
  created_at            timestamptz not null default now(),
  primary key (workspace_id, customer_id, resource_name)
);
create index idx_google_ads_change_events_ws_time on public.google_ads_change_events(workspace_id, change_date_time desc);
create index idx_google_ads_change_events_type on public.google_ads_change_events(workspace_id, change_resource_type);

alter table public.google_ads_customers                 enable row level security;
alter table public.google_ads_conversion_actions       enable row level security;
alter table public.search_term_daily_stats             enable row level security;
alter table public.keyword_daily_stats                 enable row level security;
alter table public.geographic_daily_stats              enable row level security;
alter table public.google_ads_recommendation_snapshots enable row level security;
alter table public.google_ads_change_events            enable row level security;

create policy google_ads_customers_select on public.google_ads_customers
  for select using (public.is_workspace_member(workspace_id));
create policy google_ads_conversion_actions_select on public.google_ads_conversion_actions
  for select using (public.is_workspace_member(workspace_id));
create policy search_term_stats_select on public.search_term_daily_stats
  for select using (public.is_workspace_member(workspace_id));
create policy keyword_stats_select on public.keyword_daily_stats
  for select using (public.is_workspace_member(workspace_id));
create policy geographic_stats_select on public.geographic_daily_stats
  for select using (public.is_workspace_member(workspace_id));
create policy google_ads_recommendation_snapshots_select on public.google_ads_recommendation_snapshots
  for select using (public.is_workspace_member(workspace_id));
create policy google_ads_change_events_select on public.google_ads_change_events
  for select using (public.is_workspace_member(workspace_id));
