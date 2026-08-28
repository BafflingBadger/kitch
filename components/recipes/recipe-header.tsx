import Link from "next/link";
import { ArrowLeft, Pencil } from "lucide-react";

export function RecipeHeader({
  recipeId,
  backHref,
  backLabel,
}: {
  recipeId: number;
  backHref: string;
  backLabel: string;
}) {
  const editHref = `/recipes/${recipeId}/edit?backHref=${encodeURIComponent(backHref)}&backLabel=${encodeURIComponent(backLabel)}`;

  return (
    <div className="flex items-center justify-between gap-4">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-kitch-grey transition-colors hover:text-kitch-charcoal"
      >
        <ArrowLeft className="h-4 w-4" />
        {backLabel}
      </Link>
      <Link
        href={editHref}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-kitch-charcoal/10 px-4 py-2 text-sm font-medium text-kitch-charcoal transition-colors hover:bg-kitch-cream-dark"
      >
        <Pencil className="h-4 w-4" />
        Edit
      </Link>
    </div>
  );
}
