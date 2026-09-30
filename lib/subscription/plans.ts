/**
 * The one place a plan's identity lives.
 *
 * Kitch Premium is sold on two storefronts -- Apple on iOS, Stripe on the web --
 * and this maps between them. `appleProductId` is what StoreKit and the
 * `subscriptions` table use; `priceEnvVar` names the Stripe price that sells the
 * same thing on the web.
 *
 * Stripe price ids are read from the environment rather than written here so
 * that test-mode and live-mode prices are a config change, not a code change.
 */

export const PLAN_KEYS = ["monthly", "annual", "family"] as const;

export type PlanKey = (typeof PLAN_KEYS)[number];

export interface Plan {
  key: PlanKey;
  /** Shown on the plan card. */
  name: string;
  /** One line under the name. */
  tagline: string;
  appleProductId: string;
  /** Env var holding the Stripe *price id* (`price_...`), not an amount. */
  priceEnvVar: string;
  /** Free-trial length, or null for no trial. Annual only. */
  trialDays: number | null;
  /** Accounts included, for the family plan. */
  seats: number | null;
}

export const PLANS: Record<PlanKey, Plan> = {
  monthly: {
    key: "monthly",
    name: "Monthly",
    tagline: "Unlimited imports, billed monthly.",
    appleProductId: "com.kitch.monthly",
    priceEnvVar: "STRIPE_PRICE_ID_MONTHLY",
    trialDays: null,
    seats: null,
  },
  annual: {
    key: "annual",
    name: "Annual",
    tagline: "The same, for less per month.",
    appleProductId: "com.kitch.annual",
    priceEnvVar: "STRIPE_PRICE_ID_ANNUAL",
    // The trial is annual-only, on purpose -- not monthly, not family.
    trialDays: 7,
    seats: null,
  },
  family: {
    key: "family",
    name: "Family",
    tagline: "Premium for up to 5 accounts, billed yearly.",
    appleProductId: "com.kitch.family",
    priceEnvVar: "STRIPE_PRICE_ID_FAMILY",
    trialDays: null,
    seats: 5,
  },
};

export const PLAN_LIST: Plan[] = PLAN_KEYS.map((key) => PLANS[key]);

/**
 * People an owner can add to a Family plan. `seats` counts the owner, so this
 * is one fewer. The database enforces the same number.
 */
export const FAMILY_MAX_MEMBERS = (PLANS.family.seats ?? 1) - 1;

export function isPlanKey(value: unknown): value is PlanKey {
  return typeof value === "string" && (PLAN_KEYS as readonly string[]).includes(value);
}

/** Reverse of `appleProductId`, for rendering a subscription bought on iOS. */
export function planFromAppleProductId(productId: string | null): Plan | null {
  if (!productId) return null;
  return PLAN_LIST.find((plan) => plan.appleProductId === productId) ?? null;
}

/** Human label for a plan key, falling back to something sane for unknown ids. */
export function planLabel(key: string | null): string {
  if (isPlanKey(key)) return PLANS[key].name;
  return "Premium";
}

/**
 * What each plan actually includes.
 *
 * Shared by the pricing page and the settings card so the two can never
 * disagree. Keep these literally true -- they appear next to a price.
 */
export const PLAN_FEATURES: Record<PlanKey, string[]> = {
  monthly: [
    "Unlimited recipe imports",
    "Import from links, photos, and PDFs",
    "Cancel anytime",
  ],
  annual: [
    "Unlimited recipe imports",
    "Import from links, photos, and PDFs",
    "7-day free trial",
  ],
  family: [
    "Unlimited recipe imports",
    "Import from links, photos, and PDFs",
    "Premium for up to 5 accounts",
  ],
};
