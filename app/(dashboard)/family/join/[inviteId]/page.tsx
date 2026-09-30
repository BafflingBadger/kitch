import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";
import { FamilyInviteCard } from "@/components/family/family-invite-card";
import { isInviteId, isInviteState, type InviteState } from "@/lib/subscription/family-invite";

async function InviteContent({ params }: { params: Promise<{ inviteId: string }> }) {
  // Awaited in here rather than in the page: it is dynamic data, and reading it
  // outside the Suspense boundary would block the route from prerendering.
  const { inviteId } = await params;

  let state: InviteState = "not_found";
  let owner: { displayName: string; username: string | null; avatarUrl: string | null } | null =
    null;

  // A malformed id would make the RPC error on the uuid cast; it is simply an
  // invalid link.
  if (isInviteId(inviteId)) {
    const supabase = await createClient();
    // Read-only. Opening the link -- or a chat app unfurling it -- never
    // spends the invite; only the buttons do.
    const { data } = await supabase.rpc("family_invite_check", {
      p_invite_id: inviteId,
    });
    const row = data?.[0];
    if (row && isInviteState(row.state)) {
      state = row.state;
      if (row.owner_display_name) {
        owner = {
          displayName: row.owner_display_name,
          username: row.owner_username,
          avatarUrl: row.owner_avatar_url,
        };
      }
    }
  }

  return <FamilyInviteCard inviteId={inviteId} initialState={state} owner={owner} />;
}

export default function FamilyJoinPage({
  params,
}: {
  params: Promise<{ inviteId: string }>;
}) {
  return (
    <div className="mx-auto flex max-w-lg flex-col pt-6 sm:pt-12">
      <Suspense fallback={<div className="text-sm text-kitch-grey">Loading…</div>}>
        <InviteContent params={params} />
      </Suspense>
    </div>
  );
}
