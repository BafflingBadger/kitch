"use client";

import { useRef, useState } from "react";

import { Avatar } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/client";

const BUCKET = "profiles";
const MAX_BYTES = 5 * 1024 * 1024; // matches the bucket's file size limit

// The stored extension has to match the real type, since the public URL is what
// gets served back. Same mapping `lib/auth/mirror-avatar.ts` uses.
const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

/**
 * Uploads a chosen avatar and returns its public URL.
 *
 * Deliberately *not* called when the file is picked. Uploading on pick left a
 * file in the bucket whenever someone chose a photo and then navigated away
 * without saving, and nothing referenced it afterwards. Saving is now the only
 * thing that writes to storage.
 *
 * Follows the convention `lib/auth/mirror-avatar.ts` set rather than the one
 * `recipe-image-upload.tsx` uses: the object goes to the bucket *root* as
 * `<uuid>.<ext>` and the caller stores the **full public URL**, not a path.
 * That is load-bearing -- `mirrorProviderAvatar` decides whether a picture is
 * already ours by looking for the storage marker in that URL, so a bare path
 * would make it re-mirror the provider's avatar on the next OAuth sign-in and
 * quietly undo whatever the user picked here.
 */
export async function uploadAvatar(
  file: File,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const extension = EXTENSION_BY_TYPE[file.type.toLowerCase()] ?? "jpg";
  const path = `${crypto.randomUUID()}.${extension}`;

  const supabase = createClient();
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (error) return { ok: false, error: error.message };

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(path);

  return { ok: true, url: publicUrl };
}

/** Validates a picked file. Returns an error message, or null when usable. */
export function validateAvatarFile(file: File): string | null {
  if (!file.type.startsWith("image/")) return "Please choose an image file.";
  if (file.size > MAX_BYTES) return "Images must be under 5 MB.";
  return null;
}

export function AvatarUpload({
  displayName,
  previewUrl,
  onFileSelected,
}: {
  displayName: string;
  /** Either the saved avatar or a local object URL for a pending pick. */
  previewUrl: string | null;
  onFileSelected: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const validationError = validateAvatarFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    onFileSelected(file);
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <Avatar
        displayName={displayName}
        avatarUrl={previewUrl}
        sizeClassName="h-24 w-24"
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="text-sm font-semibold text-kitch-red transition-colors hover:text-kitch-red/80"
      >
        Change photo
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="sr-only"
      />
      {error ? <p className="text-center text-sm text-kitch-red">{error}</p> : null}
    </div>
  );
}
