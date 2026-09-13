"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Plus, X } from "lucide-react";

import { unfollowUser } from "@/app/(dashboard)/cookbooks/following-actions";
import { Avatar } from "@/components/ui/avatar";

export interface FollowingUserItem {
  id: string;
  displayName: string;
  avatarUrl: string | null;
}

export function FollowingUsersRow({ users }: { users: FollowingUserItem[] }) {
  const [items, setItems] = useState(users);
  const [, startTransition] = useTransition();

  if (items.length === 0) {
    return (
      <Link
        href="/discover"
        className="inline-flex shrink-0 items-center gap-2 rounded-full border border-dashed border-kitch-charcoal/20 bg-white py-1.5 pl-1.5 pr-3 transition-colors hover:border-kitch-charcoal/40 hover:bg-kitch-cream-dark"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-kitch-charcoal/15 bg-kitch-cream-dark text-kitch-grey">
          <Plus className="h-3.5 w-3.5" />
        </span>
        <span className="text-sm font-medium text-kitch-charcoal">Add Users</span>
      </Link>
    );
  }

  const handleUnfollow = (userId: string) => {
    const previous = items;
    setItems((current) => current.filter((user) => user.id !== userId));
    startTransition(async () => {
      const result = await unfollowUser(userId);
      if (!result.ok) {
        setItems(previous);
      }
    });
  };

  return (
    <div className="flex items-center gap-3 overflow-x-auto pb-1">
      {items.map((user) => (
        <div
          key={user.id}
          className="inline-flex shrink-0 items-center gap-2 rounded-full border border-kitch-charcoal/10 bg-white py-1.5 pl-1.5 pr-3"
        >
          <Link
            href={`/users/${user.id}`}
            className="flex items-center gap-2 hover:opacity-80"
          >
            <Avatar displayName={user.displayName} avatarUrl={user.avatarUrl} sizeClassName="h-7 w-7" />
            <span className="text-sm font-medium text-kitch-charcoal">{user.displayName}</span>
          </Link>
          <button
            type="button"
            onClick={() => handleUnfollow(user.id)}
            aria-label={`Unfollow ${user.displayName}`}
            className="text-kitch-grey transition-colors hover:text-kitch-red"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
