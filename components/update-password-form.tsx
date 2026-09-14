"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AuthCard, AuthError, AuthLabel } from "@/components/auth/auth-card";
import { PasswordInput } from "@/components/auth/password-input";
import {
  authLinkClassName,
  authPrimaryButtonClassName,
} from "@/components/auth/styles";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { DEFAULT_AUTH_REDIRECT } from "@/lib/auth/redirect";
import { validatePassword } from "@/lib/auth/validation";

type LinkStatus = "checking" | "valid" | "invalid";

/**
 * Session methods that mean the user signed in normally, rather than arriving
 * from a password recovery link.
 *
 * Written as a denylist rather than a check for "recovery" on purpose. The two
 * failure directions are not symmetric: wrongly allowing a change lets someone
 * with a borrowed session take over an account, but wrongly blocking one leaves
 * a locked-out user with no way back in. If GoTrue ever labels a recovery
 * session with a method not listed here, it falls through to allowed.
 */
const NORMAL_LOGIN_METHODS = new Set([
  "password",
  "oauth",
  "totp",
  "mfa/totp",
  "sso/saml",
  "anonymous",
]);

type AmrEntry = { method?: unknown; timestamp?: unknown };

/** The method the session most recently authenticated with, if we can tell. */
function latestAuthMethod(amr: unknown): string | null {
  if (!Array.isArray(amr)) return null;
  const entries = amr as AmrEntry[];
  const newest = entries
    .slice()
    .sort(
      (a, b) =>
        (typeof b?.timestamp === "number" ? b.timestamp : 0) -
        (typeof a?.timestamp === "number" ? a.timestamp : 0),
    )[0];
  return typeof newest?.method === "string" ? newest.method : null;
}

/**
 * Reads the failure GoTrue reports when a recovery link is rejected.
 *
 * Recovery tokens are single-use, so a link that has already been opened comes
 * back as `403 Email link is invalid or has expired`. GoTrue still redirects
 * here, carrying the reason -- in the query string for the PKCE flow, and in the
 * URL fragment for the implicit one, so both are checked.
 */
function readLinkError(): string | null {
  if (typeof window === "undefined") return null;

  const query = new URLSearchParams(window.location.search);
  const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const description =
    query.get("error_description") ?? fragment.get("error_description");
  const code = query.get("error") ?? fragment.get("error");

  if (!description && !code) return null;
  return description ?? "This password reset link is invalid or has expired.";
}

export function UpdatePasswordForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<LinkStatus>("checking");
  const [linkError, setLinkError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fromUrl = readLinkError();
    if (fromUrl) {
      setLinkError(fromUrl);
      setStatus("invalid");
      return;
    }

    let active = true;
    const supabase = createClient();

    // The authoritative signal, but it is emitted while the client consumes the
    // URL, which can happen before this effect subscribes -- so it confirms a
    // recovery session without being the only thing that can.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (active && event === "PASSWORD_RECOVERY") setStatus("valid");
    });

    // Race-free fallback: the session's own claims say how it was created.
    supabase.auth.getClaims().then(({ data }) => {
      if (!active) return;

      const claims = data?.claims as { amr?: unknown } | undefined;
      if (!claims) {
        // No session at all -- the link was never valid, or was already used.
        setStatus((current) => (current === "valid" ? current : "invalid"));
        return;
      }

      const method = latestAuthMethod(claims.amr);
      const isNormalLogin = method !== null && NORMAL_LOGIN_METHODS.has(method);
      setStatus((current) =>
        current === "valid" ? current : isNormalLogin ? "invalid" : "valid",
      );
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const passwordError = validatePassword(password, {
      emptyMessage: "Please enter a new password.",
    });
    if (passwordError) {
      setError(passwordError);
      return;
    }

    const supabase = createClient();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      setPassword("");

      router.push(DEFAULT_AUTH_REDIRECT);
      router.refresh();
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  if (status === "checking") {
    return (
      <AuthCard title="Reset Password">
        <p className="text-center text-sm text-kitch-grey">Checking your link...</p>
      </AuthCard>
    );
  }

  if (status === "invalid") {
    return (
      <AuthCard title="Link Expired">
        <p className="text-center text-sm text-kitch-grey">
          {linkError ??
            "This password reset link is invalid or has expired. Reset links can only be used once."}
        </p>
        <p className="mt-7 text-center text-sm text-kitch-charcoal">
          <Link href="/auth/forgot-password" className={authLinkClassName}>
            Request a new link.
          </Link>
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Reset Password"
      description="Choose a new password for your account."
    >
      <form
        onSubmit={handleUpdatePassword}
        noValidate
        className="flex flex-col gap-6"
      >
        <div className="flex flex-col gap-2">
          <AuthLabel htmlFor="password">New password</AuthLabel>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            placeholder="New password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error ? <AuthError message={error} /> : null}

        <Button
          type="submit"
          disabled={isLoading}
          className={authPrimaryButtonClassName}
        >
          {isLoading ? "Saving..." : "Save new password"}
        </Button>
      </form>
    </AuthCard>
  );
}
