import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";

const BUCKET = "profiles";
const OWN_AVATAR_PREFIX = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/`;
const FETCH_TIMEOUT_MS = 5000;
const MAX_BYTES = 5 * 1024 * 1024; // matches the bucket's file size limit

/**
 * Only provider avatar hosts are ever fetched. `profile_pic_url` is
 * user-writable, so fetching whatever it holds would let anyone point this
 * server at an internal address and read the response back out of the bucket.
 * Apple supplies no avatar, so Google's image CDN is the whole list.
 */
function isProviderAvatarUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      (url.hostname === "googleusercontent.com" ||
        url.hostname.endsWith(".googleusercontent.com"))
    );
  } catch {
    return false;
  }
}

// Google hands back PNGs as often as JPEGs, so the extension is derived from
// the response rather than assumed.
const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

/**
 * Copies an OAuth provider's avatar into our own `profiles` bucket.
 *
 * Rehosting matters because provider URLs (Google's `lh3.googleusercontent.com`
 * and friends) can be rotated or revoked, at which point the avatar 404s.
 *
 * Only new accounts get a provider avatar. `User_AfterInsert` seeds
 * `profile_pic_url` with the raw provider URL as the account is created, and
 * this reads that column back -- so when an existing user signs in with Google
 * or Apple for the first time, the trigger never fired, the column is untouched,
 * and their profile picture is deliberately left alone.
 *
 * Objects are written to the bucket root as `<uuid>.<ext>` and the column holds
 * the full public URL -- both conventions are set by the existing iOS app.
 *
 * Never throws: a failed mirror leaves the provider URL in place, which still
 * renders, and must not block sign-in.
 */
export async function mirrorProviderAvatar(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<void> {
  try {
    const { data: profile } = await supabase
      .from("users")
      .select("profile_pic_url")
      .eq("id", userId)
      .maybeSingle();

    const current = profile?.profile_pic_url;

    // Empty means this is an existing account that never had a picture -- don't
    // give them one just because they linked a provider.
    if (!current) return;

    // Already rehosted, or the user chose their own avatar. Without this, every
    // sign-in would upload a fresh copy and orphan the previous one.
    if (current.startsWith(OWN_AVATAR_PREFIX)) return;

    if (!isProviderAvatarUrl(current)) return;

    const response = await fetch(current, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      // A redirect could hop from the allowed host to an internal one.
      redirect: "error",
    });
    if (!response.ok) return;

    // e.g. "image/png; charset=binary" -> "image/png"
    const contentType = (response.headers.get("content-type") ?? "")
      .split(";")[0]
      .trim()
      .toLowerCase();
    if (!contentType.startsWith("image/")) return;

    const blob = await response.blob();
    if (blob.size === 0 || blob.size > MAX_BYTES) return;

    const extension = EXTENSION_BY_TYPE[contentType] ?? "jpg";
    const path = `${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, blob, { contentType, upsert: false });
    if (uploadError) return;

    const {
      data: { publicUrl },
    } = supabase.storage.from(BUCKET).getPublicUrl(path);

    await supabase
      .from("users")
      .update({ profile_pic_url: publicUrl })
      .eq("id", userId);
  } catch {
    // Best effort only -- the provider URL remains usable.
  }
}
