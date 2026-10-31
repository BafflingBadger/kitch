"use client";

import { useTransition } from "react";
import { X } from "lucide-react";

import { removeFoodEntry } from "@/app/(dashboard)/meal-prep/actions";
import { MEAL_TYPE_META } from "@/lib/meal-plan/constants";
import type { MealPlanFoodEntry } from "@/components/meal-plan/week-grid";

export function FoodEntryRow({ entry }: { entry: MealPlanFoodEntry }) {
  const [isPending, startTransition] = useTransition();
  const meta = MEAL_TYPE_META[entry.type];
  const Icon = meta.icon;

  return (
    <div className="group relative mb-3 rounded-xl border border-kitch-charcoal/10 bg-white p-2.5 shadow-sm last:mb-0">
      <div className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-kitch-red">
        <Icon className="h-3.5 w-3.5" />
        {meta.label}
      </div>
      <p
        title={entry.name}
        className="mt-1 truncate pr-5 text-sm font-semibold leading-snug text-kitch-charcoal"
      >
        {entry.name}
      </p>
      {entry.serving ? (
        <p className="truncate text-xs text-kitch-grey">{entry.serving}</p>
      ) : null}
      {/* Calories and macros share a line when the column is wide enough, else the macros wrap below. */}
      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-3 border-t border-kitch-charcoal/10 pt-2">
        <p className="text-sm font-bold text-kitch-charcoal">
          {Math.round(entry.calories).toLocaleString("en-US")}
          <span className="ml-0.5 text-[11px] font-normal text-kitch-grey">kcal</span>
        </p>
        <p className="flex gap-2 text-xs font-bold text-kitch-charcoal">
          {(
            [
              [entry.proteinG, "P"],
              [entry.fatG, "F"],
              [entry.carbsG, "C"],
            ] as const
          ).map(([grams, letter]) => (
            <span key={letter}>
              {Math.round(grams)}
              <span className="font-normal text-kitch-grey">{letter}</span>
            </span>
          ))}
        </p>
      </div>
      <button
        type="button"
        aria-label={`Remove ${entry.name} from plan`}
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            await removeFoodEntry(entry.id);
          })
        }
        className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white opacity-0 backdrop-blur-sm transition-opacity hover:bg-black/70 group-hover:opacity-100 disabled:opacity-50"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
