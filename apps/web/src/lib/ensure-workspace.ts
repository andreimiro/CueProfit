import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type EnsureWorkspaceResult =
  | { ok: true; workspaceId: string }
  | { ok: false; redirect: string };

/**
 * Guarantee the signed-in user has a personal workspace + owner membership.
 *
 * Uses the service role for bootstrap because RLS on `workspaces` SELECT can
 * block insert+returning for brand-new tenants before membership is visible
 * to the user-scoped client.
 */
export async function ensurePersonalWorkspace(userId: string): Promise<EnsureWorkspaceResult> {
  const supabase = await createClient();
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (membership?.workspace_id) {
    return { ok: true, workspaceId: membership.workspace_id };
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: false, redirect: "/dashboard?connect=no_workspace" };
  }

  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("workspaces")
    .select("id")
    .eq("created_by", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  let workspaceId = existing?.id;

  if (!workspaceId) {
    const { data: created, error } = await admin
      .from("workspaces")
      .insert({
        name: "Personal workspace",
        currency: "RON",
        created_by: userId,
      })
      .select("id")
      .single();

    if (error || !created?.id) {
      return { ok: false, redirect: "/dashboard?connect=no_workspace" };
    }
    workspaceId = created.id;
  }

  const { error: memberError } = await admin.from("workspace_members").upsert(
    {
      workspace_id: workspaceId,
      user_id: userId,
      role: "owner",
    },
    { onConflict: "workspace_id,user_id" },
  );

  if (memberError) {
    return { ok: false, redirect: "/dashboard?connect=no_workspace" };
  }

  return { ok: true, workspaceId };
}
