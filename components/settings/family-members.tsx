"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Loader2, LogOut, Trash2 } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createFamilyInvite,
  leaveFamily,
  removeFamilyMember,
} from "@/app/(dashboard)/family/actions";
import type { FamilyMember } from "@/lib/subscription/family";
import { FAMILY_MAX_MEMBERS } from "@/lib/subscription/plans";

const cancelButtonClassName =
  "border-kitch-charcoal/10 bg-white text-kitch-charcoal shadow-none hover:bg-kitch-cream-dark hover:text-kitch-charcoal";

const dangerButtonClassName = "bg-kitch-red text-white shadow-sm hover:bg-kitch-red/90";

/**
 * The family block at the bottom of the Kitch Premium card.
 *
 * Everyone in the family is listed, owner first. The owner manages it --
 * remove members, copy single-use invite links. A member sees the same list
 * read-only, and can leave.
 */
export function FamilyMembers({
  members,
  isOwner,
}: {
  members: FamilyMember[];
  isOwner: boolean;
}) {
  const invite = useInviteLink();
  const memberCount = members.filter((member) => !member.isOwner).length;
  const full = memberCount >= FAMILY_MAX_MEMBERS;

  return (
    <div className="mt-6 border-t border-kitch-charcoal/10 pt-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="text-xs font-semibold uppercase tracking-wide text-kitch-grey">
            Family members
          </span>
          <p className="mt-1 text-sm text-kitch-grey">
            {isOwner
              ? `Invite up to ${FAMILY_MAX_MEMBERS} people to share your Kitch Premium benefits with.`
              : "Everyone here shares Kitch Premium through the plan owner."}
          </p>
        </div>

        {isOwner ? (
          <button
            type="button"
            onClick={invite.copy}
            disabled={invite.isPending || full}
            className="flex h-10 shrink-0 items-center gap-2 rounded-full border border-kitch-charcoal/15 bg-kitch-cream px-4 text-sm font-semibold text-kitch-charcoal transition-colors hover:bg-kitch-cream-dark disabled:opacity-60"
          >
            {invite.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : invite.copied ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            {full ? "Family is full" : invite.copied ? "Link copied" : "Copy invite link"}
          </button>
        ) : null}
      </div>

      {invite.manualUrl ? (
        <div className="mt-4 flex flex-col gap-1.5">
          <p className="text-sm text-kitch-grey">
            Couldn&apos;t copy automatically. Copy this link instead:
          </p>
          <input
            readOnly
            value={invite.manualUrl}
            onFocus={(event) => event.currentTarget.select()}
            className="h-10 w-full rounded-xl border border-kitch-charcoal/15 bg-kitch-cream px-3 text-sm text-kitch-charcoal"
          />
        </div>
      ) : null}
      {invite.error ? <p className="mt-4 text-sm text-kitch-red">{invite.error}</p> : null}

      <ul className="mt-4 flex flex-col gap-1">
        {members.map((member) => (
          <li key={member.userId} className="flex items-center gap-3 py-2">
            <Avatar
              displayName={member.displayName}
              avatarUrl={member.avatarUrl}
              sizeClassName="h-10 w-10"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-kitch-charcoal">
                {member.isSelf ? "You" : member.displayName}
              </p>
              <p className="truncate text-sm text-kitch-grey">@{member.username}</p>
            </div>
            {member.isOwner ? (
              <span className="shrink-0 rounded-full bg-kitch-charcoal/10 px-3 py-1 text-xs font-semibold text-kitch-charcoal">
                Owner
              </span>
            ) : isOwner ? (
              <RemoveMemberButton member={member} />
            ) : null}
          </li>
        ))}
      </ul>

      {!isOwner ? <LeaveFamilyButton /> : null}
    </div>
  );
}

/** Mints an invite and copies its link, falling back to showing it. */
function useInviteLink() {
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Shown only when the clipboard refuses, so the link can be copied by hand.
  const [manualUrl, setManualUrl] = useState<string | null>(null);

  function copy() {
    setError(null);
    setCopied(false);
    setManualUrl(null);

    const invite = createFamilyInvite();

    // Safari only allows a clipboard write inside the click that asked for it.
    // Handing `ClipboardItem` a promise starts the write now and fills it in
    // once the server has minted the link; `writeText` after an await would be
    // refused as no longer user-initiated.
    const text = invite.then((result) => {
      if (!result.ok) throw new Error(result.error);
      return new Blob([result.url], { type: "text/plain" });
    });

    startTransition(async () => {
      let copiedOk = false;
      try {
        if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
          await navigator.clipboard.write([new ClipboardItem({ "text/plain": text })]);
          copiedOk = true;
        }
      } catch {
        // Falls through to the checks below.
      }

      const result = await invite;
      if (!result.ok) {
        setError(result.error);
        return;
      }

      if (!copiedOk) {
        try {
          await navigator.clipboard.writeText(result.url);
          copiedOk = true;
        } catch {
          setManualUrl(result.url);
        }
      }

      if (copiedOk) setCopied(true);
    });
    // Unhandled otherwise when the invite fails and the clipboard path never
    // awaited it; the failure is reported through `result` above.
    text.catch(() => {});
  }

  return { copy, isPending, copied, error, manualUrl };
}

function RemoveMemberButton({ member }: { member: FamilyMember }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleRemove() {
    setError(null);
    startTransition(async () => {
      const result = await removeFamilyMember(member.userId);
      if (result.ok) {
        setOpen(false);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Remove ${member.displayName}`}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-kitch-grey transition-colors hover:bg-kitch-peach hover:text-kitch-red"
      >
        <Trash2 className="h-4 w-4" />
      </button>
      <DialogContent className="p-0 sm:max-w-md">
        <DialogHeader className="gap-1 p-6 pb-3 text-left">
          <DialogTitle className="text-xl">Remove {member.displayName}?</DialogTitle>
          <DialogDescription>
            They&apos;ll lose Kitch Premium right away. You can invite them again later.
          </DialogDescription>
        </DialogHeader>
        {error ? <p className="px-6 pb-2 text-sm text-kitch-red">{error}</p> : null}
        <DialogFooter className="p-6 pt-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            className={cancelButtonClassName}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleRemove}
            disabled={isPending}
            className={dangerButtonClassName}
          >
            {isPending ? "Removing…" : "Remove"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LeaveFamilyButton() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleLeave() {
    setError(null);
    startTransition(async () => {
      const result = await leaveFamily();
      if (result.ok) {
        setOpen(false);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-11 items-center gap-2 rounded-full border border-kitch-charcoal/10 bg-white px-6 text-sm font-semibold text-kitch-red transition-colors hover:bg-kitch-peach"
        >
          <LogOut className="h-4 w-4" />
          Leave family
        </button>
      </div>
      <DialogContent className="p-0 sm:max-w-md">
        <DialogHeader className="gap-1 p-6 pb-3 text-left">
          <DialogTitle className="text-xl">Leave this family?</DialogTitle>
          <DialogDescription>
            You&apos;ll lose Kitch Premium right away. To rejoin, you&apos;ll need a new invite
            from the plan owner.
          </DialogDescription>
        </DialogHeader>
        {error ? <p className="px-6 pb-2 text-sm text-kitch-red">{error}</p> : null}
        <DialogFooter className="p-6 pt-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            className={cancelButtonClassName}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleLeave}
            disabled={isPending}
            className={dangerButtonClassName}
          >
            {isPending ? "Leaving…" : "Leave family"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
