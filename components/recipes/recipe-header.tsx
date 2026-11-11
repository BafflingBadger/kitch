import Link from "next/link";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";

import { DeleteRecipeDialog } from "@/components/recipes/delete-recipe-dialog";
import { Avatar } from "@/components/ui/avatar";

export function RecipeHeader({
  recipeId,
  recipeName,
  backHref,
  backLabel,
  isOwner = true,
  ownerName = null,
  ownerAvatarUrl = null,
}: {
  recipeId: number;
  recipeName: string;
  backHref: string;
  backLabel: string;
  isOwner?: boolean;
  ownerName?: string | null;
  ownerAvatarUrl?: string | null;
}) {
  const editHref = `/recipes/${recipeId}/edit?backHref=${encodeURIComponent(backHref)}&backLabel=${encodeURIComponent(backLabel)}`;

  return (
    <div className="flex items-center justify-between gap-4">
      <Link
        href={backHref}
        className="inline-flex min-w-0 items-center gap-1.5 text-sm font-medium text-kitch-grey transition-colors hover:text-kitch-charcoal"
      >
        <ArrowLeft className="h-4 w-4 shrink-0" />
        <span className="truncate">{backLabel}</span>
      </Link>
      {isOwner ? (
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href={editHref}
            aria-label="Edit recipe"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-kitch-charcoal/10 px-3 py-2 text-sm font-medium text-kitch-charcoal sm:px-4 transition-colors hover:bg-kitch-cream-dark"
          >
            <Pencil className="h-4 w-4" />
            <span className="hidden sm:inline">Edit</span>
          </Link>
          <DeleteRecipeDialog
            recipeId={recipeId}
            recipeName={recipeName}
            backHref={backHref}
            trigger={
              <button
                type="button"
                aria-label="Delete recipe"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-kitch-red/20 px-3 py-2 text-sm font-medium text-kitch-red sm:px-4 transition-colors hover:bg-kitch-red/10"
              >
                <Trash2 className="h-4 w-4" />
                <span className="hidden sm:inline">Delete</span>
              </button>
            }
          />
        </div>
      ) : ownerName ? (
        <div className="flex min-w-0 items-center gap-2">
          <Avatar displayName={ownerName} avatarUrl={ownerAvatarUrl} sizeClassName="h-6 w-6" />
          <span className="truncate text-sm text-kitch-grey">By {ownerName}</span>
        </div>
      ) : null}
    </div>
  );
}
