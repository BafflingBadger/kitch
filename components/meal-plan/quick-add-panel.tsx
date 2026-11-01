"use client";

import { useEffect, useState, useTransition } from "react";
import { History, Plus, Sparkles, Star, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  addFoodEntries,
  estimateMacros,
  listFoodSuggestions,
  setFoodFavourite,
} from "@/app/(dashboard)/meal-prep/actions";
import type { MealPlanType } from "@/lib/meal-plan/constants";
import {
  formatCalories,
  formatGrams,
  sumMacros,
  type FoodMacros,
  type FoodSuggestion,
} from "@/lib/meal-plan/macros";
import { LIMITS } from "@/lib/validation/limits";
import { MacroInputs, parseMacroInput } from "@/components/meal-plan/macro-inputs";
import { cn } from "@/lib/utils";

/** A row in the review list. Numbers are kept as strings while being edited. */
interface ReviewItem {
  key: number;
  /** The library row this came from, while its name is unedited. */
  foodItemId: number | null;
  isFavourite: boolean;
  name: string;
  serving: string;
  calories: string;
  proteinG: string;
  fatG: string;
  carbsG: string;
}

let nextKey = 1;

function toReviewItem(item: FoodMacros, library: FoodSuggestion[]): ReviewItem {
  // AI results for a food already in the library pick up its id and star.
  const match = library.find((food) => food.name.toLowerCase() === item.name.toLowerCase());
  return {
    key: nextKey++,
    foodItemId: match?.id ?? null,
    isFavourite: match?.isFavourite ?? false,
    name: item.name,
    serving: item.serving ?? "",
    calories: String(item.calories),
    proteinG: String(item.proteinG),
    fatG: String(item.fatG),
    carbsG: String(item.carbsG),
  };
}

function fromReviewItem(item: ReviewItem): FoodMacros {
  return {
    name: item.name.trim(),
    serving: item.serving.trim() || null,
    calories: parseMacroInput(item.calories),
    proteinG: parseMacroInput(item.proteinG),
    fatG: parseMacroInput(item.fatG),
    carbsG: parseMacroInput(item.carbsG),
  };
}

const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

