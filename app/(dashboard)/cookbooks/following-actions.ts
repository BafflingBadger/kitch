"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export async function unfollowUser(followsUserId: string) {
  if (!followsUserId) {
    return { ok: false as const, error: "Invalid user id" };
  }

  const supabase = await createClient();
  const { data: claimsData, error: authError } = await supabase.auth.getClaims();
  if (authError || !claimsData?.claims) {
    return { ok: false as const, error: "Not authenticated" };
  }
  const userId = claimsData.claims.sub;

  const { error } = await supabase
    .from("followers")
    .delete()
    .eq("user_id", userId)
    .eq("follows_user_id", followsUserId)
    .eq("follow_type", "user");

  if (error) {
    return { ok: false as const, error: error.message };
  }

  revalidatePath("/cookbooks");
  revalidatePath("/users/[id]", "page");

  return { ok: true as const };
}

export async function followUser(followsUserId: string) {
  if (!followsUserId) {
    return { ok: false as const, error: "Invalid user id" };
  }

  const supabase = await createClient();
  const { data: claimsData, error: authError } = await supabase.auth.getClaims();
  if (authError || !claimsData?.claims) {
    return { ok: false as const, error: "Not authenticated" };
  }
  const userId = claimsData.claims.sub;

  if (userId === followsUserId) {
    return { ok: false as const, error: "You can't follow yourself" };
  }

  const { data: existing } = await supabase
    .from("followers")
    .select("id")
    .eq("user_id", userId)
    .eq("follows_user_id", followsUserId)
    .eq("follow_type", "user")
    .maybeSingle();

  if (existing) {
    return { ok: true as const };
  }

  const { error } = await supabase.from("followers").insert({
    user_id: userId,
    follows_user_id: followsUserId,
    follows_cookbook_id: null,
    follow_type: "user",
  });

  if (error) {
    return { ok: false as const, error: error.message };
  }

  revalidatePath("/cookbooks");
  revalidatePath("/users/[id]", "page");

  return { ok: true as const };
}

export async function followCookbook(ownerId: string, cookbookId: number | null) {
  if (!ownerId) {
    return { ok: false as const, error: "Invalid user id" };
  }

  const supabase = await createClient();
  const { data: claimsData, error: authError } = await supabase.auth.getClaims();
  if (authError || !claimsData?.claims) {
    return { ok: false as const, error: "Not authenticated" };
  }
  const userId = claimsData.claims.sub;

  if (userId === ownerId) {
    return { ok: false as const, error: "You can't follow your own cookbook" };
  }

  const existingQuery = supabase
    .from("followers")
    .select("id")
    .eq("user_id", userId)
    .eq("follows_user_id", ownerId)
    .eq("follow_type", "cookbook");
  const { data: existing } =
    cookbookId === null
      ? await existingQuery.is("follows_cookbook_id", null).maybeSingle()
      : await existingQuery.eq("follows_cookbook_id", cookbookId).maybeSingle();

  if (existing) {
    return { ok: true as const };
  }

  const { error } = await supabase.from("followers").insert({
    user_id: userId,
    follows_user_id: ownerId,
    follows_cookbook_id: cookbookId,
    follow_type: "cookbook",
  });

  if (error) {
    return { ok: false as const, error: error.message };
  }

  revalidatePath("/cookbooks");
  revalidatePath("/cookbooks/[id]", "page");

  return { ok: true as const };
}

export async function unfollowCookbook(ownerId: string, cookbookId: number | null) {
  if (!ownerId) {
    return { ok: false as const, error: "Invalid user id" };
  }

  const supabase = await createClient();
  const { data: claimsData, error: authError } = await supabase.auth.getClaims();
  if (authError || !claimsData?.claims) {
    return { ok: false as const, error: "Not authenticated" };
  }
  const userId = claimsData.claims.sub;

  const deleteQuery = supabase
    .from("followers")
    .delete()
    .eq("user_id", userId)
    .eq("follows_user_id", ownerId)
    .eq("follow_type", "cookbook");
  const { error } =
    cookbookId === null
      ? await deleteQuery.is("follows_cookbook_id", null)
      : await deleteQuery.eq("follows_cookbook_id", cookbookId);

  if (error) {
    return { ok: false as const, error: error.message };
  }

  revalidatePath("/cookbooks");
  revalidatePath("/cookbooks/[id]", "page");

  return { ok: true as const };
}
