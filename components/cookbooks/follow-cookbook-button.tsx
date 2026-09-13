"use client";

import { useState, useTransition } from "react";
import { Heart } from "lucide-react";

import { followCookbook, unfollowCookbook } from "@/app/(dashboard)/cookbooks/following-actions";
import { cn } from "@/lib/utils";

export function FollowCookbookButton({
  ownerId,
  cookbookId,
  initialIsFollowing,
}: {
  ownerId: string;
  cookbookId: number | null;
  initialIsFollowing: boolean;
}) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [isPending, startTransition] = useTransition();

  const handleToggle = () => {
    const previous = isFollowing;
    const next = !previous;
    setIsFollowing(next);
    startTransition(async () => {
      const result = next
        ? await followCookbook(ownerId, cookbookId)
        : await unfollowCookbook(ownerId, cookbookId);
      if (!result.ok) {
        setIsFollowing(previous);
      }
    });
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isPending}
      aria-pressed={isFollowing}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-60",
        isFollowing
          ? "border-kitch-red/20 bg-kitch-red/10 text-kitch-red"
          : "border-kitch-charcoal/10 text-kitch-charcoal hover:bg-kitch-cream-dark",
      )}
    >
      <Heart className={cn("h-4 w-4", isFollowing && "fill-kitch-red")} />
      {isFollowing ? "Following" : "Follow"}
    </button>
  );
}
