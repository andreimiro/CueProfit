-- ════════════════════════════════════════════════════════════════════════
-- 0004 · Product catalog, costs, and identity resolution
-- ════════════════════════════════════════════════════════════════════════

-- ── products (synced from Merchant Center / feed import) ─────────────────────
create table public.products (
  id                  uuid primary key default gen_random_uuid(),
  workspace_id        uuid not null references public.workspaces(id) on delete cascade,
  merchant_product_id text,                    -- e.g. "online:en:RO:SKU123"
  offer_id            text,                    -- seller offer id (a.k.a. ads item_id)
  sku                 text,
  gtin                text,
  mpn                 text,
  title               text,
  brand               text,
  category            text,                    -- Google product category / custom
  product_type        text,
  price               numeric(12,2),
  sale_price          numeric(12,2),
  currency            char(3),
  availability        text,
  condition           text,
  image_url           text,
  landing_url         text,
  status              text,                    -- merchant processed status
  custom_label_0      text,
  custom_label_1      text,
  custom_label_2      text,
  custom_label_3      text,
  custom_label_4      text,
  raw                 jsonb,                   -- full source payload for reprocessing
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (workspace_id, merchant_product_id)
);
create index idx_products_ws_offer on public.products(workspace_id, offer_id);
create index idx_products_ws_sku   on public.products(workspace_id, sku);
create index idx_products_ws_gtin  on public.products(workspace_id, gtin);
create trigger trg_products_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- ── product_costs (uploaded/manual; effective-dated for historical accuracy) ─
create table public.product_costs (
  id                uuid primary key default gen_random_uuid(),
  workspace_id      uuid not null references public.workspaces(id) on delete cascade,
  product_id        uuid references public.products(id) on delete set null,  -- resolved link
  match_key         text not null,             -- identifier the user supplied
  match_key_type    text not null default 'offer_id', -- offer_id|sku|gtin|product_id
  cost_of_goods     numeric(12,2),
  shipping_cost     numeric(12,2),
  packaging_cost    numeric(12,2),
  other_cost        numeric(12,2),
  payment_fee_rate  numeric(6,4),
  vat_rate          numeric(6,4),
  return_rate       numeric(6,4),
  commission_rate   numeric(6,4),
  validation_rate   numeric(6,4),
  target_margin     numeric(6,4),
  source            text not null default 'upload',  -- upload|manual|default
  effective_from    date not null default current_date,
  effective_to      date,                      -- null ⇒ currently in effect
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index idx_product_costs_ws_key on public.product_costs(workspace_id, match_key);
create index idx_product_costs_product on public.product_costs(product_id);
create trigger trg_product_costs_updated_at
  before update on public.product_costs
  for each row execute function public.set_updated_at();

-- ── product_identity_map (Ads item_id → canonical product) ───────────────────
create table public.product_identity_map (
  id                  uuid primary key default gen_random_uuid(),
  workspace_id        uuid not null references public.workspaces(id) on delete cascade,
  product_id          uuid references public.products(id) on delete set null,
  ads_item_id         text not null,           -- id seen in Ads shopping/PMax reports
  merchant_product_id text,
  offer_id            text,
  sku                 text,
  gtin                text,
  landing_url         text,
  normalized_title    text,
  match_method        text,                    -- offer_id|item_id|sku|gtin|landing_url|title|manual
  match_confidence    numeric(4,3),            -- 0..1
  is_manual           boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (workspace_id, ads_item_id)
);
create index idx_identity_map_product on public.product_identity_map(product_id);
create trigger trg_identity_map_updated_at
  before update on public.product_identity_map
  for each row execute function public.set_updated_at();

-- ── RLS (members read; editors = owner/admin/member write; viewers read-only) ─
alter table public.products             enable row level security;
alter table public.product_costs        enable row level security;
alter table public.product_identity_map enable row level security;

create policy products_select on public.products
  for select using (public.is_workspace_member(workspace_id));
create policy products_write on public.products
  for all using (public.has_workspace_role(workspace_id, array['owner','admin','member']::member_role[]))
  with check (public.has_workspace_role(workspace_id, array['owner','admin','member']::member_role[]));

create policy product_costs_select on public.product_costs
  for select using (public.is_workspace_member(workspace_id));
create policy product_costs_write on public.product_costs
  for all using (public.has_workspace_role(workspace_id, array['owner','admin','member']::member_role[]))
  with check (public.has_workspace_role(workspace_id, array['owner','admin','member']::member_role[]));

create policy identity_map_select on public.product_identity_map
  for select using (public.is_workspace_member(workspace_id));
create policy identity_map_write on public.product_identity_map
  for all using (public.has_workspace_role(workspace_id, array['owner','admin','member']::member_role[]))
  with check (public.has_workspace_role(workspace_id, array['owner','admin','member']::member_role[]));
