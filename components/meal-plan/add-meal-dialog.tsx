"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Check, ChevronDown, ChevronLeft, Search, Star, X } from "lucide-react";

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
  addMealPlanEntry,
  listCookbooksForMealPlan,
  listRecipesForMealPlan,
} from "@/app/(dashboard)/meal-prep/actions";
import { MEAL_TYPES, MEAL_TYPE_META, type MealPlanType } from "@/lib/meal-plan/constants";
import { formatShortDateLabel, fromISODate, toISODate } from "@/lib/meal-plan/date-utils";
import { cn } from "@/lib/utils";

interface RecipeOption {
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

type AddMealDialogProps = {
  trigger: React.ReactNode;
} & (
  | { date: string; recipe?: undefined }
  | { recipe: { id: number; name: string; imageUrl: string | null }; date?: undefined }
);

export function AddMealDialog(props: AddMealDialogProps) {
  const { trigger, recipe } = props;
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"type" | "target">("type");
  const [loading, setLoading] = useState(false);
  const [recipes, setRecipes] = useState<RecipeOption[]>([]);
  const [cookbooks, setCookbooks] = useState<CookbookOption[]>([]);
  const [selectedCookbookId, setSelectedCookbookId] = useState<string>("all");
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const [filterText, setFilterText] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [selectedDate, setSelectedDate] = useState<string>(props.date ?? toISODate(new Date()));
  const [selectedType, setSelectedType] = useState<MealPlanType | null>(null);
  const [isSaving, startSaving] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    if (!open || recipe) return;
    listCookbooksForMealPlan().then((result) => {
      if (result.ok) setCookbooks(result.cookbooks);
    });
  }, [open, recipe]);

  useEffect(() => {
    if (!open || recipe) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    const cookbookId = selectedCookbookId === "all" ? undefined : Number(selectedCookbookId);
    listRecipesForMealPlan(cookbookId).then((result) => {
      if (cancelled) return;
      setLoading(false);
      if (result.ok) {
        setRecipes(result.recipes);
      } else {
        setError(result.error);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open, recipe, selectedCookbookId]);

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
    setStep("type");
    setSelectedDate(props.date ?? toISODate(new Date()));
    setSelectedType(null);
    setFilterText("");
    setSearchOpen(false);
    setSelectedCookbookId("all");
    setSortMode("recent");
    setError(null);
  };

  const submitEntry = (recipeId: number, date: string, type: MealPlanType) => {
    startSaving(async () => {
      const result = await addMealPlanEntry(recipeId, date, type);
      if (result.ok) {
        setOpen(false);
        reset();
      } else {
        setError(result.error);
      }
    });
  };

  const dayShortLabel = props.date ? formatShortDateLabel(fromISODate(props.date)) : null;
  const selectedCookbookLabel =
    selectedCookbookId === "all"
      ? "All Recipes"
      : (cookbooks.find((c) => String(c.id) === selectedCookbookId)?.title ?? "All Recipes");
  const isRecipeGridStep = step === "target" && !recipe;

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
        className={cn(
          "bg-white p-0 sm:max-w-2xl",
          isRecipeGridStep ? "flex h-[85vh] flex-col" : "max-h-[85vh] overflow-y-auto",
        )}
      >
        <DialogHeader className="shrink-0 gap-1 p-6 pb-0 text-left">
          {step === "target" ? (
            <button
              type="button"
              onClick={() => setStep("type")}
              className="mb-1 flex w-fit items-center gap-1 text-sm font-medium text-kitch-grey transition-colors hover:text-kitch-charcoal"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>
          ) : null}

          {step === "type" ? (
            <>
              <DialogTitle className="text-xl">
                {recipe ? `Add ${recipe.name} to Plan` : `Add a meal for ${dayShortLabel}`}
              </DialogTitle>
              <DialogDescription>What type of meal do you want to add?</DialogDescription>
            </>
          ) : recipe ? (
            <>
              <DialogTitle className="text-xl">Choose a date</DialogTitle>
              <DialogDescription>
                Pick a date to add this as {selectedType}.
              </DialogDescription>
            </>
          ) : (
            <>
              <DialogTitle className="text-xl">Choose a recipe for {dayShortLabel}</DialogTitle>
              <DialogDescription>Pick a recipe to add as {selectedType}.</DialogDescription>
            </>
          )}
        </DialogHeader>

        <div
          className={cn(
            "flex flex-col gap-4 px-6 pb-6 pt-2",
            isRecipeGridStep && "flex-1 overflow-hidden",
          )}
        >
          {step === "type" ? (
            <div className="grid grid-cols-2 gap-4">
              {MEAL_TYPES.map((type) => {
                const meta = MEAL_TYPE_META[type];
                const Icon = meta.icon;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setSelectedType(type);
                      setStep("target");
                    }}
                    className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-kitch-charcoal/10 bg-kitch-cream py-8 shadow-sm transition-colors hover:bg-kitch-cream-dark"
                  >
                    <Icon className="h-6 w-6 text-kitch-red" />
                    <span className="text-sm font-medium text-kitch-charcoal">{meta.label}</span>
                  </button>
                );
              })}
            </div>
          ) : recipe ? (
            <>
              <div className="flex items-center gap-3 rounded-xl bg-kitch-cream-dark p-3">
                <span className="h-10 w-10 shrink-0 overflow-hidden rounded-lg">
                  <CoverImage imageUrl={recipe.imageUrl} alt={recipe.name} />
                </span>
                <span className="text-sm font-medium text-kitch-charcoal">{recipe.name}</span>
              </div>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-kitch-grey">Date</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(event) => setSelectedDate(event.target.value)}
                  className="flex h-9 w-full rounded-md border border-kitch-charcoal/15 bg-white px-3 py-1 text-sm text-kitch-charcoal shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </label>
              {error ? <p className="text-sm text-kitch-red">{error}</p> : null}
            </>
          ) : (
            <>
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

              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <p className="py-6 text-center text-sm text-kitch-grey">Loading…</p>
                ) : filteredRecipes.length === 0 ? (
                  <p className="py-6 text-center text-sm text-kitch-grey">No recipes found.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    {filteredRecipes.map((r) => {
                      const { label, icon: SourceIcon, className } = sourceMeta(r.source);
                      return (
                        <button
                          key={r.id}
                          type="button"
                          disabled={isSaving}
                          onClick={() => submitEntry(r.id, props.date!, selectedType!)}
                          className="group flex flex-col overflow-hidden rounded-2xl border border-kitch-charcoal/10 bg-white text-left shadow-sm transition-shadow hover:shadow-md disabled:opacity-50"
                        >
                          <div className="aspect-[4/3] w-full overflow-hidden">
                            <CoverImage imageUrl={r.imageUrl} alt={r.name} />
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
              {error ? <p className="text-sm text-kitch-red">{error}</p> : null}
            </>
          )}
        </div>

        {step === "target" && recipe ? (
          <DialogFooter className="border-t border-kitch-charcoal/10 p-6 pt-4">
            <Button
              type="button"
              onClick={() => submitEntry(recipe.id, selectedDate, selectedType!)}
              disabled={isSaving || !selectedType}
              className="bg-gradient-to-r from-kitch-orange-from to-kitch-orange-to text-white shadow-sm hover:opacity-90"
            >
              {isSaving ? "Adding…" : "Add to Plan"}
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
