"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowUpRight, Check, Loader2, Sparkles } from "lucide-react";

import { SettingsSection } from "@/components/settings/settings-section";
import { FamilyMembers } from "@/components/settings/family-members";
import { openBillingPortal } from "@/app/(dashboard)/premium/actions";
import type { Entitlement } from "@/lib/subscription/entitlement";
import type { BillingDetails } from "@/lib/subscription/billing";
import type { FamilyMember } from "@/lib/subscription/family";
import {
  FAMILY_MAX_MEMBERS,
  PLANS,
  PLAN_FEATURES,
  type PlanKey,
} from "@/lib/subscription/plans";

/** Where Apple sends people to manage an App Store subscription. */
const APPLE_SUBSCRIPTIONS_URL = "https://apps.apple.com/account/subscriptions";

/**
 * Formatted in a fixed locale and time zone on purpose. This is a Client
 * Component rendered on the server first, and letting the two sides disagree
 * about the viewer's locale is a hydration mismatch.
 */
function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function PremiumSection({
  entitlement,
  usage,
  billing,
  familyMembers,
}: {
  entitlement: Entitlement;
  usage: { used: number; limit: number };
  billing: BillingDetails;
  familyMembers: FamilyMember[];
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const justCheckedOut = searchParams.get("checkout") === "success";

  // Stripe redirects back the instant payment succeeds, but entitlement only
  // becomes true once the webhook lands -- usually a second or two later.
  // Rather than showing "Free plan" to someone who just paid, poll briefly.
  const [activating, setActivating] = useState(
    justCheckedOut && !entitlement.isPremium,
  );

  useEffect(() => {
    if (!activating) return;
    if (entitlement.isPremium) {
      setActivating(false);
      return;
    }

    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      router.refresh();
      // Give up after ~10s and show the real state; a webhook this late is a
      // problem the user cannot fix by waiting longer.
      if (attempts >= 5) {
        clearInterval(timer);
        setActivating(false);
      }
    }, 2000);

    return () => clearInterval(timer);
  }, [activating, entitlement.isPremium, router]);

  return (
    <SettingsSection
      id="premium"
      icon={Sparkles}
      title="Kitch Premium"
      description="Your plan and billing."
    >
      {activating ? (
        <div className="flex items-center gap-2 text-sm text-kitch-grey">
          <Loader2 className="h-4 w-4 animate-spin" />
          Activating your subscription…
        </div>
      ) : entitlement.isPremium ? (
        <PremiumState
          entitlement={entitlement}
          billing={billing}
          familyMembers={familyMembers}
        />
      ) : (
        <FreeState used={usage.used} limit={usage.limit} />
      )}
    </SettingsSection>
  );
}

function FreeState({ used, limit }: { used: number; limit: number }) {
  const remaining = Math.max(0, limit - used);
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-sm text-kitch-charcoal">Free plan</span>
          <span className="text-sm text-kitch-grey">
            {used} of {limit} imports used
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-kitch-cream-dark">
          <div
            className="h-full rounded-full bg-gradient-to-r from-kitch-orange-from to-kitch-orange-to"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-kitch-grey">
          {remaining > 0
            ? `${remaining} free ${remaining === 1 ? "import" : "imports"} left. Writing recipes by hand is always free.`
            : "You've used all your free imports. Writing recipes by hand is always free."}
        </p>
      </div>

      <Link
        href="/premium"
        className="flex h-11 w-fit items-center rounded-full bg-gradient-to-r from-kitch-orange-from to-kitch-orange-to px-6 text-sm font-semibold text-white shadow-sm hover:opacity-90"
      >
        Get Kitch Premium
      </Link>
    </div>
  );
}

