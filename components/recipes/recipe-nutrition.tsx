import { cn } from "@/lib/utils";

export type RecipeNutritionFacts = {
  servings: number;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
};

const MACROS = [
  { key: "protein", label: "Protein", kcalPerGram: 4, swatch: "bg-kitch-orange-to" },
  { key: "carbs", label: "Carbs", kcalPerGram: 4, swatch: "bg-kitch-grey" },
  { key: "fat", label: "Fat", kcalPerGram: 9, swatch: "bg-kitch-charcoal" },
] as const;

/** Read-only per-serving nutrition on the recipe page. */
export function RecipeNutrition({ nutrition }: { nutrition: RecipeNutritionFacts }) {
  const macroCalories = MACROS.map((macro) => ({
    ...macro,
    grams: nutrition[macro.key],
    kcal: nutrition[macro.key] * macro.kcalPerGram,
  }));
  const hasMacros = macroCalories.some((m) => m.kcal > 0);
  const totalMacroKcal = macroCalories.reduce((sum, m) => sum + m.kcal, 0) || 1;

  return (
    <section
      aria-labelledby="recipe-nutrition-heading"
      className="rounded-2xl border border-kitch-charcoal/10 bg-kitch-cream p-4"
    >
      <div className="flex items-baseline justify-between gap-4">
        <h2
          id="recipe-nutrition-heading"
          className="text-xs font-semibold uppercase tracking-wide text-kitch-grey"
        >
          Nutrition per serving
        </h2>
        <span className="text-xs text-kitch-grey">
          Serves {nutrition.servings}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-x-8 gap-y-4">
        <p className="flex items-baseline gap-1">
          <span className="font-literata text-4xl font-semibold tabular-nums leading-none text-kitch-charcoal">
            {Math.round(nutrition.calories)}
          </span>
          <span className="text-sm font-medium text-kitch-grey">kcal</span>
        </p>

        <dl className="flex flex-1 flex-wrap gap-x-6 gap-y-3">
          {macroCalories.map((macro) => (
            <div key={macro.key} className="flex flex-col gap-0.5">
              <dt className="flex items-center gap-1.5 text-xs text-kitch-grey">
                <span className={`h-2 w-2 rounded-full ${macro.swatch}`} aria-hidden="true" />
                {macro.label}
              </dt>
              <dd className="text-lg font-semibold tabular-nums leading-tight text-kitch-charcoal">
                {Math.round(macro.grams)}
                <span className="ml-0.5 text-xs font-medium text-kitch-grey">g</span>
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {/* With no nutrition yet, the bar is a hollow outline. */}
      <div
        className={cn(
          "mt-4 flex h-2 w-full gap-0.5 overflow-hidden rounded-full",
          !hasMacros && "border border-kitch-charcoal/20",
        )}
        role="img"
        aria-label={`Calories from macros: ${macroCalories
          .map((m) => `${m.label} ${Math.round((m.kcal / totalMacroKcal) * 100)}%`)
          .join(", ")}`}
      >
        {macroCalories.map((macro) => (
          <span
            key={macro.key}
            className={macro.swatch}
            style={{ width: `${(macro.kcal / totalMacroKcal) * 100}%` }}
          />
        ))}
      </div>
      <div className="mt-1.5 flex gap-4 text-[11px] tabular-nums text-kitch-grey" aria-hidden="true">
        {macroCalories.map((macro) => (
          <span key={macro.key}>
            {Math.round((macro.kcal / totalMacroKcal) * 100)}% {macro.label.toLowerCase()}
          </span>
        ))}
      </div>
    </section>
  );
}
