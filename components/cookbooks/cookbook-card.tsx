import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { CoverImage } from "@/components/cookbooks/cover-image";
import { CookbookCardMenu } from "@/components/cookbooks/cookbook-card-menu";

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

  return (
    <Link
      href={href}
      prefetch={false}
      className="group relative flex h-[366px] flex-col overflow-hidden rounded-2xl border border-kitch-charcoal/10 bg-white shadow-sm transition-shadow hover:shadow-md"
    >
      <CookbookCardMenu cookbookId={props.id} cookbookTitle={props.title} />
      <div className="h-[190px] shrink-0 overflow-hidden">
        <CoverImage imageUrl={props.imageUrl} alt={props.title} />
      </div>
      <div className="flex flex-1 flex-col justify-between p-5">
        <h3 className="line-clamp-2 font-literata text-xl font-semibold text-kitch-charcoal">
          {props.title}
        </h3>
        <div className="flex items-center justify-between border-t border-kitch-charcoal/10 pt-4">
          <div>
            <p className="text-base font-semibold text-kitch-charcoal">
              {props.count} Recipes
            </p>
            <p className="text-sm text-kitch-grey">{props.updatedLabel}</p>
          </div>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-kitch-peach text-kitch-red transition-transform group-hover:translate-x-0.5">
            <ArrowRight className="h-4 w-4" />
          </span>
        </div>
      </div>
    </Link>
  );
}
