/**
 * Per-serving recipe macros, shared by `import-recipe` (which asks for them in
 * the same OpenAI call that parses the recipe) and `estimate-recipe-macros`
 * (the Premium "Auto Estimate" button).
 *
 * Stored on `public.recipes` as `servings`, `calories`, `protein_g`, `fat_g`,
 * `carbs_g`. The ranges below match the table's check constraints.
 */

export interface RecipeMacros {
  servings: number
  calories: number
  protein_g: number
  fat_g: number
  carbs_g: number
  /** The model's confidence in the estimate, a whole number out of 10. Null when there is no estimate. */
  confidence: number | null
}

export const ZERO_MACROS: RecipeMacros = {
  servings: 1,
  calories: 0,
  protein_g: 0,
  fat_g: 0,
  carbs_g: 0,
  confidence: null,
}

/** The rule for the `confidence` field, shared with Quick Add's prompt. */
export const CONFIDENCE_RULE = `- "confidence" is how confident you are in the numbers, as a whole number from 0 to 10: 9-10 when exact amounts of well-known ingredients are given, around 5 when amounts or the dish are vague, 1-3 when guessing from a name alone.`

/** Instructions appended to any prompt that returns `RECIPE_MACROS_SCHEMA`. */
export const RECIPE_MACROS_RULES = `Also estimate the recipe's nutrition in "macros":
- "servings" is how many servings the recipe makes. Use the stated yield; if none is given, estimate a sensible number.
- calories, protein_g, fat_g and carbs_g are for ONE serving, based on the ingredients and their amounts.
- If there are no ingredients, the dish name alone is enough: estimate a typical serving of that dish. Any name that describes food counts, even if it is vague, in capitals or has extra words (e.g. "VIRAL CHUCK ROAST" is a beef chuck roast, "Mom's best soup" is a typical soup).
- Return 0 for calories, protein_g, fat_g and carbs_g ONLY when there is nothing to work with: no ingredients AND the name is empty, a placeholder like "New Recipe" or "Untitled Recipe", or not food at all. Never return 0 just because you are unsure; give your best estimate.
- Calories are whole numbers; protein, fat and carbs are grams rounded to one decimal.
${CONFIDENCE_RULE}`

export const RECIPE_MACROS_SCHEMA = {
  type: "object",
  description: "Estimated nutrition for one serving of the recipe.",
  properties: {
    servings: { type: "number", description: "Number of servings the recipe makes." },
    calories: { type: "number", description: "Calories per serving." },
    protein_g: { type: "number", description: "Protein grams per serving." },
    fat_g: { type: "number", description: "Fat grams per serving." },
    carbs_g: { type: "number", description: "Carbohydrate grams per serving." },
    confidence: { type: "integer", description: "Confidence in the estimate, 0 to 10." },
  },
  required: ["servings", "calories", "protein_g", "fat_g", "carbs_g", "confidence"],
  additionalProperties: false,
} as const

/**
 * Keep model output inside the table's check constraints. Anything missing or
 * malformed becomes 0 (or 1 serving), so a bad response never fails a write.
 */
export function clampRecipeMacros(raw: unknown, fallbackServings?: unknown): RecipeMacros {
  const m = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>
  return {
    servings: clampServings(m.servings ?? fallbackServings),
    calories: Math.round(clamp(m.calories, 10000)),
    protein_g: roundTenth(clamp(m.protein_g, 1000)),
    fat_g: roundTenth(clamp(m.fat_g, 1000)),
    carbs_g: roundTenth(clamp(m.carbs_g, 1000)),
    confidence: clampConfidence(m.confidence),
  }
}

/** A whole number 0-10, or null when the model gave none. */
export function clampConfidence(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null
  return Math.min(Math.max(Math.round(value), 0), 10)
}

export function clampServings(value: unknown): number {
  const n = typeof value === "number" && Number.isFinite(value) ? value : 1
  if (n <= 0) return 1
  return Math.min(Math.round(n * 100) / 100, 100)
}

function clamp(value: unknown, max: number) {
  const n = typeof value === "number" && Number.isFinite(value) ? value : 0
  return Math.min(Math.max(n, 0), max)
}

function roundTenth(n: number) {
  return Math.round(n * 10) / 10
}
