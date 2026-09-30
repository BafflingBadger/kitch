import { createClient } from "@/lib/supabase/server";

export interface FamilyMember {
  userId: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  isOwner: boolean;
  isSelf: boolean;
}

/**
 * Everyone in the caller's family -- the owner first, then members in the
 * order they joined -- whether the caller owns the plan or holds a seat on it.
 *
 * Goes through an RPC because RLS only shows a member their own
 * `subscriptions_family` row, not the people they share the plan with.
 * Returns an empty list on error: this only drives a display list.
 */
export async function getFamilyMembers(): Promise<FamilyMember[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("family_get_members");

  if (error || !data) return [];

  return data.map((row) => ({
    userId: row.user_id,
    displayName: row.display_name,
    username: row.username,
    avatarUrl: row.profile_pic_url,
    isOwner: row.is_owner,
    isSelf: row.is_self,
  }));
}
