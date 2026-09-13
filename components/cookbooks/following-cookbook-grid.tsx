import Link from "next/link";
import { Plus } from "lucide-react";

import { CookbookCard } from "@/components/cookbooks/cookbook-card";

export interface FollowingCookbookItem {
  key: string;
  href: string;
  title: string;
  count: number;
  updatedLabel: string;
  imageUrl: string | null;
  ownerId: string;
  ownerName: string;
  ownerAvatarUrl: string | null;
}

export function FollowingCookbookGrid({
  cookbooks,
}: {
  cookbooks: FollowingCookbookItem[];
}) {
  if (cookbooks.length === 0) {
    return (
      <Link
        href="/discover"
        className="inline-flex shrink-0 items-center gap-2 rounded-full border border-dashed border-kitch-charcoal/20 bg-white py-1.5 pl-1.5 pr-3 transition-colors hover:border-kitch-charcoal/40 hover:bg-kitch-cream-dark"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-kitch-charcoal/15 bg-kitch-cream-dark text-kitch-grey">
          <Plus className="h-3.5 w-3.5" />
        </span>
        <span className="text-sm font-medium text-kitch-charcoal">Add Cookbooks</span>
      </Link>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
      {cookbooks.map((cookbook) => (
        <CookbookCard
          key={cookbook.key}
          variant="following"
          title={cookbook.title}
          count={cookbook.count}
          updatedLabel={cookbook.updatedLabel}
          imageUrl={cookbook.imageUrl}
          href={cookbook.href}
          ownerId={cookbook.ownerId}
          ownerName={cookbook.ownerName}
          ownerAvatarUrl={cookbook.ownerAvatarUrl}
        />
      ))}
    </div>
  );
}
