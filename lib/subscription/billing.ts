import { createClient } from "@/lib/supabase/server";
import { formatAmount, getStripe, isStripeConfigured } from "./stripe";

/**
 * The bits of a live Stripe subscription that aren't worth mirroring into our
 * own table -- the amount being charged and the card on file.
 *
 * Fetched on demand rather than stored because both change underneath us: the
 * card whenever someone updates it in the billing portal, the amount whenever
 * the price is edited in Stripe. A stored copy would quietly go stale and show
 * someone the wrong number next to the words "Renews".
 */
export interface BillingDetails {
  /** Already formatted, e.g. "CA$39.99". */
  amount: string | null;
  interval: "month" | "year" | null;
  cardBrand: string | null;
  cardLast4: string | null;
}

const EMPTY: BillingDetails = {
  amount: null,
  interval: null,
  cardBrand: null,
  cardLast4: null,
};

/**
 * Everything is optional and every failure is soft. This decorates the billing
 * card; it must never be the reason someone can't reach Settings.
 */
export async function fetchBillingDetails(): Promise<BillingDetails> {
  if (!isStripeConfigured()) return EMPTY;

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims) return EMPTY;

  const { data: row } = await supabase
    .from("subscriptions_stripe")
    .select("stripe_subscription_id")
    .eq("user_id", claimsData.claims.sub)
    .maybeSingle();

  if (!row?.stripe_subscription_id) return EMPTY;

  try {
    const stripe = getStripe();
    // One call for both: expanding the price and the payment method avoids a
    // second round-trip to the customer.
    const subscription = await stripe.subscriptions.retrieve(
      row.stripe_subscription_id,
      { expand: ["default_payment_method", "items.data.price"] },
    );

    const price = subscription.items?.data?.[0]?.price;
    // Widened to `string` deliberately: Stripe types `interval` as a union that
    // includes a branded catch-all for values newer than the SDK, which blocks
    // narrowing by comparison.
    const interval: string | undefined = price?.recurring?.interval;

    const paymentMethod = subscription.default_payment_method;
    const card =
      paymentMethod && typeof paymentMethod !== "string"
        ? paymentMethod.card
        : null;

    return {
      amount:
        price?.unit_amount != null
          ? formatAmount(price.unit_amount, price.currency)
          : null,
      interval: interval === "month" || interval === "year" ? interval : null,
      cardBrand: card?.brand ?? null,
      cardLast4: card?.last4 ?? null,
    };
  } catch (error) {
    console.error(
      "Could not load Stripe billing details:",
      error instanceof Error ? error.message : error,
    );
    return EMPTY;
  }
}
