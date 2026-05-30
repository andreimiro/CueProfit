import { NextResponse } from "next/server";

import { getWorkspaceForConnect } from "@/lib/workspace";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  return startConnect(request);
}

async function startConnect(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const workspace = await getWorkspaceForConnect(supabase, user.id, request.url);
  if (!workspace.ok) {
    return NextResponse.redirect(new URL(workspace.redirect, request.url));
  }

  const nonce = crypto.randomUUID();
  const res = await fetch(`${process.env.PYTHON_API_URL}/connect/merchant/start`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.PYTHON_API_INTERNAL_TOKEN}`,
    },
    body: JSON.stringify({
      workspace_id: workspace.workspaceId,
      user_id: user.id,
      nonce,
      provider: "merchant_center",
      login_hint: user.email ?? undefined,
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    return NextResponse.redirect(new URL("/dashboard?merchant=error", request.url));
  }

  const { auth_url } = (await res.json()) as { auth_url: string };
  if (!auth_url.startsWith("https://accounts.google.com/")) {
    return NextResponse.redirect(new URL("/dashboard?merchant=error", request.url));
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
