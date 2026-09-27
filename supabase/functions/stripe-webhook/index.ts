// Stripe subscription webhook.
//
// The web-side counterpart to `apple-subscription-webhook`: Stripe tells us a
// subscription started, renewed, lapsed or was cancelled, and we mirror that
// into `public.subscriptions_stripe`.
//
// Lives in an edge function rather than in the Next app because this is the one
// half of Stripe that genuinely needs it: Stripe has to be able to reach a
// public URL (it cannot reach localhost), and writing `subscriptions_stripe`
// needs the service role, since that table has no write policy by design.
//
// Deployed with verify_jwt = false -- see supabase/config.toml. Stripe does not
// send a Supabase JWT; the signature check below is what authenticates it.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "npm:stripe@22";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  // Deno has no node:http, so Stripe needs its fetch-based client and the
  // WebCrypto signature verifier.
  httpClient: Stripe.createFetchHttpClient(),
});
const cryptoProvider = Stripe.createSubtleCryptoProvider();

/**
 * Price id -> plan key. Populated from the same secrets the checkout action
 * uses, so a subscription created outside our own checkout -- by hand in the
 * Stripe dashboard, say -- still resolves to the right plan.
 */
function planFromPriceId(priceId: string | null | undefined): string | null {
  if (!priceId) return null;
  const map: Record<string, string | undefined> = {
    monthly: Deno.env.get("STRIPE_PRICE_ID_MONTHLY"),
    annual: Deno.env.get("STRIPE_PRICE_ID_ANNUAL"),
    family: Deno.env.get("STRIPE_PRICE_ID_FAMILY"),
  };
  for (const [plan, configured] of Object.entries(map)) {
    if (configured && configured === priceId) return plan;
  }
  return null;
}

/**
 * When the current period ends.
 *
 * As of Stripe API 2025-03-31 / SDK v18, `current_period_end` was REMOVED from
 * the Subscription object and now lives on each subscription item. Reading it
 * off the subscription silently yields undefined, which would store a null
 * renewal date for every subscriber. We sell single-item subscriptions, so the
 * first item is the whole story.
 */
function currentPeriodEnd(subscription: Stripe.Subscription): string | null {
  const seconds = subscription.items?.data?.[0]?.current_period_end;
  return typeof seconds === "number" ? new Date(seconds * 1000).toISOString() : null;
}

function toIso(seconds: number | null | undefined): string | null {
  return typeof seconds === "number" ? new Date(seconds * 1000).toISOString() : null;
}

/** Resolve the Kitch user this subscription belongs to. */
async function resolveUserId(subscription: Stripe.Subscription): Promise<string | null> {
  const fromMetadata = subscription.metadata?.user_id;
  if (fromMetadata) return fromMetadata;

  // Fall back to the customer we already have on file. Covers events for
  // subscriptions that predate metadata, or that Stripe created on its own.
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id;
  if (!customerId) return null;

  const { data } = await supabase
    .from("subscriptions_stripe")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  return data?.user_id ?? null;
}

async function upsertSubscription(subscription: Stripe.Subscription): Promise<void> {
  const userId = await resolveUserId(subscription);
  if (!userId) {
    console.error(`No Kitch user for subscription ${subscription.id}; ignoring.`);
    return;
  }

  const item = subscription.items?.data?.[0];
  const priceId = item?.price?.id ?? null;
  const plan = subscription.metadata?.plan ?? planFromPriceId(priceId);

  if (!plan) {
    console.error(`Could not resolve a plan for price ${priceId}; ignoring.`);
    return;
  }

  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id;

  if (!customerId || !priceId) {
    console.error(`Subscription ${subscription.id} has no customer or price; ignoring.`);
    return;
  }

  // Conflict target is user_id (the primary key), so a user who resubscribes
  // after cancelling overwrites their old row rather than colliding on it.
  const { error } = await supabase.from("subscriptions_stripe").upsert(
    {
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      price_id: priceId,
      plan,
      status: subscription.status,
      current_period_end: currentPeriodEnd(subscription),
      cancel_at_period_end: subscription.cancel_at_period_end ?? false,
      trial_end: toIso(subscription.trial_end),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    // Surfaced as a non-2xx below so Stripe retries.
    throw new Error(`Failed to upsert subscription: ${error.message}`);
  }

  console.log(`Synced ${subscription.id} for ${userId}: ${plan} / ${subscription.status}`);
}

Deno.serve(async (req: Request) => {
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing stripe-signature", { status: 400 });
  }

  // The raw body is required -- parsing it first would break the signature.
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      STRIPE_WEBHOOK_SECRET,
      undefined,
      cryptoProvider,
    );
  } catch (error) {
    // Unlike the Apple webhook, which trusts its payload, an unverified body
    // here is rejected outright: this endpoint is unauthenticated, so the
    // signature is the only thing standing between a stranger and a free
    // subscription.
    console.error(`Signature verification failed: ${error}`);
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id;

        if (!subscriptionId) break;

        // Re-fetch rather than trusting the session: the session carries only an
        // id, and we need items, status and period end.
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);

        // The session knows the user even when the subscription's own metadata
        // somehow doesn't.
        if (!subscription.metadata?.user_id && session.client_reference_id) {
          subscription.metadata = {
            ...subscription.metadata,
            user_id: session.client_reference_id,
          };
        }

        await upsertSubscription(subscription);
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        // `deleted` still carries the final object, with status 'canceled' --
        // storing it is what revokes access.
        await upsertSubscription(event.data.object as Stripe.Subscription);
        break;
      }

      case "invoice.payment_failed": {
        // Stripe follows this with customer.subscription.updated carrying the
        // new status ('past_due' / 'unpaid'), which is what actually changes
        // entitlement. Logged here only so a failing card is visible.
        const invoice = event.data.object as Stripe.Invoice;
        console.log(`Payment failed for customer ${invoice.customer}`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    // Deliberately the opposite of the Apple webhook's always-200 policy.
    // Apple punishes a non-200 with 72 hours of retries; Stripe retries with
    // backoff for a few days, which is exactly what we want when a write fails.
    console.error(`Failed handling ${event.type}: ${error}`);
    return new Response(JSON.stringify({ error: String(error) }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
