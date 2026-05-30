import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

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
    const r = NextResponse.redirect(new URL("/dashboard?merchant=error", request.url));
    r.cookies.delete("cp_oauth_nonce");
    return r;
  };
  if (oauthError || !code || !state || !nonce) {
    return fail();
  }

  const res = await fetch(`${process.env.PYTHON_API_URL}/connect/merchant/callback`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.PYTHON_API_INTERNAL_TOKEN}`,
    },
    body: JSON.stringify({ code, state, caller_user_id: user.id, nonce }),
    cache: "no-store",
  });

  const dest = res.ok ? "/dashboard?merchant=success" : "/dashboard?merchant=error";
  const response = NextResponse.redirect(new URL(dest, request.url));
  response.cookies.delete("cp_oauth_nonce");
  return response;
}
