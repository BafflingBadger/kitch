"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Check, ChevronDown, Search, Star, X } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { CoverImage } from "@/components/cookbooks/cover-image";
import { sourceMeta } from "@/components/cookbooks/recipe-card";
import {
  listCookbooksForMealPlan,
  listRecipesForMealPlan,
} from "@/app/(dashboard)/meal-prep/actions";
import { cn } from "@/lib/utils";

export interface SelectableRecipe {
  id: number;
  name: string;
  imageUrl: string | null;
  source: string | null;
  rating: number;
  createdAt: number;
}

interface CookbookOption {
  id: number;
  title: string;
}

const SORT_OPTIONS = [
  { value: "recent", label: "Most Recent" },
  { value: "rating", label: "Highest Rated" },
] as const;

type SortMode = (typeof SORT_OPTIONS)[number]["value"];

export function SelectRecipesDialog({
  trigger,
  initialSelectedIds,
  onConfirm,
}: {
  trigger: ReactNode;
  initialSelectedIds: Set<number>;
  onConfirm: (recipes: SelectableRecipe[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recipes, setRecipes] = useState<SelectableRecipe[]>([]);
  const [cookbooks, setCookbooks] = useState<CookbookOption[]>([]);
  const [selectedCookbookId, setSelectedCookbookId] = useState<string>("all");
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const [filterText, setFilterText] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [selectedRecipes, setSelectedRecipes] = useState<Map<number, SelectableRecipe>>(new Map());

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    if (!open) return;
    setSelectedIds(new Set(initialSelectedIds));
    listCookbooksForMealPlan().then((result) => {
      if (result.ok) setCookbooks(result.cookbooks);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    const cookbookId = selectedCookbookId === "all" ? undefined : Number(selectedCookbookId);
    listRecipesForMealPlan(cookbookId).then((result) => {
      if (cancelled) return;
      setLoading(false);
      if (result.ok) {
        setRecipes(result.recipes);
        setSelectedRecipes((prev) => {
          const next = new Map(prev);
          for (const recipe of result.recipes) next.set(recipe.id, recipe);
          return next;
        });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open, selectedCookbookId]);

  const filteredRecipes = useMemo(() => {
    const query = filterText.trim().toLowerCase();
    const base = query ? recipes.filter((r) => r.name.toLowerCase().includes(query)) : recipes;
    const sorted = [...base];
    if (sortMode === "rating") {
      sorted.sort((a, b) => b.rating - a.rating || b.createdAt - a.createdAt);
    } else {
      sorted.sort((a, b) => b.createdAt - a.createdAt);
    }
    return sorted;
  }, [recipes, filterText, sortMode]);

  const reset = () => {
    setFilterText("");
    setSearchOpen(false);
    setSelectedCookbookId("all");
    setSortMode("recent");
  };

  const toggleRecipe = (recipe: SelectableRecipe) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(recipe.id)) {
        next.delete(recipe.id);
      } else {
        next.add(recipe.id);
      }
      return next;
    });
    setSelectedRecipes((prev) => new Map(prev).set(recipe.id, recipe));
  };

  const handleConfirm = () => {
    const result = [...selectedIds]
      .map((id) => selectedRecipes.get(id))
      .filter((recipe): recipe is SelectableRecipe => recipe !== undefined);
    onConfirm(result);
    setOpen(false);
    reset();
  };

  const selectedCookbookLabel =
    selectedCookbookId === "all"
      ? "All Recipes"
      : (cookbooks.find((c) => String(c.id) === selectedCookbookId)?.title ?? "All Recipes");

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) reset();
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent
        className="flex h-[85vh] flex-col p-0 sm:max-w-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <DialogHeader className="shrink-0 gap-1 p-6 pb-0 text-left">
          <DialogTitle className="text-xl">Add Recipes</DialogTitle>
          <DialogDescription>Choose recipes to add to this cookbook.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-1 flex-col gap-4 overflow-hidden px-6 pb-4 pt-2">
          <div className="flex h-9 items-center gap-2 rounded-full border border-kitch-charcoal/10 bg-kitch-cream px-4 sm:hidden">
            <Search className="h-4 w-4 shrink-0 text-kitch-grey" />
            <input
              type="text"
              value={filterText}
              onChange={(event) => setFilterText(event.target.value)}
              placeholder="Search your recipes…"
              className="w-full bg-transparent text-sm text-kitch-charcoal placeholder:text-kitch-grey focus:outline-none"
            />
          </div>

          <div className="hidden items-center justify-end gap-3 sm:flex">
            <button
              type="button"
              onClick={() => {
                if (searchOpen) setFilterText("");
                setSearchOpen((o) => !o);
              }}
              aria-label={searchOpen ? "Close search" : "Search recipes"}
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-colors",
                searchOpen
                  ? "border-kitch-charcoal/10 bg-kitch-cream-dark text-kitch-charcoal"
                  : "border-kitch-charcoal/10 bg-kitch-cream text-kitch-grey hover:bg-kitch-cream-dark",
              )}
            >
              {searchOpen ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger className="flex h-10 w-[236px] shrink-0 items-center justify-between rounded-full border border-kitch-charcoal/15 bg-kitch-cream px-4 text-sm text-kitch-charcoal shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-ring">
                <span className="truncate">{selectedCookbookLabel}</span>
                <ChevronDown className="h-4 w-4 shrink-0 text-kitch-grey" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-[236px] rounded-xl border border-kitch-charcoal/10 bg-white p-1.5 text-kitch-charcoal shadow-lg"
              >
                <DropdownMenuItem
                  onSelect={() => setSelectedCookbookId("all")}
                  className={cn(
                    "flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm focus:bg-kitch-cream-dark",
                    selectedCookbookId === "all" && "bg-kitch-peach/60",
                  )}
                >
                  All Recipes
                  {selectedCookbookId === "all" ? (
                    <Check className="h-4 w-4 shrink-0 text-kitch-orange-to" />
                  ) : null}
                </DropdownMenuItem>
                {cookbooks.map((cookbook) => {
                  const value = String(cookbook.id);
                  return (
                    <DropdownMenuItem
                      key={cookbook.id}
                      onSelect={() => setSelectedCookbookId(value)}
                      className={cn(
                        "flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm focus:bg-kitch-cream-dark",
                        selectedCookbookId === value && "bg-kitch-peach/60",
                      )}
                    >
                      <span className="truncate">{cookbook.title}</span>
                      {selectedCookbookId === value ? (
                        <Check className="h-4 w-4 shrink-0 text-kitch-orange-to" />
                      ) : null}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="inline-flex shrink-0 items-center rounded-full border border-kitch-charcoal/10 bg-kitch-cream-dark p-1">
              {SORT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSortMode(option.value)}
                  className={cn(
                    "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                    sortMode === option.value
                      ? "bg-gradient-to-r from-kitch-orange-from to-kitch-orange-to text-white shadow-sm"
                      : "text-kitch-charcoal/70",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {searchOpen ? (
            <div className="hidden h-10 items-center gap-2 rounded-full border border-kitch-charcoal/10 bg-kitch-cream px-4 duration-200 animate-in slide-in-from-top-2 sm:flex">
              <Search className="h-4 w-4 shrink-0 text-kitch-grey" />
              <input
                ref={searchInputRef}
                type="text"
                value={filterText}
                onChange={(event) => setFilterText(event.target.value)}
                placeholder="Search your recipes…"
                className="w-full bg-transparent text-sm text-kitch-charcoal placeholder:text-kitch-grey focus:outline-none"
              />
            </div>
          ) : null}

          <div className="-m-1 flex-1 overflow-y-auto p-1">
            {loading ? (
              <p className="py-6 text-center text-sm text-kitch-grey">Loading…</p>
            ) : filteredRecipes.length === 0 ? (
              <p className="py-6 text-center text-sm text-kitch-grey">No recipes found.</p>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {filteredRecipes.map((r) => {
                  const { label, icon: SourceIcon, className } = sourceMeta(r.source);
                  const checked = selectedIds.has(r.id);
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => toggleRecipe(r)}
                      className={cn(
                        "group relative flex flex-col overflow-hidden rounded-2xl border bg-white text-left shadow-sm transition-shadow hover:shadow-md",
                        checked ? "border-kitch-red ring-2 ring-kitch-red" : "border-kitch-charcoal/10",
                      )}
                    >
                      <div className="relative aspect-[4/3] w-full overflow-hidden">
                        <CoverImage imageUrl={r.imageUrl} alt={r.name} />
                        {checked ? (
                          <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-kitch-red text-white shadow-sm">
                            <Check className="h-4 w-4" />
                          </span>
                        ) : null}
                      </div>
                      <div className="flex flex-1 flex-col justify-between gap-2 p-3">
                        <h4 className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold text-kitch-charcoal">
                          {r.name}
                        </h4>
                        <div className="flex items-center justify-between">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${className}`}
                          >
                            <SourceIcon className="h-3 w-3" />
                            {label}
                          </span>
                          {r.rating > 0 ? (
                            <span className="flex items-center gap-0.5 text-xs font-semibold text-kitch-charcoal">
                              <Star className="h-3 w-3 fill-red-500 text-red-500" />
                              {r.rating}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="shrink-0 p-6 pt-3 sm:justify-between">
          <span className="self-center text-xs text-kitch-grey">{selectedIds.size} selected</span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="border-kitch-charcoal/10 bg-white text-kitch-charcoal shadow-none hover:bg-kitch-cream-dark hover:text-kitch-charcoal"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={selectedIds.size === 0}
              className="bg-gradient-to-r from-kitch-orange-from to-kitch-orange-to text-white shadow-sm hover:opacity-90"
            >
              Add {selectedIds.size} {selectedIds.size === 1 ? "Recipe" : "Recipes"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
