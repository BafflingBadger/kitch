import { DayColumn } from "@/components/meal-plan/day-column";
import type { MealPlanType } from "@/lib/meal-plan/constants";

export interface MealPlanEntryItem {
  id: number;
  recipeId: number;
  recipeName: string;
  imageUrl: string | null;
  type: MealPlanType;
}

export interface MealPlanDay {
  dateStr: string;
  weekday: string;
  dayNumber: number;
  monthLabel: string;
  isToday: boolean;
  entries: MealPlanEntryItem[];
}

export function WeekGrid({ days }: { days: MealPlanDay[] }) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {days.map((day) => (
        <DayColumn key={day.dateStr} day={day} />
      ))}
    </div>
  );
}
