import { Plus } from "lucide-react";

import { MealEntryRow } from "@/components/meal-plan/meal-entry-row";
import { FoodEntryRow } from "@/components/meal-plan/food-entry-row";
import { AddMealDialog } from "@/components/meal-plan/add-meal-dialog";
import type { MealPlanDay } from "@/components/meal-plan/week-grid";
import { cn } from "@/lib/utils";

export function DayColumn({ day }: { day: MealPlanDay }) {
  return (
    <div
      className={cn(
        "flex min-w-[220px] flex-1 flex-col rounded-2xl border p-4 shadow-sm",
        day.isToday
          ? "border-kitch-red/30 bg-kitch-red/5"
          : "border-kitch-charcoal/10 bg-white",
      )}
    >
      <div className="mb-3 flex items-start justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wide text-kitch-grey">
            {day.weekday.slice(0, 3)}
          </span>
          <p className="font-literata text-base font-bold text-kitch-charcoal">
            {day.monthLabel} {day.dayNumber}
          </p>
        </div>
        {day.isToday ? (
          <span className="rounded-full bg-kitch-red px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
            Today
          </span>
        ) : null}
      </div>

      <div className="mb-3 grid grid-cols-2 divide-x divide-kitch-charcoal/10 rounded-xl border border-kitch-charcoal/10 bg-kitch-cream py-1.5 text-center">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-kitch-grey">
            Cal
          </p>
          <p className="text-base font-bold text-kitch-charcoal">
            {Math.round(day.totals.calories).toLocaleString("en-US")}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-kitch-grey">
            Protein
          </p>
          <p className="text-base font-bold text-kitch-charcoal">
            {Math.round(day.totals.proteinG)}g
          </p>
        </div>
      </div>

      {/* The day keeps a fixed height and its meals scroll; the inset padding
          stops the cards' shadows being clipped at the sides. */}
      <div className="-mx-1 flex min-h-0 flex-1 flex-col overflow-y-auto px-1 pb-1">
        {day.entries.map((entry) =>
          entry.kind === "recipe" ? (
            <MealEntryRow key={`recipe-${entry.id}`} entry={entry} />
          ) : (
            <FoodEntryRow key={`food-${entry.id}`} entry={entry} />
          ),
        )}
      </div>

      <AddMealDialog
        date={day.dateStr}
        trigger={
          <button
            type="button"
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-kitch-charcoal/20 py-3 text-sm font-medium text-kitch-grey transition-colors hover:border-kitch-orange-to/50 hover:bg-kitch-cream"
          >
            <Plus className="h-4 w-4" />
            Add meal
          </button>
        }
      />
    </div>
  );
}
