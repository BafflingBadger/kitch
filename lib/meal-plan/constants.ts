import { Apple, Coffee, Sandwich, Soup, type LucideIcon } from "lucide-react";

import type { Database } from "@/lib/database.types";

export type MealPlanType = Database["public"]["Enums"]["Meal Plan Types"];

export const MEAL_TYPES: MealPlanType[] = ["breakfast", "lunch", "dinner", "snack"];

export const MEAL_TYPE_META: Record<MealPlanType, { label: string; icon: LucideIcon }> = {
  breakfast: { label: "Breakfast", icon: Coffee },
  lunch: { label: "Lunch", icon: Sandwich },
  dinner: { label: "Dinner", icon: Soup },
  snack: { label: "Snack", icon: Apple },
};
