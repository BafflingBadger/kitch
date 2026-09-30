"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Loader2, Users } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { respondToFamilyInvite } from "@/app/(dashboard)/family/actions";
import { inviteStateMessage, type InviteState } from "@/lib/subscription/family-invite";
import { PLAN_FEATURES } from "@/lib/subscription/plans";

type CardState = InviteState | "declined";

const secondaryLinkClassName =
  "flex h-11 items-center justify-center rounded-full border border-kitch-charcoal/15 bg-white px-6 text-sm font-semibold text-kitch-charcoal hover:bg-kitch-cream-dark";

export function FamilyInviteCard({
  inviteId,
  initialState,
  owner,
}: {
  inviteId: string;
  initialState: InviteState;
  owner: { displayName: string; username: string | null; avatarUrl: string | null } | null;
}) {
  const [state, setState] = useState<CardState>(initialState);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<"accept" | "decline" | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();

  function respond(accept: boolean) {
    setError(null);
    setPending(accept ? "accept" : "decline");
    startTransition(async () => {
      const result = await respondToFamilyInvite(inviteId, accept);
      if (result.ok) {
        if (result.state === "accepted") {
          router.push("/settings#premium");
          router.refresh();
          return;
        }
        setState("declined");
      } else if (result.state) {
        // Something changed since the page rendered -- say what, in place.
        setState(result.state);
      } else {
        setError(result.error);
      }
      setPending(null);
    });
  }

  const ownerName = owner?.displayName ?? null;

  return (
    <div className="flex flex-col items-center rounded-3xl border border-kitch-charcoal/10 bg-white px-6 py-10 text-center sm:px-10">
      {owner ? (
        <Avatar
          displayName={owner.displayName}
          avatarUrl={owner.avatarUrl}
          sizeClassName="h-16 w-16 text-lg"
        />
      ) : (
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-kitch-orange-from to-kitch-orange-to text-white">
          <Users className="h-7 w-7" />
        </span>
      )}

      {state === "ok" ? (
        <>
          <h1 className="mt-5 font-literata text-3xl font-semibold leading-tight text-kitch-charcoal">
            {ownerName ?? "Someone"} invited you to their Kitch family
          </h1>
          {owner?.username ? (
            <p className="mt-1 text-sm text-kitch-grey">@{owner.username}</p>
          ) : null}
          <p className="mt-4 max-w-sm text-sm text-kitch-grey">
            Join their Family plan to get Kitch Premium at no cost to you.
          </p>

          <ul className="mt-6 flex flex-col gap-2.5 text-left">
            {PLAN_FEATURES.family.map((feature) => (
              <li key={feature} className="flex items-start gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-kitch-orange-from to-kitch-orange-to text-white">
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                </span>
                <span className="text-sm text-kitch-charcoal">{feature}</span>
              </li>
            ))}
          </ul>

          <div className="mt-8 flex w-full flex-col gap-3">
            <button
              type="button"
              onClick={() => respond(true)}
              disabled={pending !== null}
              className="flex h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-kitch-orange-from to-kitch-orange-to px-6 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {pending === "accept" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Accept &amp; enjoy Kitch Premium
            </button>
            <button
              type="button"
              onClick={() => respond(false)}
              disabled={pending !== null}
              className="flex h-11 items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold text-kitch-grey transition-colors hover:bg-kitch-cream-dark disabled:opacity-60"
            >
              {pending === "decline" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Decline
            </button>
          </div>
          {error ? <p className="mt-4 text-sm text-kitch-red">{error}</p> : null}
        </>
      ) : state === "declined" ? (
        <>
          <h1 className="mt-5 font-literata text-3xl font-semibold leading-tight text-kitch-charcoal">
            Invite declined
          </h1>
          <p className="mt-3 max-w-sm text-sm text-kitch-grey">
            {ownerName ? `You won't join ${ownerName}'s family. ` : ""}This link no longer works.
          </p>
          <Link href="/cookbooks" className={`mt-8 ${secondaryLinkClassName}`}>
            Go to Recipes
          </Link>
        </>
      ) : (
        <BlockedState state={state} ownerName={ownerName} />
      )}
    </div>
  );
}

function BlockedState({
  state,
  ownerName,
}: {
  state: Exclude<InviteState, "ok">;
  ownerName: string | null;
}) {
  const { title, body } = inviteStateMessage(state, ownerName);

  // Point people at wherever they can actually do something about it.
  const action =
    state === "in_other_family" || state === "already_subscribed" || state === "already_member"
      ? { href: "/settings#premium", label: "Go to Settings" }
      : { href: "/cookbooks", label: "Go to Recipes" };

  return (
    <>
      <h1 className="mt-5 font-literata text-3xl font-semibold leading-tight text-kitch-charcoal">
        {title}
      </h1>
      <p className="mt-3 max-w-sm text-sm text-kitch-grey">{body}</p>
      <Link href={action.href} className={`mt-8 ${secondaryLinkClassName}`}>
        {action.label}
      </Link>
    </>
  );
}
