"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUpDown, Check, Pencil, Search, Trash2 } from "lucide-react";

import { RecipeGrid, type RecipeGridItem } from "@/components/cookbooks/recipe-grid";
import { EditCookbookDialog } from "@/components/cookbooks/edit-cookbook-dialog";
import { DeleteCookbookDialog } from "@/components/cookbooks/delete-cookbook-dialog";
import { FollowCookbookButton } from "@/components/cookbooks/follow-cookbook-button";
import { Avatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  readOnly = false,
  ownerId = null,
  ownerName = null,
  ownerAvatarUrl = null,
  isFollowing = false,
  topBackHref = "/cookbooks",
  topBackLabel = "Cookbooks",
}: {
  title: string;
  recipes: RecipeGridItem[];
  backHref: string;
  cookbookId: number | null;
  initialQuery?: string;
  readOnly?: boolean;
  ownerId?: string | null;
  ownerName?: string | null;
  ownerAvatarUrl?: string | null;
  isFollowing?: boolean;
  topBackHref?: string;
  topBackLabel?: string;
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
      <div className="flex items-start justify-between gap-4">
        <Link
          href={topBackHref}
          className="inline-flex min-w-0 items-center gap-1.5 text-sm font-medium text-kitch-grey transition-colors hover:text-kitch-charcoal"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" />
          <span className="truncate">{topBackLabel}</span>
        </Link>
        {cookbookId !== null && !readOnly ? (
          <div className="flex shrink-0 items-center gap-2">
            <EditCookbookDialog
              cookbookId={cookbookId}
              trigger={
                <button
                  type="button"
                  aria-label="Edit cookbook"
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-kitch-charcoal/10 px-3 py-2 text-sm font-medium text-kitch-charcoal sm:px-4 transition-colors hover:bg-kitch-cream-dark"
                >
                  <Pencil className="h-4 w-4" />
                  <span className="hidden sm:inline">Edit</span>
                </button>
              }
            />
            <DeleteCookbookDialog
              cookbookId={cookbookId}
              cookbookTitle={title}
              trigger={
                <button
                  type="button"
                  aria-label="Delete cookbook"
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-kitch-red/20 px-3 py-2 text-sm font-medium text-kitch-red sm:px-4 transition-colors hover:bg-kitch-red/10"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Delete</span>
                </button>
              }
            />
          </div>
        ) : readOnly && ownerId ? (
          <FollowCookbookButton
            ownerId={ownerId}
            cookbookId={cookbookId}
            initialIsFollowing={isFollowing}
          />
        ) : null}
      </div>

      <h1 className="mt-2 break-words font-literata text-3xl font-semibold text-kitch-charcoal sm:text-4xl">{title}</h1>

      {readOnly && ownerName && ownerId ? (
        <Link
          href={`/users/${ownerId}`}
          className="mt-2 inline-flex items-center gap-2 hover:opacity-80"
        >
          <Avatar displayName={ownerName} avatarUrl={ownerAvatarUrl} sizeClassName="h-6 w-6" />
          <p className="text-sm text-kitch-grey">By {ownerName}</p>
        </Link>
      ) : null}

      <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-4">
        <p className="text-sm text-kitch-grey">
          {recipeCountLabel} • {relativeUpdateLabel(filteredRecipes)}
        </p>
        <div className="flex items-center gap-2 sm:gap-3 md:shrink-0">
          <div className="flex min-w-0 flex-1 items-center gap-2 md:w-56 md:flex-none rounded-full border border-kitch-charcoal/10 bg-kitch-cream-dark px-3.5 py-[11px] focus-within:border-kitch-red/40">
            <Search className="h-4 w-4 shrink-0 text-kitch-grey" />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search recipes..."
              className="w-full bg-transparent text-sm text-kitch-charcoal placeholder:text-kitch-grey focus:outline-none"
            />
          </div>
          {/* Phones: an icon beside the search that opens the sort options. */}
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label={`Sort by: ${SORT_OPTIONS.find((option) => option.value === sort)?.label}`}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-kitch-charcoal/10 bg-kitch-cream-dark text-kitch-charcoal outline-none focus-visible:border-kitch-red/40 sm:hidden"
            >
              <ArrowUpDown className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-48 rounded-xl border border-kitch-charcoal/10 bg-white p-1.5 text-kitch-charcoal shadow-lg"
            >
              <DropdownMenuLabel className="px-2.5 pb-1 pt-1.5 text-xs font-semibold uppercase tracking-wide text-kitch-grey">
                Sort by
              </DropdownMenuLabel>
              {SORT_OPTIONS.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onSelect={() => setSort(option.value)}
                  className={cn(
                    "flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 text-sm font-medium focus:bg-kitch-cream-dark",
                    sort === option.value && "bg-kitch-peach/60",
                  )}
                >
                  {option.label}
                  {sort === option.value ? (
                    <Check className="h-4 w-4 shrink-0 text-kitch-orange-to" />
                  ) : null}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="hidden w-fit shrink-0 items-center rounded-full border border-kitch-charcoal/10 bg-kitch-cream-dark p-1 sm:inline-flex">
            {SORT_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setSort(option.value)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors sm:px-4",
                  sort === option.value
                    ? "border-kitch-charcoal/10 bg-white text-kitch-charcoal shadow-[0_1px_2px_rgba(0,0,0,0.08)]"
                    : "border-transparent text-kitch-grey hover:text-kitch-charcoal",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5">
        <RecipeGrid
          recipes={sortedRecipes}
          backHref={backHref}
          backLabel={title}
          cookbookId={cookbookId}
          ownerId={ownerId}
          emptyMessage={query.trim() ? `No recipes match "${query.trim()}"` : undefined}
        />
      </div>
    </div>
  );
}
