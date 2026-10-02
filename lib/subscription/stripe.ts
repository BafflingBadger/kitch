import Stripe from "stripe";

import { PLANS, type PlanKey } from "./plans";

/**
 * Server-only Stripe access. Never import this from a Client Component -- it
 * reads `STRIPE_SECRET_KEY`, which has no `NEXT_PUBLIC_` prefix precisely so
 * that a stray client import fails loudly instead of shipping a secret.
 *
 * Not memoised in a module-level variable for the same reason the Supabase
 * clients aren't: see the note in lib/supabase/server.ts.
 */
export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  return new Stripe(key);
}

/** Whether checkout can run at all -- used to degrade the pricing page gracefully. */
export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

/**
 * Resolve a plan key to its Stripe price id.
 *
 * Clients only ever send a plan key; the price id is looked up here. That way a
 * caller cannot name an arbitrary Stripe price and check out at a price we
 * never intended to sell.
 */
export function getPriceId(plan: PlanKey): string | null {
  return process.env[PLANS[plan].priceEnvVar] ?? null;
}

/**
 * Where Stripe sends people back to. Read from config rather than from a
 * request header, which the caller controls and could point at another origin.
 */
export function getSiteUrl(): string {
  const siteUrl = process.env.SITE_URL;
  if (siteUrl) return siteUrl;
  // Falling back to localhost in production would send paying customers back
  // to a URL that doesn't exist -- fail loudly instead.
  if (process.env.VERCEL_ENV === "production") {
    throw new Error("SITE_URL is not set");
  }
  return "http://localhost:3000";
}

/** Stripe stores minor units; drop the cents on whole amounts. */
export function formatAmount(unitAmount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: unitAmount % 100 === 0 ? 0 : 2,
  }).format(unitAmount / 100);
}

export interface PlanPrice {
  /** Already formatted for display, e.g. "$4.99". */
  amount: string;
  interval: "month" | "year" | null;
}

/**
 * Live prices, straight from Stripe, so the pricing page can never drift from
 * what someone is actually charged.
 *
 * Returns an empty map rather than throwing when Stripe is not configured yet
 * or a lookup fails -- the pricing page stays useful, it just omits the number.
 */
export async function fetchPlanPrices(): Promise<Partial<Record<PlanKey, PlanPrice>>> {
  if (!isStripeConfigured()) return {};

  const stripe = getStripe();
  const entries = await Promise.all(
    (Object.keys(PLANS) as PlanKey[]).map(async (plan) => {
      const priceId = getPriceId(plan);
      if (!priceId) return null;

      try {
        const price = await stripe.prices.retrieve(priceId);
        if (price.unit_amount == null) return null;

        const formatted = formatAmount(price.unit_amount, price.currency);

        const interval = price.recurring?.interval;
        return [
          plan,
          {
            amount: formatted,
            interval: interval === "month" || interval === "year" ? interval : null,
          },
        ] as const;
      } catch (error) {
        // A bad or test/live-mismatched price id shouldn't take the page down,
        // but it must not vanish silently either -- the card just reads
        // "Pricing unavailable", which says nothing about why.
        console.error(
          `Could not load Stripe price for the ${plan} plan (${PLANS[plan].priceEnvVar}=${priceId}):`,
          error instanceof Error ? error.message : error,
        );
        return null;
      }
    }),
  );

  return Object.fromEntries(entries.filter((entry) => entry !== null));
}
