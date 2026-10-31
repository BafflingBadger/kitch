/** One food with its estimated macros, as Quick Add reviews and saves it. */
export interface FoodMacros {
  name: string;
  serving: string | null;
  calories: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
}

/** A food from the user's library, offered as a recent or favourite suggestion. */
export interface FoodSuggestion extends FoodMacros {
  id: number;
  isFavourite: boolean;
}

export interface MacroTotals {
  calories: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
}

export function sumMacros(items: Pick<FoodMacros, "calories" | "proteinG" | "fatG" | "carbsG">[]): MacroTotals {
  return items.reduce<MacroTotals>(
    (totals, item) => ({
      calories: totals.calories + item.calories,
      proteinG: totals.proteinG + item.proteinG,
      fatG: totals.fatG + item.fatG,
      carbsG: totals.carbsG + item.carbsG,
    }),
    { calories: 0, proteinG: 0, fatG: 0, carbsG: 0 },
  );
}

export function formatCalories(calories: number) {
  return `${Math.round(calories).toLocaleString("en-US")} kcal`;
}

/** Grams to at most one decimal, dropping a trailing ".0". */
export function formatGrams(grams: number) {
  return `${Math.round(grams * 10) / 10}g`;
}
