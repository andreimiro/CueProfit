-- ════════════════════════════════════════════════════════════════════════
-- 0003 · Data-source connections + secret storage
--   oauth_connections : client-readable connection metadata
--   oauth_secrets      : KMS-encrypted refresh tokens — service_role ONLY
-- ════════════════════════════════════════════════════════════════════════

create table public.oauth_connections (
  id                  uuid primary key default gen_random_uuid(),
  workspace_id        uuid not null references public.workspaces(id) on delete cascade,
  provider            connection_provider not null,
  external_account_id text not null,                  -- Google Ads customer_id / Merchant merchant_id
  login_customer_id   text,                            -- MCC (Google Ads manager) if applicable
  display_name        text,
  scopes              text[] not null default '{}',
  status              connection_status not null default 'active',
  token_expires_at    timestamptz,                     -- cached access-token expiry
  last_synced_at      timestamptz,
  last_refresh_at     timestamptz,
  last_error          text,
  connected_by        uuid references auth.users(id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (workspace_id, provider, external_account_id)
);
create index idx_oauth_connections_ws on public.oauth_connections(workspace_id);
create trigger trg_oauth_connections_updated_at
  before update on public.oauth_connections
  for each row execute function public.set_updated_at();

-- Secrets live in a separate table that NO client role can read. Only the
-- service_role (used by FastAPI + workers, which bypass RLS) touches it.
create table public.oauth_secrets (
  connection_id           uuid primary key references public.oauth_connections(id) on delete cascade,
  workspace_id            uuid not null references public.workspaces(id) on delete cascade,
  encrypted_refresh_token bytea not null,              -- Cloud KMS envelope ciphertext
  kms_key_version         text not null,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
create trigger trg_oauth_secrets_updated_at
  before update on public.oauth_secrets
  for each row execute function public.set_updated_at();

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table public.oauth_connections enable row level security;
alter table public.oauth_secrets      enable row level security;

-- oauth_connections: members read; owners/admins manage (server uses service_role).
create policy oauth_connections_select on public.oauth_connections
  for select using (public.is_workspace_member(workspace_id));
create policy oauth_connections_write on public.oauth_connections
  for all
  using (public.has_workspace_role(workspace_id, array['owner','admin']::member_role[]))
  with check (public.has_workspace_role(workspace_id, array['owner','admin']::member_role[]));

-- oauth_secrets: RLS enabled with NO policy ⇒ unreachable by anon/authenticated.
-- Only the service_role (which bypasses RLS) can access refresh tokens.
revoke all on public.oauth_secrets from anon, authenticated;
