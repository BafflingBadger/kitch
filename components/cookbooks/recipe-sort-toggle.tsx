"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Pencil, Search, Trash2 } from "lucide-react";

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
  initialQuery,
}: {
  title: string;
  recipes: RecipeGridItem[];
  backHref: string;
  cookbookId: number | null;
  initialQuery?: string;
}) {
  const [sort, setSort] = useState<SortMode>("recent");
  const [query, setQuery] = useState(initialQuery ?? "");

  // Next.js reuses this component across navigations that only change the `q`
  // param (e.g. searching again from the nav bar while already on this page),
  // so the initial-value useState above won't pick up later prop changes on
  // its own — re-sync whenever a fresh initialQuery arrives.
  useEffect(() => {
    setQuery(initialQuery ?? "");
  }, [initialQuery]);

  const filteredRecipes = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    return trimmed
      ? recipes.filter((recipe) => recipe.title.toLowerCase().includes(trimmed))
      : recipes;
  }, [recipes, query]);

  const sortedRecipes = useMemo(() => {
    const copy = [...filteredRecipes];
    if (sort === "rating") {
      copy.sort((a, b) => b.rating - a.rating || b.createdAt - a.createdAt);
    } else {
      copy.sort((a, b) => b.createdAt - a.createdAt);
    }
    return copy;
  }, [filteredRecipes, sort]);

  const recipeCountLabel = `${filteredRecipes.length} Recipe${filteredRecipes.length === 1 ? "" : "s"}`;

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

      <div className="mt-6 flex items-center justify-between gap-4">
        <p className="text-sm text-kitch-grey">
          {recipeCountLabel} • {relativeUpdateLabel(filteredRecipes)}
        </p>
        <div className="flex shrink-0 items-center gap-3">
          <div className="flex w-56 items-center gap-2 rounded-full border border-kitch-charcoal/10 bg-kitch-cream-dark px-3.5 py-2 focus-within:border-kitch-red/40">
            <Search className="h-4 w-4 shrink-0 text-kitch-grey" />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search recipes..."
              className="w-full bg-transparent text-sm text-kitch-charcoal placeholder:text-kitch-grey focus:outline-none"
            />
          </div>
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
      </div>

      <div className="mt-8">
        <RecipeGrid
          recipes={sortedRecipes}
          backHref={backHref}
          backLabel={title}
          cookbookId={cookbookId}
          emptyMessage={query.trim() ? `No recipes match "${query.trim()}"` : undefined}
        />
      </div>
    </div>
  );
}
