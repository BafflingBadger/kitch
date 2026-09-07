"use client";

import { useState } from "react";
import Link from "next/link";
import { FolderMinus, MoreVertical, Pencil, Trash2 } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeleteRecipeDialog } from "@/components/recipes/delete-recipe-dialog";
import { RemoveFromCookbookDialog } from "@/components/recipes/remove-from-cookbook-dialog";

export function RecipeCardMenu({
  recipeId,
  recipeTitle,
  editHref,
  cookbookId,
  cookbookTitle,
}: {
  recipeId: number;
  recipeTitle: string;
  editHref: string;
  cookbookId: number | null;
  cookbookTitle: string;
}) {
  const [removeOpen, setRemoveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <div
        className="absolute right-2 top-2 z-10"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Recipe options"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-kitch-charcoal shadow-sm transition-colors hover:bg-white"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="min-w-[13rem] rounded-xl border border-kitch-charcoal/10 bg-white p-1.5 text-kitch-charcoal shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <DropdownMenuItem
              asChild
              className="flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm text-kitch-charcoal focus:bg-kitch-cream-dark focus:text-kitch-charcoal"
            >
              <Link href={editHref}>
                <Pencil className="h-4 w-4" />
                Edit Recipe
              </Link>
            </DropdownMenuItem>
            {cookbookId !== null ? (
              <DropdownMenuItem
                onSelect={() => setRemoveOpen(true)}
                className="flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm text-kitch-red focus:bg-kitch-red/10 focus:text-kitch-red"
              >
                <FolderMinus className="h-4 w-4" />
                Remove from Cookbook
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                onSelect={() => setDeleteOpen(true)}
                className="flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm text-kitch-red focus:bg-kitch-red/10 focus:text-kitch-red"
              >
                <Trash2 className="h-4 w-4" />
                Delete Recipe
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {cookbookId !== null ? (
        <RemoveFromCookbookDialog
          recipeId={recipeId}
          recipeName={recipeTitle}
          cookbookId={cookbookId}
          cookbookTitle={cookbookTitle}
          open={removeOpen}
          onOpenChange={setRemoveOpen}
        />
      ) : (
        <DeleteRecipeDialog
          recipeId={recipeId}
          recipeName={recipeTitle}
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
        />
      )}
    </>
  );
}
