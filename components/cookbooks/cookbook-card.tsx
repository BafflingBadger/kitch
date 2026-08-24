import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";

import { CoverImage } from "@/components/cookbooks/cover-image";
import { cn } from "@/lib/utils";

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
      title: string;
      subtitle?: string;
      count: number;
      imageUrl?: string | null;
      href?: string;
    }
  | {
      variant: "create";
      href?: string;
    };

export function CookbookCard(props: CookbookCardProps) {
  const href = props.href ?? "#";

  if (props.variant === "hero") {
    return (
      <Link
        href={href}
        prefetch={false}
        className="group relative row-span-1 col-span-2 block h-[366px] overflow-hidden rounded-2xl"
      >
        <CoverImage imageUrl={props.imageUrl} alt={props.title} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-6 text-white">
          <h3 className="font-literata text-4xl font-semibold">{props.title}</h3>
          <p className="mt-1 text-sm text-white/80">{props.subtitle}</p>
        </div>
      </Link>
    );
  }

  if (props.variant === "standard") {
    return (
      <Link
        href={href}
        prefetch={false}
        className="group flex h-[366px] flex-col overflow-hidden rounded-2xl border border-kitch-charcoal/10 bg-white shadow-sm transition-shadow hover:shadow-md"
      >
        <div className="h-[190px] shrink-0 overflow-hidden">
          <CoverImage imageUrl={props.imageUrl} alt={props.title} />
        </div>
        <div className="flex flex-1 flex-col justify-between p-5">
          <div>
            <h3 className="line-clamp-3 font-literata text-xl font-semibold text-kitch-charcoal">
              {props.title}
            </h3>
            {props.subtitle ? (
              <p className="mt-1 text-sm text-kitch-grey">{props.subtitle}</p>
            ) : null}
          </div>
          <div className="mt-4 flex items-center justify-between">
            <span className="rounded-full bg-kitch-peach px-3 py-1 text-xs font-medium text-kitch-peach-foreground">
              {props.count} Recipes
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-kitch-peach text-kitch-red transition-transform group-hover:translate-x-0.5">
              <ArrowRight className="h-4 w-4" />
            </span>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      prefetch={false}
      className={cn(
        "flex h-[366px] flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-kitch-grey/30 text-center transition-colors hover:border-kitch-grey/50 hover:bg-kitch-cream-dark",
      )}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-kitch-cream-dark text-kitch-charcoal">
        <Plus className="h-5 w-5" />
      </span>
      <div>
        <p className="font-literata text-lg font-semibold text-kitch-charcoal">New Cookbook</p>
        <p className="mt-1 text-sm text-kitch-grey">Create a new collection</p>
      </div>
    </Link>
  );
}
