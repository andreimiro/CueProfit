import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

// Authenticates the user, mints a per-flow nonce (bound into the signed state
// and stored in an HttpOnly cookie), gets a Google consent URL, and redirects.
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { data: memberships } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .limit(1);
  let workspaceId = (memberships?.[0] as { workspace_id?: string } | undefined)?.workspace_id;
  if (!workspaceId) {
    const { data: workspace, error } = await supabase
      .from("workspaces")
      .insert({
        name: "Personal workspace",
        currency: "RON",
        created_by: user.id,
      })
      .select("id")
      .single();

    workspaceId = (workspace as { id?: string } | null)?.id;
    if (error || !workspaceId) {
      return NextResponse.redirect(new URL("/dashboard?connect=no_workspace", request.url));
    }
  }

  const nonce = crypto.randomUUID();
  const res = await fetch(`${process.env.PYTHON_API_URL}/connect/google/start`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.PYTHON_API_INTERNAL_TOKEN}`,
    },
    body: JSON.stringify({
      workspace_id: workspaceId,
      user_id: user.id,
      nonce,
      provider: "google_ads",
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    return NextResponse.redirect(new URL("/dashboard?connect=error", request.url));
  }

  const { auth_url } = (await res.json()) as { auth_url: string };
  // Defense-in-depth: only ever redirect to Google's consent host.
  if (!auth_url.startsWith("https://accounts.google.com/")) {
    return NextResponse.redirect(new URL("/dashboard?connect=error", request.url));
  }

  const response = NextResponse.redirect(auth_url);
  response.cookies.set("cp_oauth_nonce", nonce, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/connect",
    maxAge: 600,
  });
  return response;
}
