/**
 * Family invite states and their copy, shared by the join page (server), its
 * accept/decline buttons (client) and the respond action.
 *
 * The states mirror what `family_invite_state` returns in the database.
 */

export type InviteState =
  | "ok"
  | "not_found"
  | "used"
  | "expired"
  | "own_invite"
  | "already_member"
  | "in_other_family"
  | "already_subscribed"
  | "plan_inactive"
  | "family_full";

const INVITE_STATES: readonly InviteState[] = [
  "ok",
  "not_found",
  "used",
  "expired",
  "own_invite",
  "already_member",
  "in_other_family",
  "already_subscribed",
  "plan_inactive",
  "family_full",
];

export function isInviteState(value: unknown): value is InviteState {
  return typeof value === "string" && (INVITE_STATES as readonly string[]).includes(value);
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Checked before calling the RPC, which would otherwise error on a bad uuid. */
export function isInviteId(value: string): boolean {
  return UUID_PATTERN.test(value);
}

/** Headline and body for every state that isn't `ok`. */
export function inviteStateMessage(
  state: Exclude<InviteState, "ok">,
  ownerName: string | null,
): { title: string; body: string } {
  const owner = ownerName ?? "The owner";

  switch (state) {
    case "not_found":
      return {
        title: "This invite link isn't valid",
        body: "Check that you copied the whole link, or ask for a new one.",
      };
    case "used":
      return {
        title: "This invite has already been used",
        body: "Each invite link works once. Ask for a new one if you still want to join.",
      };
    case "expired":
      return {
        title: "This invite has expired",
        body: `Invite links last 7 days. Ask ${ownerName ?? "the owner"} for a new link.`,
      };
    case "own_invite":
      return {
        title: "This is your own invite link",
        body: "Share it with someone you'd like to add to your family.",
      };
    case "already_member":
      return {
        title: "You are already in this family",
        body: "You already have Kitch Premium through this family plan.",
      };
    case "in_other_family":
      return {
        title: "You are already a part of a family",
        body: "Leave before joining this one. You can leave from the Kitch Premium section in Settings.",
      };
    case "already_subscribed":
      return {
        title: "You are already subscribed",
        body: "You have your own Kitch Premium subscription, so you don't need a family seat.",
      };
    case "plan_inactive":
      return {
        title: "This family plan is no longer active",
        body: `${owner}'s Family plan has ended, so it can't add new members.`,
      };
    case "family_full":
      return {
        title: "This family is full",
        body: `${owner}'s Family plan already has the maximum number of members.`,
      };
  }
}
