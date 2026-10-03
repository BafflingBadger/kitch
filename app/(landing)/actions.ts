"use server";

import { createClient } from "@/lib/supabase/server";
import { LIMITS } from "@/lib/validation/limits";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Adds an email to the Android waitlist. Open to signed-out visitors -- that is
 * who the landing page is for -- so it goes through `android_waitlist_join`, a
 * security definer function that can only insert, rather than the service role.
 * The function re-checks the email; this check just gives a friendlier error.
 */
export async function joinAndroidWaitlist(email: unknown) {
  const trimmed = typeof email === "string" ? email.trim() : "";
  if (!trimmed || trimmed.length > LIMITS.email || !EMAIL_PATTERN.test(trimmed)) {
    return { ok: false as const, error: "Please enter a valid email address" };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("android_waitlist_join", { p_email: trimmed });
  if (error) {
    return { ok: false as const, error: "Unable to submit. Please try again." };
  }

  return { ok: true as const };
}
