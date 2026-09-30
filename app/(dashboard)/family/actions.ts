"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/subscription/stripe";
import {
  isInviteId,
  isInviteState,
  type InviteState,
} from "@/lib/subscription/family-invite";

/**
 * Family plan membership: invites, removal and leaving.
 *
 * Invites go through RPCs because `family_invites` has no client policies --
 * that is what makes a link single-use. Removing and leaving are plain deletes
 * on `subscriptions_family`, whose RLS already lets the owner or the member
 * delete a seat.
 */

function revalidateMembership() {
  revalidatePath("/settings");
  // The sidebar's plan label changes when someone gains or loses a seat.
  revalidatePath("/", "layout");
}

async function requireUserId() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) return { supabase, userId: null };
  return { supabase, userId: data.claims.sub };
}

export async function createFamilyInvite(): Promise<
  { ok: true; url: string } | { ok: false; error: string }
> {
  const { supabase, userId } = await requireUserId();
  if (!userId) return { ok: false, error: "Not authenticated" };

  const { data, error } = await supabase.rpc("family_invite_create");
  if (error || !data) {
    if (error?.message.includes("family_full")) {
      return { ok: false, error: "Your family is full." };
    }
    if (error?.message.includes("not_family_owner")) {
      return { ok: false, error: "Only the owner of an active Family plan can invite people." };
    }
    return { ok: false, error: error?.message ?? "Couldn't create an invite." };
  }

  return { ok: true, url: `${getSiteUrl()}/family/join/${data}` };
}

export async function removeFamilyMember(
  memberId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { supabase, userId } = await requireUserId();
  if (!userId) return { ok: false, error: "Not authenticated" };

  // Scoped to the caller's own family on top of RLS, which would also let a
  // member delete their own row -- this action is only for owners.
  const { error } = await supabase
    .from("subscriptions_family")
    .delete()
    .eq("user_id", memberId)
    .eq("subscribed_user_id", userId);

  if (error) return { ok: false, error: error.message };

  revalidateMembership();
  return { ok: true };
}

export async function leaveFamily(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const { supabase, userId } = await requireUserId();
  if (!userId) return { ok: false, error: "Not authenticated" };

  const { error } = await supabase
    .from("subscriptions_family")
    .delete()
    .eq("user_id", userId);

  if (error) return { ok: false, error: error.message };

  revalidateMembership();
  return { ok: true };
}

/**
 * Accept or decline. On success `state` is 'accepted' or 'declined';
 * otherwise it is whatever now blocks the invite -- the page may have been
 * rendered before something changed.
 */
export async function respondToFamilyInvite(
  inviteId: string,
  accept: boolean,
): Promise<
  | { ok: true; state: "accepted" | "declined" }
  | { ok: false; state: InviteState | null; error: string }
> {
  if (!isInviteId(inviteId)) {
    return { ok: false, state: "not_found", error: "This invite link isn't valid." };
  }

  const { supabase, userId } = await requireUserId();
  if (!userId) return { ok: false, state: null, error: "Not authenticated" };

  const { data, error } = await supabase.rpc("family_invite_respond", {
    p_invite_id: inviteId,
    p_accept: accept,
  });

  if (error || !data) {
    return { ok: false, state: null, error: error?.message ?? "Something went wrong." };
  }

  if (data === "accepted" || data === "declined") {
    if (data === "accepted") revalidateMembership();
    return { ok: true, state: data };
  }

  const state = isInviteState(data) ? data : null;
  return { ok: false, state, error: "This invite can no longer be accepted." };
}
