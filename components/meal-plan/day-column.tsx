import { Plus } from "lucide-react";

import { MealEntryRow } from "@/components/meal-plan/meal-entry-row";
import { AddMealDialog } from "@/components/meal-plan/add-meal-dialog";
import type { MealPlanDay } from "@/components/meal-plan/week-grid";
import { cn } from "@/lib/utils";

export function DayColumn({ day }: { day: MealPlanDay }) {
  return (
    <div
      className={cn(
        "flex min-h-[420px] min-w-[220px] flex-1 flex-col rounded-2xl border p-4 shadow-sm",
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
          <p className="text-base font-bold text-kitch-charcoal">
            {day.monthLabel} {day.dayNumber}
          </p>
        </div>
        {day.isToday ? (
          <span className="rounded-full bg-kitch-red px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
            Today
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col">
        {day.entries.map((entry) => (
          <MealEntryRow key={entry.id} entry={entry} />
        ))}
      </div>

      <AddMealDialog
        date={day.dateStr}
        trigger={
          <button
            type="button"
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-kitch-charcoal/20 py-3 text-xs font-medium text-kitch-grey transition-colors hover:border-kitch-orange-to/50 hover:bg-kitch-cream"
          >
            <Plus className="h-3.5 w-3.5" />
            Add meal
          </button>
        }
      />
    </div>
  );
}
