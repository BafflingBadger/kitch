import Link from "next/link";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";

import { DeleteRecipeDialog } from "@/components/recipes/delete-recipe-dialog";

export function RecipeHeader({
  recipeId,
  recipeName,
  backHref,
  backLabel,
}: {
  recipeId: number;
  recipeName: string;
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
      <div className="flex shrink-0 items-center gap-2">
        <Link
          href={editHref}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-kitch-charcoal/10 px-4 py-2 text-sm font-medium text-kitch-charcoal transition-colors hover:bg-kitch-cream-dark"
        >
          <Pencil className="h-4 w-4" />
          Edit
        </Link>
        <DeleteRecipeDialog
          recipeId={recipeId}
          recipeName={recipeName}
          backHref={backHref}
          trigger={
            <button
              type="button"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-kitch-red/20 px-4 py-2 text-sm font-medium text-kitch-red transition-colors hover:bg-kitch-red/10"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          }
        />
      </div>
    </div>
  );
}
