"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { LIMITS } from "@/lib/validation/limits";
import { normalizeUsername, validateUsername } from "@/lib/auth/username";

/** Thrown by `delete_own_account()` when the session is not freshly authenticated. */
const REAUTH_REQUIRED = "reauthentication_required";

const AVATAR_BUCKET = "profiles";
const AVATAR_MARKER = `/storage/v1/object/public/${AVATAR_BUCKET}/`;

/**
 * The storage object name inside `profile_pic_url`, or null when the column
 * still holds a provider URL we never rehosted and therefore cannot delete.
 */
function profileStorageObject(url: string | null | undefined) {
  if (!url) return null;
  const marker = url.indexOf(AVATAR_MARKER);
  if (marker === -1) return null;
  return url.slice(marker + AVATAR_MARKER.length) || null;
}

/** Turns what the account-deletion RPCs raise into something readable. */
function describeRpcError(error: { message: string }) {
  if (error.message.includes(REAUTH_REQUIRED)) return REAUTH_REQUIRED;
  if (
    error.message.includes("assert_recent_auth") ||
    error.message.includes("delete_own_account")
  ) {
    return "Account deletion isn't enabled yet -- the database migration hasn't been applied.";
  }
  return error.message;
}

export async function updateProfile(input: {
  displayName: string;
  username: string;
  profilePicUrl: string | null;
}) {
  const displayName = input.displayName.trim();
  if (!displayName) {
    return { ok: false as const, error: "Please enter a display name." };
  }
  if (displayName.length > LIMITS.displayName) {
    return {
      ok: false as const,
      error: `Display names can be up to ${LIMITS.displayName} characters.`,
    };
  }

  const usernameError = validateUsername(input.username);
  if (usernameError) {
    return { ok: false as const, error: usernameError };
  }
  const username = normalizeUsername(input.username);

  const supabase = await createClient();
  const { data: claimsData, error: authError } = await supabase.auth.getClaims();
  if (authError || !claimsData?.claims) {
    return { ok: false as const, error: "Not authenticated" };
  }
  const userId = claimsData.claims.sub;

  // A new picture must be an image in our own bucket (what the avatar uploader
  // produces), or none. Anything else could aim the OAuth avatar mirror at an
  // arbitrary URL, or claim another user's file so the delete policy would let
  // us remove it. Leaving the current value alone is always allowed -- it may
  // be a provider URL from sign-up that was never rehosted.
  const ownAvatarPrefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}${AVATAR_MARKER}`;
  if (
    input.profilePicUrl !== null &&
    !input.profilePicUrl.startsWith(ownAvatarPrefix)
  ) {
    const { data: current } = await supabase
      .from("users")
      .select("profile_pic_url")
      .eq("id", userId)
      .maybeSingle();
    if (input.profilePicUrl !== current?.profile_pic_url) {
      return { ok: false as const, error: "That profile picture isn't valid." };
    }
  }

  const { error } = await supabase
    .from("users")
    .update({
      display_name: displayName,
      username,
      profile_pic_url: input.profilePicUrl,
    })
    .eq("id", userId);

  if (error) {
    // `users_username_lower_key` is case-insensitive, so a collision here is a
    // taken username rather than anything the user can fix by re-casing it.
    if (error.code === "23505") {
      return { ok: false as const, error: "That username is already taken." };
    }
    return { ok: false as const, error: error.message };
  }

  revalidatePath("/settings");
  revalidatePath("/cookbooks"); // the sidebar renders the name and avatar
  revalidatePath("/users/[id]", "page");
  return { ok: true as const, username };
}

/**
 * Permanently deletes the signed-in user.
 *
 * Storage is cleared first on purpose: the `recipes` bucket delete policy proves
 * ownership by joining back to `recipes`, so it stops authorizing those objects
 * the moment the rows are gone. Same ordering constraint as deleteRecipe in
 * `app/(dashboard)/recipes/[id]/actions.ts`.
 *
 * Everything else follows from the database -- `delete_own_account()` removes
 * the `auth.users` row and the foreign keys cascade through `public.users` to
 * recipes, cookbooks, and their mappings.
 */
export async function deleteAccount() {
  const supabase = await createClient();
  const { data: claimsData, error: authError } = await supabase.auth.getClaims();
  if (authError || !claimsData?.claims) {
    return { ok: false as const, error: "Not authenticated" };
  }
  const userId = claimsData.claims.sub;

  // Preflight before anything irreversible. Storage has to be cleared while the
  // recipe rows still exist (the bucket's delete policy proves ownership by
  // joining back to them), so a session the database would refuse must be
  // caught here -- otherwise the images go and the account stays.
  const preflight = await supabase.rpc("assert_recent_auth");
  if (preflight.error) {
    return { ok: false as const, error: describeRpcError(preflight.error) };
  }

  const { data: recipes } = await supabase
    .from("recipes")
    .select("id, thumbnail")
    .eq("user_id", userId);

  const { data: profile } = await supabase
    .from("users")
    .select("profile_pic_url")
    .eq("id", userId)
    .maybeSingle();

  const recipeIds = (recipes ?? []).map((recipe) => recipe.id);
  const { data: sourceImages } = recipeIds.length
    ? await supabase
        .from("recipe_source_images")
        .select("storage_path")
        .in("recipe_id", recipeIds)
    : { data: [] };

  const storagePaths = [
    ...(recipes ?? []).flatMap((recipe) => (recipe.thumbnail ? [recipe.thumbnail] : [])),
    ...(sourceImages ?? []).map((image) => image.storage_path),
  ];

  if (storagePaths.length) {
    const { error: storageError } = await supabase.storage
      .from("recipes")
      .remove(storagePaths);
    if (storageError) {
      return { ok: false as const, error: storageError.message };
    }
  }

  // Before the RPC, for the same reason as the recipe files above: the profiles
  // delete policy authorizes the object the caller's own `users` row points at,
  // and that row is about to be cascaded away.
  const avatarObject = profileStorageObject(profile?.profile_pic_url);
  if (avatarObject) {
    // A leftover avatar is not worth stranding the user in a half-deleted
    // account, so a failure here is logged rather than returned.
    const { error: avatarError } = await supabase.storage
      .from(AVATAR_BUCKET)
      .remove([avatarObject]);
    if (avatarError) {
      console.error("Failed to remove avatar during account deletion", avatarError);
    }
  }

  const { error } = await supabase.rpc("delete_own_account");

  if (error) {
    return { ok: false as const, error: describeRpcError(error) };
  }

  // The session is dead on the server; clear the cookies so the client isn't
  // left holding a token for a user that no longer exists.
  await supabase.auth.signOut();
  return { ok: true as const };
}
