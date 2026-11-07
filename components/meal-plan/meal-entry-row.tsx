"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { X } from "lucide-react";

import { CoverImage } from "@/components/cookbooks/cover-image";
import { removeMealPlanEntry } from "@/app/(dashboard)/meal-prep/actions";
import { MEAL_TYPE_META } from "@/lib/meal-plan/constants";
import { formatServings, scaleMacros } from "@/lib/meal-plan/macros";
import { EditRecipeServingsDialog } from "@/components/meal-plan/edit-recipe-servings-dialog";
import type { MealPlanRecipeEntry } from "@/components/meal-plan/week-grid";

export function MealEntryRow({ entry }: { entry: MealPlanRecipeEntry }) {
  const [isPending, startTransition] = useTransition();
  const [servingsOpen, setServingsOpen] = useState(false);
  // Bumped on each open so the dialog remounts with the saved servings.
  const [servingsKey, setServingsKey] = useState(0);
  const meta = MEAL_TYPE_META[entry.type];
  const Icon = meta.icon;
  const total = scaleMacros(entry.perServing, entry.servings);

  return (
    // shrink-0: in a full day the list is a flex column, and `overflow-hidden`
    // (for the rounded image) would otherwise let the card shrink and clip its macros.
    <div className="group relative mb-3 shrink-0 overflow-hidden rounded-xl border border-kitch-charcoal/10 bg-white shadow-sm last:mb-0">
      <Link href={`/recipes/${entry.recipeId}?backHref=/meal-prep&backLabel=Meal Plan`} className="block">
        <div className="aspect-[16/10] w-full overflow-hidden">
          <CoverImage imageUrl={entry.imageUrl} alt={entry.recipeName} />
        </div>
        <div className="p-2.5 pb-0">
          <div className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-kitch-red">
            <Icon className="h-3.5 w-3.5" />
            {meta.label}
            {/* Servings eaten, only when it isn't the usual single serving. */}
            {entry.servings !== 1 ? (
              <span className="ml-auto font-medium normal-case tracking-normal text-kitch-grey/60">
                x {formatServings(entry.servings)}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm font-semibold leading-snug text-kitch-charcoal">{entry.recipeName}</p>
        </div>
      </Link>

      {/* Same layout as a Quick Add food: calories, then macros, wrapping when narrow. */}
      <button
        type="button"
        aria-label={`Change servings of ${entry.recipeName}`}
        onClick={() => {
          setServingsKey((key) => key + 1);
          setServingsOpen(true);
        }}
        className="mx-2.5 mb-2.5 mt-2 flex w-[calc(100%-1.25rem)] flex-wrap items-baseline justify-between gap-x-3 border-t border-kitch-charcoal/10 pt-2 text-left"
      >
        <p className="text-sm font-bold text-kitch-charcoal">
          {Math.round(total.calories).toLocaleString("en-US")}
          <span className="ml-0.5 text-[11px] font-normal text-kitch-grey">kcal</span>
        </p>
        <p className="flex gap-2 text-xs font-bold text-kitch-charcoal">
          {(
            [
              [total.proteinG, "P"],
              [total.fatG, "F"],
              [total.carbsG, "C"],
            ] as const
          ).map(([grams, letter]) => (
            <span key={letter}>
              {Math.round(grams)}
              <span className="font-normal text-kitch-grey">{letter}</span>
            </span>
          ))}
        </p>
      </button>

      <button
        type="button"
        aria-label={`Remove ${entry.recipeName} from plan`}
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            await removeMealPlanEntry(entry.id);
          })
        }
        className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white opacity-0 backdrop-blur-sm transition-opacity hover:bg-black/70 group-hover:opacity-100 disabled:opacity-50"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      <EditRecipeServingsDialog
        key={servingsKey}
        entry={entry}
        open={servingsOpen}
        onOpenChange={setServingsOpen}
      />
    </div>
  );
}
