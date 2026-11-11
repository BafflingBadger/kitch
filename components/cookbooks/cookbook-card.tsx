import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { CoverImage } from "@/components/cookbooks/cover-image";
import { CookbookCardMenu } from "@/components/cookbooks/cookbook-card-menu";
import { CookbookOwnerBadge } from "@/components/cookbooks/cookbook-owner-badge";

type CookbookCardProps =
  | {
      variant: "hero";
      title: string;
      subtitle: string;
      imageUrl?: string | null;
      href?: string;
    }
  | {
      variant: "standard";
      id: number;
      title: string;
      count: number;
      updatedLabel: string;
      imageUrl?: string | null;
      href?: string;
      readOnly?: boolean;
    }
  | {
      variant: "following";
      title: string;
      count: number;
      updatedLabel: string;
      imageUrl?: string | null;
      href: string;
      ownerId: string;
      ownerName: string;
      ownerAvatarUrl?: string | null;
    };

export function CookbookCard(props: CookbookCardProps) {
  const href = props.href ?? "#";

  if (props.variant === "hero") {
    return (
      <Link
        href={href}
        prefetch={false}
        className="group relative row-span-1 col-span-2 block h-[220px] overflow-hidden sm:h-[366px] rounded-2xl"
      >
        <CoverImage imageUrl={props.imageUrl} alt={props.title} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-4 text-white sm:p-6">
          <h3 className="font-literata text-3xl font-semibold sm:text-4xl">{props.title}</h3>
          <p className="mt-1 text-sm text-white/80">{props.subtitle}</p>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      prefetch={false}
      className="group relative flex h-[280px] flex-col overflow-hidden rounded-2xl border border-kitch-charcoal/15 sm:h-[366px] bg-white shadow-[0_1px_1px_rgba(0,0,0,0.06)] transition-shadow hover:shadow-[0_2px_4px_rgba(0,0,0,0.08)]"
    >
      {props.variant === "standard" && !props.readOnly ? (
        <CookbookCardMenu cookbookId={props.id} cookbookTitle={props.title} />
      ) : null}
      <div className="relative h-[140px] shrink-0 overflow-hidden sm:h-[190px]">
        <CoverImage imageUrl={props.imageUrl} alt={props.title} />
        {props.variant === "following" ? (
          <CookbookOwnerBadge
            ownerId={props.ownerId}
            ownerName={props.ownerName}
            ownerAvatarUrl={props.ownerAvatarUrl}
          />
        ) : null}
      </div>
      <div className="flex flex-1 flex-col justify-between p-3 sm:p-5">
        <h3 className="line-clamp-2 font-literata text-base sm:text-xl font-semibold text-kitch-charcoal">
          {props.title}
        </h3>
        <div className="flex items-center justify-between gap-2 border-t border-kitch-charcoal/10 pt-3 sm:pt-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold sm:text-base text-kitch-charcoal">
              {props.count} Recipes
            </p>
            <p className="truncate text-xs text-kitch-grey sm:text-sm">{props.updatedLabel}</p>
          </div>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-kitch-peach sm:h-11 sm:w-11 text-kitch-red transition-transform group-hover:translate-x-0.5">
            <ArrowRight className="h-4 w-4" />
          </span>
        </div>
      </div>
    </Link>
  );
}
