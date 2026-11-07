import { DayColumn } from "@/components/meal-plan/day-column";
import type { MealPlanType } from "@/lib/meal-plan/constants";
import type { FoodMacros, MacroTotals } from "@/lib/meal-plan/macros";

export interface MealPlanRecipeEntry {
  kind: "recipe";
  id: number;
  recipeId: number;
  recipeName: string;
  imageUrl: string | null;
  type: MealPlanType;
  /** Servings eaten. */
  servings: number;
  /** The recipe's current per-serving macros, read live (not a snapshot). */
  perServing: MacroTotals;
}

/** A food logged through Quick Add. Ids are from a different table than recipe entries. */
export interface MealPlanFoodEntry extends FoodMacros {
  kind: "food";
  id: number;
  type: MealPlanType;
}

export type MealPlanEntryItem = MealPlanRecipeEntry | MealPlanFoodEntry;

export interface MealPlanDay {
  dateStr: string;
  weekday: string;
  dayNumber: number;
  monthLabel: string;
  isToday: boolean;
  entries: MealPlanEntryItem[];
  /** Quick Add foods plus recipes (per-serving macros × servings eaten). */
  totals: MacroTotals;
}

export function WeekGrid({ days, isPremium }: { days: MealPlanDay[]; isPremium: boolean }) {
  return (
    <div className="flex h-full gap-4 overflow-x-auto pb-2">
      {days.map((day) => (
        <DayColumn key={day.dateStr} day={day} isPremium={isPremium} />
      ))}
    </div>
  );
}
