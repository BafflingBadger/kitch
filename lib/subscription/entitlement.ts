import { createClient } from "@/lib/supabase/server";
import { isPlanKey, type PlanKey } from "./plans";

/**
 * Server-side reads of "what is this user entitled to".
 *
 * Both helpers go through RPCs rather than querying the subscription tables
 * directly, because entitlement spans four cases (Apple, Stripe, and a family
 * seat under either) and resolving that in TypeScript would put a second,
 * drifting copy of the rule next to the one iOS already relies on.
 */

export type EntitlementSource = "apple" | "stripe" | "family";

export interface Entitlement {
  isPremium: boolean;
  /** Which storefront is billing them. Drives what we can offer to manage. */
  source: EntitlementSource | null;
  plan: PlanKey | null;
  /** Raw status from the billing source, for display only. */
  status: string | null;
  renewsAt: string | null;
  /** Stripe only: they've cancelled but still have access until `renewsAt`. */
  cancelAtPeriodEnd: boolean;
  trialEnd: string | null;
  /**
   * They have a Stripe customer record, so the billing portal is reachable --
   * true even after a cancellation, and even when `source` is 'apple'.
   */
  hasStripeBilling: boolean;
  isFamilyOwner: boolean;
  familySeatsUsed: number;
  /** Set when `source` is 'family': whose plan they're on. */
  familyOwnerName: string | null;
}

export const FREE_ENTITLEMENT: Entitlement = {
  isPremium: false,
  source: null,
  plan: null,
  status: null,
  renewsAt: null,
  cancelAtPeriodEnd: false,
  trialEnd: null,
  hasStripeBilling: false,
  isFamilyOwner: false,
  familySeatsUsed: 0,
  familyOwnerName: null,
};

export async function getEntitlement(): Promise<Entitlement> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("entitlement_get_status");

  // Fail closed. Showing a free user as Premium would hand out the product;
  // showing a Premium user as free is recoverable with a refresh.
  if (error || !data || data.length === 0) {
    return FREE_ENTITLEMENT;
  }

  const row = data[0];

  return {
    isPremium: row.is_premium ?? false,
    source:
      row.source === "apple" || row.source === "stripe" || row.source === "family"
        ? row.source
        : null,
    plan: isPlanKey(row.plan) ? row.plan : null,
    status: row.status,
    renewsAt: row.renews_at,
    cancelAtPeriodEnd: row.cancel_at_period_end ?? false,
    trialEnd: row.trial_end,
    hasStripeBilling: row.has_stripe_billing ?? false,
    isFamilyOwner: row.is_family_owner ?? false,
    familySeatsUsed: row.family_seats_used ?? 0,
    familyOwnerName: row.family_owner_name,
  };
}

export interface ImportUsage {
  isPremium: boolean;
  used: number;
  limit: number;
  remaining: number;
  /** Free plan, allowance spent. The signal the paywall keys off. */
  exhausted: boolean;
}

/**
 * How much of the free import allowance is left.
 *
 * Note the deliberate asymmetry with `getEntitlement`: this one fails *open*.
 * It only drives UI affordances and a pre-flight check, and the real gate is
 * inside the `import-recipe` edge function -- so a hiccup reading the counter
 * should not stop someone importing a recipe they're entitled to.
 */
export async function getImportUsage(): Promise<ImportUsage> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("imports_get_usage");

  if (error || !data || data.length === 0) {
    return { isPremium: true, used: 0, limit: 0, remaining: Infinity, exhausted: false };
  }

  const row = data[0];
  const isPremium = row.is_premium ?? false;
  const used = row.used ?? 0;
  const limit = row.import_limit ?? 0;

  return {
    isPremium,
    used,
    limit,
    remaining: isPremium ? Infinity : Math.max(0, limit - used),
    exhausted: !isPremium && used >= limit,
  };
}
