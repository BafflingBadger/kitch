import Link from "next/link";
import { Facebook, FileText, Instagram, PlayCircle, Star, type LucideIcon } from "lucide-react";

import { CoverImage } from "@/components/cookbooks/cover-image";
import { RecipeCardMenu } from "@/components/cookbooks/recipe-card-menu";
import { cn } from "@/lib/utils";

const SOURCE_META: Record<
  "facebook" | "instagram" | "tiktok" | "blog",
  { label: string; icon: LucideIcon; className: string }
> = {
  facebook: {
    label: "Facebook",
    icon: Facebook,
    className: "border-blue-200 bg-blue-50 text-blue-600",
  },
  instagram: {
    label: "Instagram",
    icon: Instagram,
    className: "border-rose-200 bg-rose-50 text-rose-600",
  },
  tiktok: {
    label: "TikTok",
    icon: PlayCircle,
    className: "border-emerald-200 bg-emerald-50 text-emerald-600",
  },
  blog: {
    label: "Blog",
    icon: FileText,
    className: "border-violet-200 bg-violet-50 text-violet-600",
  },
};

export function sourceMeta(source: string | null) {
  const trimmed = source?.trim().toLowerCase();
  if (trimmed === "facebook" || trimmed === "instagram" || trimmed === "tiktok") {
    return SOURCE_META[trimmed];
  }
  return SOURCE_META.blog;
}

export interface RecipeCardProps {
  id: number;
  title: string;
  imageUrl: string | null;
  source: string | null;
  rating: number;
  backHref?: string;
  backLabel?: string;
  cookbookId?: number | null;
  ownerId?: string | null;
}

export function RecipeCard({
  id,
  title,
  imageUrl,
  source,
  rating,
  backHref,
  backLabel,
  cookbookId = null,
  ownerId = null,
}: RecipeCardProps) {
  const { label, icon: Icon, className } = sourceMeta(source);

  const query = new URLSearchParams();
  if (backHref) query.set("backHref", backHref);
  if (backLabel) query.set("backLabel", backLabel);
  if (ownerId) query.set("owner", ownerId);
  const queryString = query.size > 0 ? `?${query.toString()}` : "";
  const href = `/recipes/${id}${queryString}`;
  const editHref = `/recipes/${id}/edit${queryString}`;

  return (
    <Link
      href={href}
      prefetch={false}
      className="group relative flex h-[280px] flex-col sm:h-[366px] overflow-hidden rounded-2xl border border-kitch-charcoal/10 bg-white shadow-sm transition-shadow hover:shadow-md"
    >
      {!ownerId ? (
        <RecipeCardMenu
          recipeId={id}
          recipeTitle={title}
          editHref={editHref}
          cookbookId={cookbookId}
          cookbookTitle={backLabel ?? ""}
        />
      ) : null}
      <div className="h-[140px] shrink-0 overflow-hidden sm:h-[190px]">
        <CoverImage imageUrl={imageUrl} alt={title} />
      </div>
      <div className="flex flex-1 flex-col justify-between p-3 sm:p-5">
        <h3 className="line-clamp-3 font-literata text-base sm:text-xl font-semibold text-kitch-charcoal">
          {title}
        </h3>
        <div className="mt-3 flex items-center justify-between gap-2 sm:mt-4">
          <span
            className={cn(
              "inline-flex min-w-0 items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-sm",
              className,
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
            <span className="truncate">{label}</span>
          </span>
          {rating > 0 ? (
            <span className="flex shrink-0 items-center gap-1 text-sm font-semibold text-kitch-charcoal sm:text-base">
              <Star className="h-4 w-4 fill-red-500 text-red-500" />
              {rating}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