export function QuickAddPanel({
  date,
  type,
  onAdded,
}: {
  date: string;
  type: MealPlanType;
  onAdded: () => void;
}) {
  const [description, setDescription] = useState("");
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [favourites, setFavourites] = useState<FoodSuggestion[]>([]);
  const [recent, setRecent] = useState<FoodSuggestion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isEstimating, startEstimating] = useTransition();
  const [isSaving, startSaving] = useTransition();

  useEffect(() => {
    let cancelled = false;
    listFoodSuggestions().then((result) => {
      if (cancelled || !result.ok) return;
      setFavourites(result.favourites);
      setRecent(result.recent);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const library = [...favourites, ...recent];

  const estimate = () => {
    setError(null);
    startEstimating(async () => {
      const result = await estimateMacros(description);
      if (result.ok) {
        setItems((current) => [...current, ...result.items.map((item) => toReviewItem(item, library))]);
        setDescription("");
      } else {
        setError(result.error);
      }
    });
  };

  const addSuggestion = (suggestion: FoodSuggestion) => {
    setItems((current) => [...current, toReviewItem(suggestion, library)]);
  };

  const toggleFavourite = (item: ReviewItem) => {
    const isFavourite = !item.isFavourite;
    // Keep duplicates of the same food in step.
    setItems((current) =>
      current.map((other) => (sameName(other.name, item.name) ? { ...other, isFavourite } : other)),
    );

    // A food not in the library yet is starred when it's saved.
    if (item.foodItemId === null) return;

    const suggestion = library.find((food) => food.id === item.foodItemId);
    if (suggestion) {
      const updated = { ...suggestion, isFavourite };
      if (isFavourite) {
        setRecent((list) => list.filter((s) => s.id !== suggestion.id));
        setFavourites((list) => [...list, updated].sort((a, b) => a.name.localeCompare(b.name)));
      } else {
        setFavourites((list) => list.filter((s) => s.id !== suggestion.id));
        setRecent((list) => [updated, ...list]);
      }
    }
    setFoodFavourite(item.foodItemId, isFavourite).then((result) => {
      if (!result.ok) setError(result.error);
    });
  };

  const updateItem = (key: number, patch: Partial<ReviewItem>) => {
    setItems((current) => current.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  };

  const removeItem = (key: number) => {
    setItems((current) => current.filter((item) => item.key !== key));
  };

  const save = () => {
    setError(null);
    const foods = items.map((item) => ({ ...fromReviewItem(item), isFavourite: item.isFavourite }));
    if (foods.some((food) => !food.name)) {
      setError("Every food needs a name");
      return;
    }
    startSaving(async () => {
      const result = await addFoodEntries(date, type, foods);
      if (result.ok) {
        onAdded();
      } else {
        setError(result.error);
      }
    });
  };

  const totals = sumMacros(items.map(fromReviewItem));
  const hasSuggestions = favourites.length > 0 || recent.length > 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Padding (offset by the negative margin) keeps focus rings from being clipped by the scroll area. */}
      <div className="-m-1 flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-1">
        <div className="flex flex-col gap-2">
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={LIMITS.foodDescription}
            rows={3}
            placeholder="e.g. 2 scrambled eggs, a slice of toast with butter and a medium vanilla latte"
            className="w-full resize-none rounded-2xl border border-kitch-charcoal/10 bg-kitch-cream px-4 py-3 text-sm text-kitch-charcoal placeholder:text-kitch-grey focus:border-kitch-red/30 focus:outline-none focus:ring-[3px] focus:ring-kitch-red/15"
          />
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-kitch-grey">
              Describe it naturally. Provide more detail for more accurate results.
            </span>
            <Button
              type="button"
              onClick={estimate}
              disabled={isEstimating || !description.trim()}
              className="rounded-full bg-gradient-to-r from-kitch-orange-from to-kitch-orange-to text-white shadow-sm hover:opacity-90"
            >
              <Sparkles className="h-4 w-4" />
              {isEstimating ? "Estimating…" : "Estimate"}
            </Button>
          </div>
          {/* Up top so it's in view without scrolling past the suggestions. */}
          {error ? <p className="text-sm text-kitch-red">{error}</p> : null}
        </div>

        {items.length > 0 ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm font-semibold text-kitch-charcoal">
                {items.length} {items.length === 1 ? "item" : "items"}
              </span>
              <span className="text-xs text-kitch-grey">
                <span className="text-sm font-semibold text-kitch-charcoal">
                  {formatCalories(totals.calories)}
                </span>{" "}
                · P {formatGrams(totals.proteinG)} · F {formatGrams(totals.fatG)} · C{" "}
                {formatGrams(totals.carbsG)}
              </span>
            </div>

            {items.map((item) => (
              <div
                key={item.key}
                className="flex flex-col gap-3 rounded-2xl border border-kitch-charcoal/10 bg-kitch-cream p-4"
              >
                <div className="flex items-start gap-2">
                  {/* Name and portion are editable but read as plain text. */}
                  <div className="flex min-w-0 flex-1 flex-col">
                    <input
                      value={item.name}
                      onChange={(event) =>
                        // A renamed food no longer refers to its library row.
                        updateItem(item.key, { name: event.target.value, foodItemId: null })
                      }
                      maxLength={LIMITS.foodName}
                      aria-label="Food name"
                      className="-mx-1 w-full rounded-md bg-transparent px-1 text-[15px] font-semibold text-kitch-charcoal hover:bg-white/60 focus:bg-white focus:outline-none"
                    />
                    <input
                      value={item.serving}
                      onChange={(event) => updateItem(item.key, { serving: event.target.value })}
                      maxLength={LIMITS.foodServing}
                      placeholder="Add portion"
                      aria-label="Portion"
                      className="-mx-1 mt-0.5 w-full rounded-md bg-transparent px-1 text-xs text-kitch-grey placeholder:text-kitch-grey/60 hover:bg-white/60 focus:bg-white focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleFavourite(item)}
                    aria-label={
                      item.isFavourite
                        ? `Remove ${item.name} from favourites`
                        : `Add ${item.name} to favourites`
                    }
                    aria-pressed={item.isFavourite}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-kitch-charcoal/70 hover:bg-white hover:text-kitch-charcoal"
                  >
                    <Star
                      className={cn("h-4 w-4", item.isFavourite && "fill-kitch-red text-kitch-red")}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeItem(item.key)}
                    aria-label={`Remove ${item.name}`}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-kitch-charcoal/70 hover:bg-white hover:text-kitch-charcoal"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <MacroInputs
                  values={item}
                  onChange={(field, value) => updateItem(item.key, { [field]: value })}
                />
              </div>
            ))}
          </div>
        ) : null}

        {hasSuggestions ? (
          <div className="flex flex-col gap-4">
            {[
              { label: "Favourites", icon: Star, list: favourites },
              { label: "Recent", icon: History, list: recent },
            ].map(({ label, icon: Icon, list }) =>
              list.length > 0 ? (
                <div key={label} className="flex flex-col gap-2">
                  <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-kitch-grey">
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {list.map((suggestion) => (
                      <button
                        key={suggestion.id}
                        type="button"
                        onClick={() => addSuggestion(suggestion)}
                        aria-label={`Add ${suggestion.name}`}
                        className="inline-flex h-9 items-center gap-2 rounded-full border border-kitch-charcoal/10 bg-white px-3.5 text-sm shadow-sm transition-colors hover:bg-kitch-cream"
                      >
                        {suggestion.isFavourite ? (
                          <Star className="h-3.5 w-3.5 fill-kitch-red text-kitch-red" />
                        ) : (
                          <Plus className="h-3.5 w-3.5 text-kitch-grey" />
                        )}
                        <span className="max-w-[160px] truncate font-medium text-kitch-charcoal">
                          {suggestion.name}
                        </span>
                        <span className="text-xs text-kitch-grey">
                          {formatCalories(suggestion.calories)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null,
            )}
          </div>
        ) : null}

      </div>

      <div className="flex shrink-0 justify-end pt-4">
        <Button
          type="button"
          onClick={save}
          disabled={isSaving || items.length === 0}
          className="h-11 rounded-full bg-kitch-charcoal px-6 text-sm font-semibold text-white shadow-sm hover:bg-kitch-charcoal/90"
        >
          {isSaving
            ? "Adding…"
            : items.length === 0
              ? `Add to ${type}`
              : `Add ${items.length} ${items.length === 1 ? "item" : "items"} to ${type}`}
        </Button>
      </div>
    </div>
  );
}