function PremiumState({
  entitlement,
  billing,
  familyMembers,
}: {
  entitlement: Entitlement;
  billing: BillingDetails;
  familyMembers: FamilyMember[];
}) {
  const planName =
    entitlement.plan && entitlement.plan in PLANS
      ? PLANS[entitlement.plan].name
      : "Premium";
  const renews = formatDate(entitlement.renewsAt);
  const trialEnds = formatDate(entitlement.trialEnd);
  const onTrial =
    entitlement.status === "trialing" &&
    Boolean(entitlement.trialEnd) &&
    new Date(entitlement.trialEnd!).getTime() > Date.now();

  const features = entitlement.plan
    ? PLAN_FEATURES[entitlement.plan as PlanKey]
    : PLAN_FEATURES.monthly;

  // Only rows we actually have data for -- an empty "Payment method" reads as
  // something being broken.
  const facts: { label: string; value: string }[] = [];
  facts.push({
    label: "Billing cycle",
    value:
      entitlement.source === "family"
        ? "Billed to the plan owner"
        : billing.interval === "month"
          ? "Monthly"
          : billing.interval === "year"
            ? "Annual"
            : planName,
  });
  if (entitlement.source === "family" && entitlement.familyOwnerName) {
    facts.push({ label: "Plan owner", value: entitlement.familyOwnerName });
  }
  if (onTrial && trialEnds) {
    facts.push({ label: "Trial ends", value: trialEnds });
  }
  if (renews) {
    facts.push({
      label: entitlement.cancelAtPeriodEnd ? "Access ends" : "Renews",
      value: renews,
    });
  }
  if (billing.cardBrand && billing.cardLast4) {
    facts.push({
      label: "Payment method",
      value: `${titleCase(billing.cardBrand)} ending ${billing.cardLast4}`,
    });
  }
  if (entitlement.isFamilyOwner) {
    facts.push({
      label: "Family seats",
      // The owner holds a seat too, matching the family list's count.
      value: `${entitlement.familySeatsUsed + 1} of ${FAMILY_MAX_MEMBERS + 1} used`,
    });
  }

  return (
    <div className="flex flex-col">
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-kitch-orange-from to-kitch-orange-to p-6 text-white">
        {/* Two columns only at `xl`. The settings content column is at its
            NARROWEST just above `lg` -- that is where the nav rail moves
            alongside it -- so a `lg:` row would still collide. */}
        {/* Top-aligned so the plan sits at the top of the card, not centred
            against the taller feature list. */}
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <span className="block text-xs font-semibold uppercase leading-none tracking-wide text-white/80">
              {entitlement.source === "family" ? "Family member" : "Current plan"}
            </span>

            <p className="mt-1.5 font-literata text-3xl font-semibold leading-tight">
              {planName}
            </p>

            {billing.amount ? (
              <p className="mt-1 flex items-baseline gap-1.5">
                <span className="font-literata text-2xl font-semibold leading-tight">
                  {billing.amount}
                </span>
                {billing.interval ? (
                  <span className="text-sm text-white/80">
                    / {billing.interval}
                  </span>
                ) : null}
              </p>
            ) : onTrial ? (
              <p className="mt-1 text-sm text-white/80">Free trial in progress</p>
            ) : null}
          </div>

          {/* No `shrink-0`: if it cannot shrink it overlaps the price instead
              of wrapping. */}
          <ul className="flex flex-col gap-2.5">
            {features.map((feature) => (
              <li key={feature} className="flex items-start gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/25">
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                </span>
                <span className="text-sm text-white">{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <dl className="mt-2 grid sm:grid-cols-2 sm:gap-x-10">
        {facts.map((fact) => (
          <div
            key={fact.label}
            className="border-b border-kitch-charcoal/10 py-4"
          >
            <dt className="text-xs font-semibold uppercase tracking-wide text-kitch-grey">
              {fact.label}
            </dt>
            <dd className="mt-1 text-sm text-kitch-charcoal">{fact.value}</dd>
          </div>
        ))}
      </dl>

      {entitlement.cancelAtPeriodEnd ? (
        <p className="mt-5 rounded-2xl border border-kitch-charcoal/10 bg-kitch-cream-dark px-4 py-3 text-sm text-kitch-grey">
          Your subscription is set to cancel{renews ? ` on ${renews}` : ""}. You
          keep Premium until then — you can resume it from the billing portal.
        </p>
      ) : null}

      <BillingControls entitlement={entitlement} />

      {/* Owners manage their family here; members see it read-only. Someone
          who owns a family plan *and* holds a seat elsewhere is shown as the
          owner, matching `entitlement_get_status`, which resolves their own
          subscription first. */}
      {entitlement.isFamilyOwner ? (
        <FamilyMembers members={familyMembers} isOwner />
      ) : entitlement.source === "family" ? (
        <FamilyMembers members={familyMembers} isOwner={false} />
      ) : null}
    </div>
  );
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function BillingControls({ entitlement }: { entitlement: Entitlement }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleManage() {
    setError(null);
    startTransition(async () => {
      const result = await openBillingPortal();
      if (result.ok) {
        window.location.href = result.url;
        return;
      }
      setError(result.error);
    });
  }

  const buttonClassName =
    "flex h-11 shrink-0 items-center gap-2 rounded-full bg-kitch-charcoal px-6 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60";

  // A family member pays nothing and has nothing to manage.
  if (entitlement.source === "family") {
    return (
      <p className="mt-5 text-sm text-kitch-grey">
        This plan is billed to its owner.
      </p>
    );
  }

  // Apple is the merchant of record for anything bought on iOS, and Stripe
  // cannot see, change or cancel it. Sending them to Apple is the only honest
  // option here.
  if (entitlement.source === "apple") {
    return (
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-kitch-grey">
          You subscribed through the App Store, so billing is handled by Apple.
        </p>
        <a
          href={APPLE_SUBSCRIPTIONS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClassName}
        >
          Manage in App Store
          <ArrowUpRight className="h-4 w-4" />
        </a>
      </div>
    );
  }

  return (
    <div className="mt-5 flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-kitch-grey">
          Change your plan, update your card, or cancel — handled securely by
          Stripe.
        </p>
        <button
          type="button"
          onClick={handleManage}
          disabled={isPending}
          className={buttonClassName}
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Opening…
            </>
          ) : (
            <>
              Manage billing
              <ArrowUpRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
      {error ? <p className="text-sm text-kitch-red">{error}</p> : null}
    </div>
  );
}
