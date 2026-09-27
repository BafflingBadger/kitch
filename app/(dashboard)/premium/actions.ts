"use server";

import { createClient } from "@/lib/supabase/server";
import { getEntitlement } from "@/lib/subscription/entitlement";
import { PLANS, isPlanKey, type PlanKey } from "@/lib/subscription/plans";
import { getPriceId, getSiteUrl, getStripe } from "@/lib/subscription/stripe";

/**
 * Checkout and billing-management entry points.
 *
 * These run here rather than in an edge function because this half of Stripe
 * needs neither a public URL nor elevated database access -- it only calls
 * Stripe and reads the caller's own row through RLS. The webhook, which needs
 * both, lives in supabase/functions/stripe-webhook.
 *
 * Both return the codebase's usual discriminated union so callers can branch
 * without try/catch.
 */

type ActionResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

export async function startCheckout(plan: PlanKey): Promise<ActionResult> {
  if (!isPlanKey(plan)) {
    return { ok: false, error: "Unknown plan" };
  }

  const supabase = await createClient();
  const { data: claimsData, error: authError } = await supabase.auth.getClaims();
  if (authError || !claimsData?.claims) {
    return { ok: false, error: "Not authenticated" };
  }
  const userId = claimsData.claims.sub;
  const email = claimsData.claims.email as string | undefined;

  const priceId = getPriceId(plan);
  if (!priceId) {
    return {
      ok: false,
      error: `Checkout isn't configured yet — ${PLANS[plan].priceEnvVar} is not set.`,
    };
  }

  // Don't let someone buy a second subscription on top of one they're already
  // paying for. A family *member* is excluded from this check on purpose: they
  // pay nothing today and may reasonably want a plan of their own.
  const entitlement = await getEntitlement();
  if (entitlement.source === "stripe") {
    return {
      ok: false,
      error: "You already have an active subscription. Manage it from Settings.",
    };
  }
  if (entitlement.source === "apple") {
    return {
      ok: false,
      error:
        "You already subscribe through the App Store. Cancel there before subscribing on the web, so you aren't charged twice.",
    };
  }

  // Reuse the Stripe customer if we've seen this user before, so a resubscribe
  // lands on the existing customer instead of creating a duplicate.
  const { data: existing } = await supabase
    .from("subscriptions_stripe")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .maybeSingle();

  const siteUrl = getSiteUrl();
  const trialDays = PLANS[plan].trialDays;

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      ...(existing?.stripe_customer_id
        ? { customer: existing.stripe_customer_id }
        : { customer_email: email }),
      // Both are set: `client_reference_id` rides on checkout.session.completed,
      // while the subscription metadata is on every later subscription event.
      client_reference_id: userId,
      subscription_data: {
        metadata: { user_id: userId, plan },
        ...(trialDays ? { trial_period_days: trialDays } : {}),
      },
      metadata: { user_id: userId, plan },
      success_url: `${siteUrl}/settings?checkout=success`,
      cancel_url: `${siteUrl}/premium?checkout=cancelled`,
    });

    if (!session.url) {
      return { ok: false, error: "Stripe did not return a checkout URL" };
    }

    return { ok: true, url: session.url };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not start checkout";
    return { ok: false, error: message };
  }
}

export async function openBillingPortal(): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: claimsData, error: authError } = await supabase.auth.getClaims();
  if (authError || !claimsData?.claims) {
    return { ok: false, error: "Not authenticated" };
  }
  const userId = claimsData.claims.sub;

  const { data: existing } = await supabase
    .from("subscriptions_stripe")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .maybeSingle();

  // No Stripe customer means they never bought on the web. Most often that's an
  // App Store subscriber, which Stripe has no way to manage.
  if (!existing?.stripe_customer_id) {
    return {
      ok: false,
      error: "There's no web subscription on this account to manage.",
    };
  }

  try {
    const stripe = getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: existing.stripe_customer_id,
      return_url: `${getSiteUrl()}/settings`,
    });
    return { ok: true, url: session.url };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not open billing portal";
    return { ok: false, error: message };
  }
}
