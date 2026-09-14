"use client";

import { useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { AuthError } from "@/components/auth/auth-card";
import { AppleIcon, GoogleIcon } from "@/components/auth/provider-icons";
import { authSecondaryButtonClassName } from "@/components/auth/styles";
import { readNextFromLocation } from "@/lib/auth/redirect";
import { cn } from "@/lib/utils";

type Provider = "google" | "apple";

// Apple sign-in needs an Apple Developer Program membership and a Services ID
// that this project does not have yet, so the button stays hidden until
// NEXT_PUBLIC_ENABLE_APPLE_SIGN_IN is set to "true". Referenced directly rather
// than via a variable so Next.js can inline it at build time.
const APPLE_ENABLED = process.env.NEXT_PUBLIC_ENABLE_APPLE_SIGN_IN === "true";

export function SocialButtons({ label = "Or login with" }: { label?: string }) {
  const [pending, setPending] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);

  const signIn = async (provider: Provider) => {
    setPending(provider);
    setError(null);

    const supabase = createClient();
    const callback = new URL("/auth/callback", window.location.origin);
    callback.searchParams.set("next", readNextFromLocation());

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: callback.toString() },
    });

    // On success the browser is navigating away, so only the failure path
    // needs to restore the button.
    if (error) {
      setError(error.message);
      setPending(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-kitch-charcoal/10" />
        <span className="text-[11px] font-medium uppercase tracking-widest text-kitch-grey">
          {label}
        </span>
        <span className="h-px flex-1 bg-kitch-charcoal/10" />
      </div>

      <div
        className={cn(
          "grid gap-3",
          APPLE_ENABLED ? "grid-cols-2" : "grid-cols-1",
        )}
      >
        <button
          type="button"
          onClick={() => signIn("google")}
          disabled={pending !== null}
          className={authSecondaryButtonClassName}
        >
          <GoogleIcon className="h-[18px] w-[18px]" />
          {pending === "google" ? "Redirecting..." : "Google"}
        </button>
        {APPLE_ENABLED ? (
          <button
            type="button"
            onClick={() => signIn("apple")}
            disabled={pending !== null}
            className={authSecondaryButtonClassName}
          >
            <AppleIcon className="h-[18px] w-[18px]" />
            {pending === "apple" ? "Redirecting..." : "Apple"}
          </button>
        ) : null}
      </div>

      {error ? <AuthError message={error} /> : null}
    </div>
  );
}
