-- ════════════════════════════════════════════════════════════════════════
-- 0002 · Core tenancy: profiles, workspaces, members (+ RLS)
-- ════════════════════════════════════════════════════════════════════════

-- ── profiles (1:1 with auth.users) ──────────────────────────────────────────
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       citext,
  full_name   text,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-provision a profile row whenever a Supabase auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── workspaces (the tenant) ─────────────────────────────────────────────────
create table public.workspaces (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  slug                citext unique,
  currency            char(3) not null default 'EUR',          -- ISO 4217
  business_type       business_type not null default 'ecommerce',
  vat_mode            vat_mode not null default 'unknown',

  -- Default assumptions applied when product-level data is missing.
  default_margin_rate        numeric(6,4),                      -- 0..1
  default_shipping_cost      numeric(12,2),
  default_return_rate        numeric(6,4) not null default 0,   -- 0..1
  default_payment_fee_rate   numeric(6,4) not null default 0,   -- 0..1
  default_commission_rate    numeric(6,4),                      -- affiliate
  default_validation_rate    numeric(6,4) not null default 1,   -- 0..1
  default_vat_rate           numeric(6,4) not null default 0,   -- 0..1
  target_poas                numeric(8,2),
  target_net_margin          numeric(6,4),

  created_by          uuid references auth.users(id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create trigger trg_workspaces_updated_at
  before update on public.workspaces
  for each row execute function public.set_updated_at();

-- ── workspace_members (user ↔ workspace, with role) ─────────────────────────
create table public.workspace_members (
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  role          member_role not null default 'member',
  created_at    timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
create index idx_workspace_members_user on public.workspace_members(user_id);

-- After a workspace is created, enroll its creator as owner.
create or replace function public.handle_new_workspace()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.created_by is not null then
    insert into public.workspace_members (workspace_id, user_id, role)
    values (new.id, new.created_by, 'owner')
    on conflict do nothing;
  end if;
  return new;
end;
$$;

create trigger on_workspace_created
  after insert on public.workspaces
  for each row execute function public.handle_new_workspace();

-- ── Tenancy guards (SECURITY DEFINER ⇒ bypass RLS to avoid policy recursion) ─
-- Defined here (not 0001) because LANGUAGE sql bodies are validated against
-- public.workspace_members at CREATE time, so the table must exist first.
create or replace function public.is_workspace_member(_workspace_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = _workspace_id
      and wm.user_id = auth.uid()
  );
$$;

create or replace function public.has_workspace_role(_workspace_id uuid, _roles member_role[])
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = _workspace_id
      and wm.user_id = auth.uid()
      and wm.role = any(_roles)
  );
$$;

-- Helper: does the current user share any workspace with _user_id?
create or replace function public.shares_workspace_with(_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.workspace_members a
    join public.workspace_members b on a.workspace_id = b.workspace_id
    where a.user_id = auth.uid()
      and b.user_id = _user_id
  );
$$;

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table public.profiles          enable row level security;
alter table public.workspaces         enable row level security;
alter table public.workspace_members  enable row level security;

-- profiles: see self + co-members; edit only self.
create policy profiles_select on public.profiles
  for select using (id = auth.uid() or public.shares_workspace_with(id));
create policy profiles_insert on public.profiles
  for insert with check (id = auth.uid());
create policy profiles_update on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- workspaces: members read; any authed user creates; admins update; owners delete.
create policy workspaces_select on public.workspaces
  for select using (public.is_workspace_member(id));
create policy workspaces_insert on public.workspaces
  for insert with check (created_by = auth.uid());
create policy workspaces_update on public.workspaces
  for update using (public.has_workspace_role(id, array['owner','admin']::member_role[]))
  with check (public.has_workspace_role(id, array['owner','admin']::member_role[]));
create policy workspaces_delete on public.workspaces
  for delete using (public.has_workspace_role(id, array['owner']::member_role[]));

-- workspace_members: members read; admins/owners manage.
create policy members_select on public.workspace_members
  for select using (public.is_workspace_member(workspace_id));
create policy members_insert on public.workspace_members
  for insert with check (public.has_workspace_role(workspace_id, array['owner','admin']::member_role[]));
create policy members_update on public.workspace_members
  for update using (public.has_workspace_role(workspace_id, array['owner','admin']::member_role[]))
  with check (public.has_workspace_role(workspace_id, array['owner','admin']::member_role[]));
create policy members_delete on public.workspace_members
  for delete using (public.has_workspace_role(workspace_id, array['owner','admin']::member_role[]));
