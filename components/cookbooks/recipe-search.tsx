"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Star } from "lucide-react";

import { CoverImage } from "@/components/cookbooks/cover-image";
import { sourceMeta } from "@/components/cookbooks/recipe-card";
import {
  listRecipesForSearch,
  type RecipeSearchResult,
} from "@/app/(dashboard)/recipes/actions";
import { cn } from "@/lib/utils";

const MAX_RESULTS = 6;
const ALL_RECIPES_HREF = "/cookbooks/all";

function recipeHref(id: number) {
  return `/recipes/${id}?backHref=${encodeURIComponent(ALL_RECIPES_HREF)}&backLabel=${encodeURIComponent("All Recipes")}`;
}

export function RecipeSearch() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [recipes, setRecipes] = useState<RecipeSearchResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);

  // Recipes are fetched when the dropdown opens, then filtered in the browser so
  // results update on every keystroke without another round trip. Any recipes
  // already loaded stay on screen while a later open refreshes them.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    listRecipesForSearch().then((result) => {
      if (cancelled) return;
      setLoading(false);
      if (result.ok) {
        setRecipes(result.recipes);
        setError(null);
      } else {
        setError(result.error);
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

  const matches = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    return trimmed
      ? (recipes ?? []).filter((recipe) => recipe.name.toLowerCase().includes(trimmed))
      : (recipes ?? []);
  }, [recipes, query]);

  const results = useMemo(() => matches.slice(0, MAX_RESULTS), [matches]);

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
      setActiveIndex((index) => (results.length === 0 ? -1 : (index + 1) % results.length));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) =>
        results.length === 0 ? -1 : (index - 1 + results.length) % results.length,
      );
    } else if (event.key === "Enter") {
      event.preventDefault();
      const target = results[activeIndex];
      const trimmed = query.trim();
      const fallbackHref =
        trimmed && matches.length > 0
          ? `${ALL_RECIPES_HREF}?q=${encodeURIComponent(trimmed)}`
          : ALL_RECIPES_HREF;
      closeAndReset();
      router.push(target ? recipeHref(target.id) : fallbackHref);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-md" onMouseLeave={close}>
      <div className="flex items-center gap-2 rounded-full border border-kitch-charcoal/10 bg-kitch-cream-dark px-4 py-2.5 focus-within:border-kitch-red/40">
        <Search className="h-4 w-4 shrink-0 text-kitch-grey" />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls="recipe-search-results"
          aria-autocomplete="list"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search recipes, ingredients..."
          className="w-full bg-transparent text-sm text-kitch-charcoal placeholder:text-kitch-grey focus:outline-none"
        />
      </div>

      {/* pt-2 (not mt-2) keeps this whole area part of the hoverable box, right up
          against the input, so there's no gap where the mouse briefly leaves the
          widget and triggers the outer container's onMouseLeave. */}
      {open ? (
        <div
          id="recipe-search-results"
          role="listbox"
          className="absolute inset-x-0 top-full z-50 pt-2"
        >
          <div className="overflow-hidden rounded-2xl border border-kitch-charcoal/10 bg-white shadow-lg">
            {error ? (
              <p className="px-4 py-6 text-sm text-kitch-grey">{error}</p>
            ) : loading && recipes === null ? (
              <p className="px-4 py-6 text-sm text-kitch-grey">Loading recipes…</p>
            ) : results.length === 0 ? (
              <p className="px-4 py-6 text-sm text-kitch-grey">
                {query.trim() ? `No recipes match “${query.trim()}”` : "No recipes yet"}
              </p>
            ) : (
              <ul
                className="max-h-[60vh] overflow-y-auto py-1"
                onMouseLeave={() => setActiveIndex(-1)}
              >
                {results.map((recipe, index) => {
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
                          index === activeIndex ? "bg-kitch-cream-dark" : "hover:bg-kitch-cream-dark",
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
              href={
                query.trim() && matches.length > 0
                  ? `${ALL_RECIPES_HREF}?q=${encodeURIComponent(query.trim())}`
                  : ALL_RECIPES_HREF
              }
              prefetch={false}
              onClick={closeAndReset}
              className="block border-t border-kitch-charcoal/10 px-4 py-3 text-sm font-semibold text-kitch-red hover:bg-kitch-cream-dark"
            >
              {query.trim() && matches.length > 0
                ? `See all ${matches.length} result${matches.length === 1 ? "" : "s"} for "${query.trim()}"`
                : "View all recipes"}
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
