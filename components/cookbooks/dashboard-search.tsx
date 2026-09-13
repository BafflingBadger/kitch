"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Star } from "lucide-react";

import { CoverImage } from "@/components/cookbooks/cover-image";
import { sourceMeta } from "@/components/cookbooks/recipe-card";
import { Avatar } from "@/components/ui/avatar";
import {
  listRecipesForSearch,
  type RecipeSearchResult,
} from "@/app/(dashboard)/recipes/actions";
import {
  listUsersForSearch,
  type UserSearchResult,
} from "@/app/(dashboard)/discover/actions";
import { cn } from "@/lib/utils";

const MAX_RECIPE_RESULTS = 4;
const MAX_USER_RESULTS = 3;
const ALL_RECIPES_HREF = "/cookbooks/all";

function recipeHref(id: number) {
  return `/recipes/${id}?backHref=${encodeURIComponent(ALL_RECIPES_HREF)}&backLabel=${encodeURIComponent("All Recipes")}`;
}

type SearchEntry =
  | { type: "recipe"; data: RecipeSearchResult }
  | { type: "user"; data: UserSearchResult };

export function DashboardSearch() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const [recipes, setRecipes] = useState<RecipeSearchResult[] | null>(null);
  const [recipesLoading, setRecipesLoading] = useState(false);
  const [recipesError, setRecipesError] = useState<string | null>(null);

  const [users, setUsers] = useState<UserSearchResult[] | null>(null);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);

  const [activeIndex, setActiveIndex] = useState(-1);

  // Recipes and users are fetched once when the dropdown opens, then filtered in
  // the browser so results update on every keystroke without another round trip.
  // The two fetches are independent so one section can render before the other.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    setRecipesLoading(true);
    listRecipesForSearch().then((result) => {
      if (cancelled) return;
      setRecipesLoading(false);
      if (result.ok) {
        setRecipes(result.recipes);
        setRecipesError(null);
      } else {
        setRecipesError(result.error);
      }
    });

    setUsersLoading(true);
    listUsersForSearch().then((result) => {
      if (cancelled) return;
      setUsersLoading(false);
      if (result.ok) {
        setUsers(result.users);
        setUsersError(null);
      } else {
        setUsersError(result.error);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  const recipeMatches = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    return trimmed
      ? (recipes ?? []).filter((recipe) => recipe.name.toLowerCase().includes(trimmed))
      : (recipes ?? []);
  }, [recipes, query]);
  const recipeResults = useMemo(
    () => recipeMatches.slice(0, MAX_RECIPE_RESULTS),
    [recipeMatches],
  );

  const userMatches = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    return trimmed
      ? (users ?? []).filter(
          (user) =>
            user.displayName.toLowerCase().includes(trimmed) ||
            user.username.toLowerCase().includes(trimmed),
        )
      : (users ?? []);
  }, [users, query]);
  const userResults = useMemo(() => userMatches.slice(0, MAX_USER_RESULTS), [userMatches]);

  const navigableEntries = useMemo<SearchEntry[]>(
    () => [
      ...recipeResults.map((recipe) => ({ type: "recipe" as const, data: recipe })),
      ...userResults.map((user) => ({ type: "user" as const, data: user })),
    ],
    [recipeResults, userResults],
  );

  useEffect(() => {
    setActiveIndex(-1);
  }, [query]);

  const close = () => {
    setOpen(false);
    setActiveIndex(-1);
  };

  // Navigating away leaves the topbar mounted, so reset the box for the next search.
  const closeAndReset = () => {
    close();
    setQuery("");
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      close();
      inputRef.current?.blur();
      return;
    }
    if (!open) {
      if (event.key === "ArrowDown") setOpen(true);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) =>
        navigableEntries.length === 0 ? -1 : (index + 1) % navigableEntries.length,
      );
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) =>
        navigableEntries.length === 0
          ? -1
          : (index - 1 + navigableEntries.length) % navigableEntries.length,
      );
    } else if (event.key === "Enter") {
      event.preventDefault();
      const target = navigableEntries[activeIndex];
      const trimmed = query.trim();
      closeAndReset();
      if (target?.type === "recipe") {
        router.push(recipeHref(target.data.id));
      } else if (target?.type === "user") {
        router.push(`/users/${target.data.id}`);
      } else {
        const fallbackHref =
          trimmed && recipeMatches.length > 0
            ? `${ALL_RECIPES_HREF}?q=${encodeURIComponent(trimmed)}`
            : ALL_RECIPES_HREF;
        router.push(fallbackHref);
      }
    }
  };

  const trimmedQuery = query.trim();
  const recipeFooterHref =
    trimmedQuery && recipeMatches.length > 0
      ? `${ALL_RECIPES_HREF}?q=${encodeURIComponent(trimmedQuery)}`
      : ALL_RECIPES_HREF;
  const recipeFooterLabel =
    trimmedQuery && recipeMatches.length > 0
      ? `See all ${recipeMatches.length} result${recipeMatches.length === 1 ? "" : "s"} for "${trimmedQuery}"`
      : "View all recipes";
  const userFooterLabel =
    trimmedQuery && userMatches.length > 0
      ? `See all ${userMatches.length} result${userMatches.length === 1 ? "" : "s"} for "${trimmedQuery}"`
      : "View all users";

  return (
    <div ref={containerRef} className="relative w-full max-w-md" onMouseLeave={close}>
      <div className="flex items-center gap-2 rounded-full border border-kitch-charcoal/10 bg-kitch-cream-dark px-4 py-2.5 focus-within:border-kitch-red/40">
        <Search className="h-4 w-4 shrink-0 text-kitch-grey" />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls="dashboard-search-results"
          aria-autocomplete="list"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search recipes, users..."
          className="w-full bg-transparent text-sm text-kitch-charcoal placeholder:text-kitch-grey focus:outline-none"
        />
      </div>

      {/* pt-2 (not mt-2) keeps this whole area part of the hoverable box, right up
          against the input, so there's no gap where the mouse briefly leaves the
          widget and triggers the outer container's onMouseLeave. */}
      {open ? (
        <div
          id="dashboard-search-results"
          role="listbox"
          className="absolute inset-x-0 top-full z-50 pt-2"
        >
          <div className="overflow-hidden rounded-2xl border border-kitch-charcoal/10 bg-white shadow-lg">
            <div>
              <p className="px-4 pt-3 pb-1 text-xs font-semibold uppercase tracking-wide text-kitch-grey">
                Recipes
              </p>
              {recipesError ? (
                <p className="px-4 py-4 text-sm text-kitch-grey">{recipesError}</p>
              ) : recipesLoading && recipes === null ? (
                <p className="px-4 py-4 text-sm text-kitch-grey">Loading recipes…</p>
              ) : recipeResults.length === 0 ? (
                <p className="px-4 py-4 text-sm text-kitch-grey">
                  {trimmedQuery ? `No recipes match "${trimmedQuery}"` : "No recipes yet"}
                </p>
              ) : (
                <ul
                  className="max-h-[40vh] overflow-y-auto py-1"
                  onMouseLeave={() => setActiveIndex(-1)}
                >
                  {recipeResults.map((recipe, index) => {
                    const { label, icon: Icon, className } = sourceMeta(recipe.source);
                    return (
                      <li key={recipe.id} role="option" aria-selected={index === activeIndex}>
                        <Link
                          href={recipeHref(recipe.id)}
                          prefetch={false}
                          onClick={closeAndReset}
                          onMouseEnter={() => setActiveIndex(index)}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2.5 transition-colors",
                            index === activeIndex
                              ? "bg-kitch-cream-dark"
                              : "hover:bg-kitch-cream-dark",
                          )}
                        >
                          <span className="h-14 w-14 shrink-0 overflow-hidden rounded-xl">
                            <CoverImage imageUrl={recipe.imageUrl} alt={recipe.name} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-literata text-base font-semibold text-kitch-charcoal">
                              {recipe.name}
                            </span>
                            <span className="mt-1.5 flex items-center gap-2">
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
                                  className,
                                )}
                              >
                                <Icon className="h-3 w-3" />
                                {label}
                              </span>
                              {recipe.rating > 0 ? (
                                <span className="flex items-center gap-1 text-xs font-semibold text-kitch-charcoal">
                                  <Star className="h-3.5 w-3.5 fill-red-500 text-red-500" />
                                  {recipe.rating}
                                </span>
                              ) : null}
                            </span>
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
              <Link
                href={recipeFooterHref}
                prefetch={false}
                onClick={closeAndReset}
                className="block border-t border-kitch-charcoal/10 px-4 py-3 text-sm font-semibold text-kitch-red hover:bg-kitch-cream-dark"
              >
                {recipeFooterLabel}
              </Link>
            </div>

            <div className="border-t border-kitch-charcoal/10">
              <p className="px-4 pt-3 pb-1 text-xs font-semibold uppercase tracking-wide text-kitch-grey">
                Users
              </p>
              {usersError ? (
                <p className="px-4 py-4 text-sm text-kitch-grey">{usersError}</p>
              ) : usersLoading && users === null ? (
                <p className="px-4 py-4 text-sm text-kitch-grey">Loading users…</p>
              ) : userResults.length === 0 ? (
                <p className="px-4 py-4 text-sm text-kitch-grey">
                  {trimmedQuery ? `No users match "${trimmedQuery}"` : "No users yet"}
                </p>
              ) : (
                <ul
                  className="max-h-[30vh] overflow-y-auto py-1"
                  onMouseLeave={() => setActiveIndex(-1)}
                >
                  {userResults.map((user, userIndex) => {
                    const index = recipeResults.length + userIndex;
                    return (
                      <li key={user.id} role="option" aria-selected={index === activeIndex}>
                        <Link
                          href={`/users/${user.id}`}
                          prefetch={false}
                          onClick={closeAndReset}
                          onMouseEnter={() => setActiveIndex(index)}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2.5 transition-colors",
                            index === activeIndex
                              ? "bg-kitch-cream-dark"
                              : "hover:bg-kitch-cream-dark",
                          )}
                        >
                          <Avatar
                            displayName={user.displayName}
                            avatarUrl={user.avatarUrl}
                            sizeClassName="h-10 w-10"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-literata text-base font-semibold text-kitch-charcoal">
                              {user.displayName}
                            </span>
                            <span className="block truncate text-xs text-kitch-grey">
                              @{user.username}
                            </span>
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
              <Link
                href={trimmedQuery ? `/discover?q=${encodeURIComponent(trimmedQuery)}` : "/discover"}
                prefetch={false}
                onClick={closeAndReset}
                className="block border-t border-kitch-charcoal/10 px-4 py-3 text-sm font-semibold text-kitch-red hover:bg-kitch-cream-dark"
              >
                {userFooterLabel}
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
