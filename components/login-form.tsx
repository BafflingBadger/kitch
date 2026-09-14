"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  AuthCard,
  AuthError,
  AuthLabel,
} from "@/components/auth/auth-card";
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
import { readNextFromLocation } from "@/lib/auth/redirect";
import { validateEmail } from "@/lib/auth/validation";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
      return;
    }
    // Only checked for presence -- an existing account may predate the current
    // minimum length, and we must not lock anyone out of their own password.
    if (!password) {
      setError("Please enter your password.");
      return;
    }

    const supabase = createClient();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;

      // Next keeps this subtree mounted across the navigation and can reveal it
      // again after a sign-out, so don't leave credentials sitting in state.
      setEmail("");
      setPassword("");

      router.push(readNextFromLocation());
      // Server components hold the old (signed-out) session until refreshed.
      router.refresh();
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      // Always cleared, including on success. Next keeps the previous route's
      // subtree mounted across a navigation, so an instance left at `true`
      // can be revealed again later showing a stuck "Logging in...".
      setIsLoading(false);
    }
  };

  return (
    <AuthCard
      title="Welcome Back"
      description="Enter your email and password to access your kitchen."
    >
      <form onSubmit={handleLogin} noValidate className="flex flex-col gap-6">
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
          <div className="flex items-baseline justify-between gap-3">
            <AuthLabel htmlFor="password">Password</AuthLabel>
            <Link href="/auth/forgot-password" className={`text-sm ${authLinkClassName}`}>
              Forgot your password?
            </Link>
          </div>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            placeholder="Enter password"
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
          {isLoading ? "Logging in..." : "Log In"}
        </Button>
      </form>

      <div className="mt-6">
        <SocialButtons label="Or login with" />
      </div>

      <p className="mt-7 text-center text-sm text-kitch-charcoal">
        Don&apos;t have an account?{" "}
        <Link href="/auth/sign-up" className={authLinkClassName}>
          Sign up now.
        </Link>
      </p>
    </AuthCard>
  );
}
