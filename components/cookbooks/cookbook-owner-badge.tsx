"use client";

import { useRouter } from "next/navigation";

import { Avatar } from "@/components/ui/avatar";

export function CookbookOwnerBadge({
  ownerId,
  ownerName,
  ownerAvatarUrl,
}: {
  ownerId: string;
  ownerName: string;
  ownerAvatarUrl?: string | null;
}) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        router.push(`/users/${ownerId}`);
      }}
      className="absolute bottom-2 left-2 z-10 flex items-center gap-1.5 rounded-full bg-white/90 py-1 pl-1 pr-3 shadow-sm transition-colors hover:bg-white"
    >
      <Avatar displayName={ownerName} avatarUrl={ownerAvatarUrl} sizeClassName="h-6 w-6" />
      <span className="text-xs font-medium text-kitch-charcoal">{ownerName}</span>
    </button>
  );
}
