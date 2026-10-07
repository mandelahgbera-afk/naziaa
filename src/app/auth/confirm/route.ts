import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/* Lands password-reset (and other auth) links: swaps the one-time code for a
   session, then continues to `next` (only paths on this site are allowed). */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const nextParam = url.searchParams.get("next") ?? "/account/password";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/account/password";

  const supabase = await supabaseServer();
  let ok = false;
  if (code) ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  else if (tokenHash && type) ok = !(await supabase.auth.verifyOtp({ token_hash: tokenHash, type: type as "recovery" | "email" })).error;

  return NextResponse.redirect(new URL(ok ? next : "/account/password?expired=1", url.origin));
}
