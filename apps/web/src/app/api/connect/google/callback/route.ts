import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

// Google redirects here with ?code&state (or ?error). We require the same
// authenticated session that started the flow, plus the matching nonce cookie,
// then hand everything to the API (which re-verifies the signed state).
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const jar = await cookies();
  const nonce = jar.get("cp_oauth_nonce")?.value;

  const fail = () => {
    const r = NextResponse.redirect(new URL("/dashboard?connect=error", request.url));
    r.cookies.delete("cp_oauth_nonce");
    return r;
  };
  if (oauthError || !code || !state || !nonce) {
    return fail();
  }

  const res = await fetch(`${process.env.PYTHON_API_URL}/connect/google/callback`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.PYTHON_API_INTERNAL_TOKEN}`,
    },
    body: JSON.stringify({ code, state, caller_user_id: user.id, nonce }),
    cache: "no-store",
  });

  const dest = res.ok ? "/dashboard?connect=success" : "/dashboard?connect=error";
  const response = NextResponse.redirect(new URL(dest, request.url));
  response.cookies.delete("cp_oauth_nonce");
  return response;
}
