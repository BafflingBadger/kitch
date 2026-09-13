"use server";

import { createClient } from "@/lib/supabase/server";

export interface UserSearchResult {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
}

export async function listUsersForSearch() {
  const supabase = await createClient();
  const { data: claimsData, error: authError } = await supabase.auth.getClaims();
  if (authError || !claimsData?.claims) {
    return { ok: false as const, error: "Not authenticated" };
  }
  const userId = claimsData.claims.sub;

  const { data, error } = await supabase
    .from("users")
    .select("id, display_name, username, profile_pic_url")
    .neq("id", userId)
    .order("display_name", { ascending: true });

  if (error) {
    return { ok: false as const, error: error.message };
  }

  const users: UserSearchResult[] = (data ?? []).map((user) => ({
    id: user.id,
    displayName: user.display_name,
    username: user.username,
    avatarUrl: user.profile_pic_url,
  }));

  return { ok: true as const, users };
}
