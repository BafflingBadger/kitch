import Link from "next/link";
import { Facebook, FileText, Instagram, PlayCircle, Star, type LucideIcon } from "lucide-react";

import { CoverImage } from "@/components/cookbooks/cover-image";
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
}

export function RecipeCard({
  id,
  title,
  imageUrl,
  source,
  rating,
  backHref,
  backLabel,
}: RecipeCardProps) {
  const { label, icon: Icon, className } = sourceMeta(source);

  const query = new URLSearchParams();
  if (backHref) query.set("backHref", backHref);
  if (backLabel) query.set("backLabel", backLabel);
  const href = query.size > 0 ? `/recipes/${id}?${query.toString()}` : `/recipes/${id}`;

  return (
    <Link
      href={href}
      prefetch={false}
      className="group flex h-[366px] flex-col overflow-hidden rounded-2xl border border-kitch-charcoal/10 bg-white shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="h-[190px] shrink-0 overflow-hidden">
        <CoverImage imageUrl={imageUrl} alt={title} />
      </div>
      <div className="flex flex-1 flex-col justify-between p-5">
        <h3 className="line-clamp-3 font-literata text-xl font-semibold text-kitch-charcoal">
          {title}
        </h3>
        <div className="mt-4 flex items-center justify-between">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium",
              className,
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </span>
          {rating > 0 ? (
            <span className="flex items-center gap-1 text-base font-semibold text-kitch-charcoal">
              <Star className="h-4 w-4 fill-red-500 text-red-500" />
              {rating}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
