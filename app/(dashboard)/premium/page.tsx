import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { Sparkles } from "lucide-react";

import { getEntitlement, getImportUsage } from "@/lib/subscription/entitlement";
import { fetchPlanPrices, isStripeConfigured } from "@/lib/subscription/stripe";
import { PLANS } from "@/lib/subscription/plans";
import { PlanCards } from "@/components/premium/plan-cards";

async function PremiumContent({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  // Opt into dynamic rendering before anything else runs. The Stripe SDK calls
  // `Date.now()` internally, and the Promise.all below starts that request
  // concurrently with `searchParams` -- so without this the clock gets read
  // before the route is marked dynamic, which Cache Components rejects.
  await connection();

  // `searchParams` is awaited in here, not in the page component: it is dynamic
  // data, and reading it outside the Suspense boundary would block the whole
  // route from prerendering.
  const [params, entitlement, usage, prices] = await Promise.all([
    searchParams,
    getEntitlement(),
    getImportUsage(),
    fetchPlanPrices(),
  ]);
  const cancelled = params.checkout === "cancelled";

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-col items-center text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-kitch-orange-from to-kitch-orange-to text-white">
          <Sparkles className="h-6 w-6" />
        </span>
        <h1 className="mt-4 font-literata text-4xl font-semibold text-kitch-charcoal">
          Kitch Premium
        </h1>
        <p className="mt-2 max-w-md text-sm text-kitch-grey">
          The free plan includes {usage.limit} recipe imports. Premium makes
          them unlimited.
        </p>
      </div>

      {cancelled ? (
        <p className="mt-6 rounded-2xl border border-kitch-charcoal/10 bg-white px-4 py-3 text-center text-sm text-kitch-grey">
          Checkout was cancelled — you haven&rsquo;t been charged.
        </p>
      ) : null}

      <div className="mt-10">
        {entitlement.isPremium ? (
          <AlreadyPremium
            plan={entitlement.plan}
            source={entitlement.source}
            ownerName={entitlement.familyOwnerName}
          />
        ) : !isStripeConfigured() ? (
          <p className="rounded-3xl border border-kitch-charcoal/10 bg-white px-6 py-8 text-center text-sm text-kitch-grey">
            Subscriptions aren&rsquo;t available on the web just yet.
          </p>
        ) : (
          <PlanCards prices={prices} />
        )}
      </div>
    </div>
  );
}

function AlreadyPremium({
  plan,
  source,
  ownerName,
}: {
  plan: string | null;
  source: string | null;
  ownerName: string | null;
}) {
  const planName = plan && plan in PLANS ? PLANS[plan as keyof typeof PLANS].name : null;

  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl border border-kitch-charcoal/10 bg-white px-6 py-10 text-center">
      <span className="font-literata text-2xl font-semibold text-kitch-charcoal">
        You&rsquo;re on Kitch Premium
      </span>
      <p className="max-w-sm text-sm text-kitch-grey">
        {source === "family" && ownerName
          ? `You have Premium through ${ownerName}'s family plan. Recipe imports are unlimited.`
          : `Your ${planName ?? "Premium"} plan is active. Recipe imports are unlimited.`}
      </p>
      <Link
        href="/settings#premium"
        className="mt-2 flex h-11 items-center rounded-full border border-kitch-charcoal/15 bg-white px-6 text-sm font-semibold text-kitch-charcoal hover:bg-kitch-cream-dark"
      >
        Manage subscription
      </Link>
    </div>
  );
}

export default function PremiumPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  return (
    <Suspense fallback={<div className="text-sm text-kitch-grey">Loading…</div>}>
      <PremiumContent searchParams={searchParams} />
    </Suspense>
  );
}
