-- ════════════════════════════════════════════════════════════════════════
-- 0008 · Security & performance hardening (Supabase advisor-driven)
--
-- Addresses:
--   • function_search_path_mutable  → pin set_updated_at search_path
--   • auth_rls_initplan             → wrap inlined auth.uid() as (select auth.uid())
--   • unindexed_foreign_keys        → add covering indexes
--
-- Deferred to a later, separately-verified pass (tracked, low real risk):
--   • SECURITY DEFINER RPC exposure → move guard fns to a non-exposed `private`
--     schema (requires rewiring ~all policies + triggers).
--   • multiple_permissive_policies  → split FOR ALL write policies into
--     insert/update/delete so they don't overlap the FOR SELECT policy.
-- ════════════════════════════════════════════════════════════════════════

-- A. Pin search_path on the updated_at trigger helper. now() resolves from
--    pg_catalog (always implicitly in path), so an empty search_path is safe.
alter function public.set_updated_at() set search_path = '';

-- C. Cache auth.uid() once per statement in policies that inline it. The boolean
--    logic is identical; this just avoids per-row re-evaluation at scale.
alter policy profiles_select on public.profiles
  using (id = (select auth.uid()) or public.shares_workspace_with(id));
alter policy profiles_insert on public.profiles
  with check (id = (select auth.uid()));
alter policy profiles_update on public.profiles
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
alter policy workspaces_insert on public.workspaces
  with check (created_by = (select auth.uid()));
alter policy ai_threads_rw on public.ai_threads
  using (user_id = (select auth.uid()) and public.is_workspace_member(workspace_id))
  with check (user_id = (select auth.uid()) and public.is_workspace_member(workspace_id));
alter policy ai_messages_rw on public.ai_messages
  using (exists (select 1 from public.ai_threads t
                 where t.id = ai_messages.thread_id and t.user_id = (select auth.uid())))
  with check (exists (select 1 from public.ai_threads t
                      where t.id = ai_messages.thread_id and t.user_id = (select auth.uid())));

-- E. Covering indexes for the foreign keys flagged by the performance advisor.
create index if not exists idx_workspaces_created_by          on public.workspaces(created_by);
create index if not exists idx_oauth_connections_connected_by on public.oauth_connections(connected_by);
create index if not exists idx_oauth_secrets_workspace        on public.oauth_secrets(workspace_id);
create index if not exists idx_sync_runs_connection           on public.sync_runs(connection_id);
create index if not exists idx_ai_threads_user                on public.ai_threads(user_id);
create index if not exists idx_ai_messages_workspace          on public.ai_messages(workspace_id);
create index if not exists idx_audit_actor                    on public.audit_log(actor_user_id);
