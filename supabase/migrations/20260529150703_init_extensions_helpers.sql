-- ════════════════════════════════════════════════════════════════════════
-- 0001 · Extensions, enums, and shared helper functions
-- ════════════════════════════════════════════════════════════════════════

-- Install into the `extensions` schema (Supabase convention; keeps `public` clean
-- and avoids the "extension in public" security-advisor lint). `extensions` is on
-- the default search_path for the postgres/anon/authenticated roles.
create extension if not exists "pgcrypto" with schema extensions;  -- gen_random_uuid(), digest()
create extension if not exists "citext"   with schema extensions;  -- case-insensitive text

-- ── Enums ──────────────────────────────────────────────────────────────────
create type member_role          as enum ('owner', 'admin', 'member', 'viewer');
create type business_type        as enum ('ecommerce', 'affiliate', 'agency', 'brand', 'dropshipping');
create type vat_mode             as enum ('inclusive', 'exclusive', 'unknown');
create type connection_provider  as enum ('google_ads', 'merchant_center');
create type connection_status    as enum ('active', 'needs_reauth', 'revoked', 'error');
create type sync_kind            as enum ('backfill', 'daily', 'lag_repull', 'intraday', 'manual');
create type sync_status          as enum ('queued', 'running', 'success', 'partial', 'failed');
create type entity_type          as enum ('account', 'campaign', 'ad_group', 'product', 'category');
create type recommendation_kind  as enum (
  'scale', 'keep', 'watch', 'fix', 'reduce', 'exclude', 'pause', 'needs_more_data',
  'good_roas_bad_profit', 'wasted_spend', 'tracking_issue', 'feed_issue', 'low_margin_pmax'
);
create type recommendation_severity as enum ('info', 'low', 'medium', 'high', 'critical');
create type recommendation_status   as enum ('open', 'acknowledged', 'applied', 'dismissed', 'expired');
create type confidence_level         as enum ('low', 'medium', 'high');
create type subscription_plan        as enum ('free', 'starter', 'growth', 'agency');
create type subscription_status      as enum ('trialing', 'active', 'past_due', 'canceled', 'incomplete');

-- ── updated_at trigger helper ───────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- NOTE: the tenancy guard functions (is_workspace_member, has_workspace_role)
-- live in 0002, after public.workspace_members exists — LANGUAGE sql bodies are
-- validated at CREATE time, so the referenced table must already be present.
