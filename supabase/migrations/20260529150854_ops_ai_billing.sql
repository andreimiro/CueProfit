-- ════════════════════════════════════════════════════════════════════════
-- 0007 · Ops (sync_runs, audit_log), AI (threads, messages), billing
-- ════════════════════════════════════════════════════════════════════════

-- ── sync_runs (pipeline observability + incremental cursor) ──────────────────
create table public.sync_runs (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  connection_id uuid references public.oauth_connections(id) on delete set null,
  provider      connection_provider not null,
  kind          sync_kind not null,
  status        sync_status not null default 'queued',
  started_at    timestamptz,
  finished_at   timestamptz,
  rows_written  bigint not null default 0,
  cursor        jsonb,                         -- incremental state (date watermark etc.)
  error         text,
  created_at    timestamptz not null default now()
);
create index idx_sync_runs_ws on public.sync_runs(workspace_id, created_at desc);

-- ── audit_log ────────────────────────────────────────────────────────────────
create table public.audit_log (
  id           bigint generated always as identity primary key,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  action       text not null,
  target_type  text,
  target_id    text,
  metadata     jsonb,
  created_at   timestamptz not null default now()
);
create index idx_audit_ws on public.audit_log(workspace_id, created_at desc);

-- ── ai_threads / ai_messages ─────────────────────────────────────────────────
create table public.ai_threads (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  title        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index idx_ai_threads_ws_user on public.ai_threads(workspace_id, user_id);
create trigger trg_ai_threads_updated_at
  before update on public.ai_threads
  for each row execute function public.set_updated_at();

create table public.ai_messages (
  id                 uuid primary key default gen_random_uuid(),
  thread_id          uuid not null references public.ai_threads(id) on delete cascade,
  workspace_id       uuid not null references public.workspaces(id) on delete cascade,
  role               text not null,            -- user | assistant | tool
  content            text,
  structured_context jsonb,                    -- aggregated, non-PII context sent to model
  tool_calls         jsonb,
  token_usage        jsonb,                    -- {model, prompt, completion, cost_usd} for metering
  created_at         timestamptz not null default now()
);
create index idx_ai_messages_thread on public.ai_messages(thread_id, created_at);

-- ── subscriptions (Stripe-backed; written by webhook via service_role) ───────
create table public.subscriptions (
  workspace_id           uuid primary key references public.workspaces(id) on delete cascade,
  plan                   subscription_plan not null default 'free',
  status                 subscription_status not null default 'trialing',
  stripe_customer_id     text,
  stripe_subscription_id text,
  seats                  int not null default 1,
  current_period_end     timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create trigger trg_subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table public.sync_runs     enable row level security;
alter table public.audit_log     enable row level security;
alter table public.ai_threads    enable row level security;
alter table public.ai_messages   enable row level security;
alter table public.subscriptions enable row level security;

create policy sync_runs_select on public.sync_runs
  for select using (public.is_workspace_member(workspace_id));

-- audit log readable by admins/owners only.
create policy audit_select on public.audit_log
  for select using (public.has_workspace_role(workspace_id, array['owner','admin']::member_role[]));

-- AI threads/messages are private to the creating user (within their workspace).
create policy ai_threads_rw on public.ai_threads
  for all using (user_id = auth.uid() and public.is_workspace_member(workspace_id))
  with check (user_id = auth.uid() and public.is_workspace_member(workspace_id));

create policy ai_messages_rw on public.ai_messages
  for all using (exists (
    select 1 from public.ai_threads t
    where t.id = ai_messages.thread_id and t.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.ai_threads t
    where t.id = ai_messages.thread_id and t.user_id = auth.uid()
  ));

create policy subscriptions_select on public.subscriptions
  for select using (public.is_workspace_member(workspace_id));
