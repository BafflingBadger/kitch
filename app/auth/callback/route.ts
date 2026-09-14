import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { mirrorProviderAvatar } from "@/lib/auth/mirror-avatar";
import { safeRedirectPath } from "@/lib/auth/redirect";

/**
 * OAuth (and PKCE email confirmation) landing route. Exchanges the `code` for a
 * session, then rehosts the provider's avatar before handing off to the app.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeRedirectPath(searchParams.get("next"));

  // The provider reports user-facing failures (denied consent, bad config) here
  // rather than sending a code.
  const oauthError =
    searchParams.get("error_description") ?? searchParams.get("error");
  if (oauthError) {
    return NextResponse.redirect(
      `${origin}/auth/error?error=${encodeURIComponent(oauthError)}`,
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${origin}/auth/error?error=${encodeURIComponent("No auth code provided")}`,
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      `${origin}/auth/error?error=${encodeURIComponent(error.message)}`,
    );
  }

  if (data.user) {
    await mirrorProviderAvatar(supabase, data.user.id);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
