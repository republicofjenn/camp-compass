import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Where Supabase's confirmation email link points (see emailRedirectTo in
// src/app/actions/auth.ts). Verifies the token and establishes a real
// session, then sends the person somewhere that explains what just
// happened -- landing them silently on /kids with no session (the previous
// behavior) is exactly the confusing flow this replaces.
//
// Handles both flows Supabase might use, since which one applies depends on
// project config: PKCE (a `code` param, exchanged via
// exchangeCodeForSession -- confirmed via this project's auth.users having
// "pkce_"-prefixed confirmation_token values) and the older token_hash+type
// OTP flow (verifyOtp). Checking both makes this robust either way rather
// than assuming one.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/kids";

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}?confirmed=1`);
    }
  } else if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}?confirmed=1`);
    }
  }

  return NextResponse.redirect(`${origin}/login?confirm_error=1`);
}
