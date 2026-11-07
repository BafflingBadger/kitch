/** One food with its estimated macros, as Quick Add reviews and saves it. */
export interface FoodMacros {
  name: string;
  serving: string | null;
  calories: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
  /**
   * The AI's confidence in these numbers, a whole number out of 10. Recorded,
   * not shown. Null (or absent) when the numbers were typed or edited by hand.
   */
  confidence?: number | null;
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

/** "1", "1.5", "0.25": servings without trailing zeros. */
export function formatServings(servings: number) {
  return String(Math.round(servings * 100) / 100);
}

/** Per-serving macros scaled to the servings eaten. */
export function scaleMacros(perServing: MacroTotals, servings: number): MacroTotals {
  return {
    calories: perServing.calories * servings,
    proteinG: perServing.proteinG * servings,
    fatG: perServing.fatG * servings,
    carbsG: perServing.carbsG * servings,
  };
}
