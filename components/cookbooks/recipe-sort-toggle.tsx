"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";

import { RecipeGrid, type RecipeGridItem } from "@/components/cookbooks/recipe-grid";
import { EditCookbookDialog } from "@/components/cookbooks/edit-cookbook-dialog";
import { DeleteCookbookDialog } from "@/components/cookbooks/delete-cookbook-dialog";
import { cn } from "@/lib/utils";

const SORT_OPTIONS = [
  { value: "recent", label: "Most Recent" },
  { value: "rating", label: "Highest Rated" },
] as const;

type SortMode = (typeof SORT_OPTIONS)[number]["value"];

function relativeUpdateLabel(recipes: RecipeGridItem[]) {
  if (recipes.length === 0) return "No recipes yet";
  const mostRecent = Math.max(...recipes.map((recipe) => recipe.createdAt));
  const diffDays = Math.floor((Date.now() - mostRecent) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return "Updated today";
  if (diffDays === 1) return "Updated yesterday";
  return `Updated ${diffDays} days ago`;
}

export function RecipeSortToggle({
  title,
  recipes,
  backHref,
  cookbookId,
}: {
  title: string;
  recipes: RecipeGridItem[];
  backHref: string;
  cookbookId: number | null;
}) {
  const [sort, setSort] = useState<SortMode>("recent");

  const sortedRecipes = useMemo(() => {
    const copy = [...recipes];
    if (sort === "rating") {
      copy.sort((a, b) => b.rating - a.rating || b.createdAt - a.createdAt);
    } else {
      copy.sort((a, b) => b.createdAt - a.createdAt);
    }
    return copy;
  }, [recipes, sort]);

  const recipeCountLabel = `${recipes.length} Recipe${recipes.length === 1 ? "" : "s"}`;

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/cookbooks"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-kitch-grey transition-colors hover:text-kitch-charcoal"
        >
          <ArrowLeft className="h-4 w-4" />
          Cookbooks
        </Link>
        {cookbookId !== null ? (
          <div className="flex shrink-0 items-center gap-2">
            <EditCookbookDialog
              cookbookId={cookbookId}
              trigger={
                <button
                  type="button"
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-kitch-charcoal/10 px-4 py-2 text-sm font-medium text-kitch-charcoal transition-colors hover:bg-kitch-cream-dark"
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </button>
              }
            />
            <DeleteCookbookDialog
              cookbookId={cookbookId}
              cookbookTitle={title}
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
        ) : null}
      </div>

      <h1 className="mt-4 font-literata text-4xl font-semibold text-kitch-charcoal">{title}</h1>

      <div className="mt-6 flex items-end justify-between">
        <p className="text-sm text-kitch-grey">
          {recipeCountLabel} • {relativeUpdateLabel(recipes)}
        </p>
        <div className="inline-flex items-center rounded-full border border-kitch-charcoal/10 bg-kitch-cream-dark p-1">
          {SORT_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setSort(option.value)}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                sort === option.value
                  ? "bg-gradient-to-r from-kitch-orange-from to-kitch-orange-to text-white shadow-sm"
                  : "text-kitch-charcoal/70",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8">
        <RecipeGrid recipes={sortedRecipes} backHref={backHref} backLabel={title} />
      </div>
    </div>
  );
}
