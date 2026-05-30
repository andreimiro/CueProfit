"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export async function triggerWorkspaceSync(
  workspaceId: string,
): Promise<{ ok: true; queued: boolean } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Not signed in" };
  }

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("workspace_id", workspaceId)
    .limit(1)
    .maybeSingle();

  if (!membership) {
    return { ok: false, error: "Workspace not found" };
  }

  const apiUrl = process.env.PYTHON_API_URL;
  const token = process.env.PYTHON_API_INTERNAL_TOKEN;
  if (!apiUrl || !token) {
    return { ok: false, error: "Sync is not configured on this deployment" };
  }

  const res = await fetch(`${apiUrl}/internal/workspaces/${workspaceId}/sync`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ mode: "daily" }),
    cache: "no-store",
  });

  if (!res.ok) {
    return { ok: false, error: "Could not start sync — try again in a minute" };
  }

  const body = (await res.json().catch(() => ({}))) as { queued?: boolean };
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/campaigns");
  revalidatePath("/dashboard/products");

  return { ok: true, queued: body.queued !== false };
}
