"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AuthCard, AuthError, AuthLabel } from "@/components/auth/auth-card";
import { PasswordInput } from "@/components/auth/password-input";
import { SocialButtons } from "@/components/auth/social-buttons";
import {
  authInputClassName,
  authLinkClassName,
  authPrimaryButtonClassName,
} from "@/components/auth/styles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { DEFAULT_AUTH_REDIRECT } from "@/lib/auth/redirect";
import { validateEmail, validatePassword } from "@/lib/auth/validation";

const MAX_DISPLAY_NAME_LENGTH = 50;

export function SignUpForm() {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = displayName.trim();
    if (!trimmedName) {
      setError("Please enter a display name.");
      return;
    }

    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
      return;
    }

    const passwordError = validatePassword(password, {
      emptyMessage: "Please choose a password.",
    });
    if (passwordError) {
      setError(passwordError);
      return;
    }

    const supabase = createClient();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // Read by the `User_AfterInsert` trigger to seed public.users
          // display_name, and to derive a unique username from it.
          data: { display_name: trimmedName },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(
            DEFAULT_AUTH_REDIRECT,
          )}`,
        },
      });
      if (error) throw error;

      // See the note in login-form: this instance can outlive the navigation.
      setDisplayName("");
      setEmail("");
      setPassword("");

      // Email confirmation is off, so sign-up returns a live session. Fall back
      // to the confirmation screen if that ever changes.
      if (data.session) {
        router.push(DEFAULT_AUTH_REDIRECT);
        router.refresh();
      } else {
        router.push("/auth/sign-up-success");
      }
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthCard
      title="Create Account"
      description="Join Kitch and start building your cookbook."
    >
      <form onSubmit={handleSignUp} noValidate className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <AuthLabel htmlFor="display-name">Display name</AuthLabel>
          <Input
            id="display-name"
            type="text"
            autoComplete="name"
            placeholder="Jamie Rivera"
            required
            maxLength={MAX_DISPLAY_NAME_LENGTH}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className={authInputClassName}
          />
        </div>

        <div className="flex flex-col gap-2">
          <AuthLabel htmlFor="email">Email</AuthLabel>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={authInputClassName}
          />
        </div>

        <div className="flex flex-col gap-2">
          <AuthLabel htmlFor="password">Password</AuthLabel>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            placeholder="Create a password"
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
          {isLoading ? "Creating your account..." : "Create Account"}
        </Button>
      </form>

      <div className="mt-6">
        <SocialButtons label="Or sign up with" />
      </div>

      <p className="mt-7 text-center text-sm text-kitch-charcoal">
        Already have an account?{" "}
        <Link href="/auth/login" className={authLinkClassName}>
          Log in.
        </Link>
      </p>
    </AuthCard>
  );
}
