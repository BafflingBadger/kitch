"use client";

import { useState, useTransition } from "react";
import { Check, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { startCheckout } from "@/app/(dashboard)/premium/actions";
import { PLAN_FEATURES, PLAN_LIST, type PlanKey } from "@/lib/subscription/plans";

export interface PlanPriceDisplay {
  amount: string;
  interval: "month" | "year" | null;
}

export function PlanCards({
  prices,
}: {
  prices: Partial<Record<PlanKey, PlanPriceDisplay>>;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pendingPlan, setPendingPlan] = useState<PlanKey | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSelect(plan: PlanKey) {
    setError(null);
    setPendingPlan(plan);
    startTransition(async () => {
      const result = await startCheckout(plan);
      if (result.ok) {
        // A full navigation, not router.push: Stripe Checkout is not part of
        // this app and must not be pushed onto the Next router's history.
        window.location.href = result.url;
        return;
      }
      setError(result.error);
      setPendingPlan(null);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-3">
        {PLAN_LIST.map((plan) => {
          const price = prices[plan.key];
          const busy = isPending && pendingPlan === plan.key;
          const featured = plan.key === "annual";

          return (
            <div
              key={plan.key}
              className={cn(
                "relative flex flex-col rounded-3xl border bg-white p-6",
                featured
                  ? "border-kitch-red/40 shadow-sm"
                  : "border-kitch-charcoal/10",
              )}
            >
              {plan.trialDays ? (
                <span className="absolute -top-3 left-6 rounded-full bg-gradient-to-r from-kitch-orange-from to-kitch-orange-to px-3 py-1 text-xs font-semibold text-white">
                  {plan.trialDays}-day free trial
                </span>
              ) : null}

              <h2 className="font-literata text-2xl font-semibold text-kitch-charcoal">
                {plan.name}
              </h2>

              <p className="mt-1 text-sm text-kitch-grey">{plan.tagline}</p>

              <p className="mt-4 flex items-baseline gap-1">
                {price ? (
                  <>
                    <span className="font-literata text-3xl font-semibold text-kitch-charcoal">
                      {price.amount}
                    </span>
                    {price.interval ? (
                      <span className="text-sm text-kitch-grey">
                        /{price.interval}
                      </span>
                    ) : null}
                  </>
                ) : (
                  <span className="text-sm text-kitch-grey">
                    Pricing unavailable
                  </span>
                )}
              </p>

              <ul className="mt-5 flex flex-1 flex-col gap-2.5">
                {PLAN_FEATURES[plan.key].map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-kitch-red" />
                    <span className="text-sm text-kitch-charcoal">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() => handleSelect(plan.key)}
                disabled={isPending}
                className={cn(
                  "mt-6 flex h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold shadow-sm transition-opacity disabled:opacity-60",
                  featured
                    ? "bg-gradient-to-r from-kitch-orange-from to-kitch-orange-to text-white hover:opacity-90"
                    : "border border-kitch-charcoal/15 bg-white text-kitch-charcoal hover:bg-kitch-cream-dark",
                )}
              >
                {busy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Opening checkout…
                  </>
                ) : plan.trialDays ? (
                  "Start free trial"
                ) : (
                  `Choose ${plan.name}`
                )}
              </button>
            </div>
          );
        })}
      </div>

      {error ? <p className="text-sm text-kitch-red">{error}</p> : null}

      <p className="text-xs text-kitch-grey">
        Payments are handled by Stripe. You can cancel at any time from
        Settings.
      </p>
    </div>
  );
}
