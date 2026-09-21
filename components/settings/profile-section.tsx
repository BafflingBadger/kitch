"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { User } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SettingsLabel, SettingsSection } from "@/components/settings/settings-section";
import { AvatarUpload, uploadAvatar } from "@/components/settings/avatar-upload";
import { settingsInputClassName } from "@/components/settings/styles";
import { updateProfile } from "@/app/(dashboard)/settings/actions";
import { normalizeUsername } from "@/lib/auth/username";

export function ProfileSection({
  initialDisplayName,
  initialUsername,
  initialAvatarUrl,
}: {
  initialDisplayName: string;
  initialUsername: string;
  initialAvatarUrl: string | null;
}) {
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [username, setUsername] = useState(initialUsername);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isSaving, startSaving] = useTransition();
  const router = useRouter();

  const isDirty =
    displayName !== initialDisplayName ||
    username !== initialUsername ||
    pendingFile !== null;

  useEffect(() => {
    if (!saved) return;
    const timer = setTimeout(() => setSaved(false), 2500);
    return () => clearTimeout(timer);
  }, [saved]);

  // Object URLs are held by the document until explicitly released.
  useEffect(() => {
    if (!pendingPreview) return;
    return () => URL.revokeObjectURL(pendingPreview);
  }, [pendingPreview]);

  const handleFileSelected = (file: File) => {
    setPendingFile(file);
    setPendingPreview(URL.createObjectURL(file));
    setSaved(false);
  };

  const handleSave = () => {
    setError(null);
    setSaved(false);

    startSaving(async () => {
      // Storage is only written on save, so abandoning an edit leaves nothing
      // behind in the bucket.
      let profilePicUrl = initialAvatarUrl;
      if (pendingFile) {
        const upload = await uploadAvatar(pendingFile);
        if (!upload.ok) {
          setError(upload.error);
          return;
        }
        profilePicUrl = upload.url;
      }

      const result = await updateProfile({
        displayName: displayName.trim(),
        username,
        profilePicUrl,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      // The action normalizes, so reflect what was actually stored.
      setUsername(result.username);
      setPendingFile(null);
      setPendingPreview(null);
      setSaved(true);
      // Picks up the new name and avatar in the sidebar.
      router.refresh();
    });
  };

  return (
    <SettingsSection
      id="profile"
      icon={User}
      title="Profile"
      description="This is how other cooks will see you on Kitch."
      divided={false}
    >
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
        <AvatarUpload
          displayName={displayName || initialDisplayName}
          previewUrl={pendingPreview ?? initialAvatarUrl}
          onFileSelected={handleFileSelected}
        />

        <div className="grid flex-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <SettingsLabel htmlFor="display-name">Display Name</SettingsLabel>
            <Input
              id="display-name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Your name"
              className={settingsInputClassName}
            />
          </div>

          <div className="flex flex-col gap-2">
            <SettingsLabel htmlFor="username">Username</SettingsLabel>
            <div className="relative">
              <span
                aria-hidden
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-kitch-grey"
              >
                @
              </span>
              <Input
                id="username"
                value={username}
                // Normalizing as they type keeps the field honest about what
                // will be stored, rather than silently rewriting it on save.
                onChange={(event) => setUsername(normalizeUsername(event.target.value))}
                placeholder="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className={`${settingsInputClassName} pl-8`}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-end gap-3 border-t border-kitch-charcoal/10 pt-5">
        {error ? <p className="mr-auto text-sm text-kitch-red">{error}</p> : null}
        {saved && !error ? (
          <p className="text-sm text-kitch-grey">Saved</p>
        ) : null}
        <Button
          type="button"
          onClick={handleSave}
          disabled={!isDirty || isSaving}
          className="rounded-full bg-gradient-to-r from-kitch-orange-from to-kitch-orange-to px-5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {isSaving ? "Saving…" : "Save Changes"}
        </Button>
      </div>
    </SettingsSection>
  );
}
