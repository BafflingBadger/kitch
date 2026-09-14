"use client";

import Link from "next/link";
import { useState } from "react";

import { AuthCard, AuthError, AuthLabel } from "@/components/auth/auth-card";
import {
  authInputClassName,
  authLinkClassName,
  authPrimaryButtonClassName,
} from "@/components/auth/styles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { validateEmail } from "@/lib/auth/validation";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
      return;
    }

    const supabase = createClient();
    setIsLoading(true);

    try {
      // This URL must be listed under Redirect URLs in the Supabase dashboard.
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/update-password`,
      });
      if (error) throw error;
      setSuccess(true);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <AuthCard
        title="Check Your Email"
        description="Password reset instructions sent."
      >
        <p className="text-center text-sm text-kitch-grey">
          If you registered using your email and password, you will receive a
          password reset email shortly.
        </p>
        <p className="mt-7 text-center text-sm text-kitch-charcoal">
          <Link href="/auth/login" className={authLinkClassName}>
            Back to log in.
          </Link>
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Reset Password"
      description="Enter your email and we'll send you a link to reset it."
    >
      <form
        onSubmit={handleForgotPassword}
        noValidate
        className="flex flex-col gap-6"
      >
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

        {error ? <AuthError message={error} /> : null}

        <Button
          type="submit"
          disabled={isLoading}
          className={authPrimaryButtonClassName}
        >
          {isLoading ? "Sending..." : "Send reset email"}
        </Button>
      </form>

      <p className="mt-7 text-center text-sm text-kitch-charcoal">
        Remembered it?{" "}
        <Link href="/auth/login" className={authLinkClassName}>
          Log in.
        </Link>
      </p>
    </AuthCard>
  );
}
