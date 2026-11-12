/**
 * Nutrition published by the recipe page itself, read from its Schema.org
 * `Recipe.nutrition` (a `NutritionInformation` block, which recipe-card plugins
 * like WP Recipe Maker and Tasty emit per serving).
 *
 * Values arrive as text such as "617 kcal", "560 calories", "24 g" or "4g".
 * Only fields the page actually provides are returned; the caller falls back
 * to the AI estimate for the rest. No Deno APIs here, so it can be tested with
 * plain Node.
 */

import { clampRecipeMacros, type RecipeMacros } from "../_shared/recipe-macros.ts"

export interface PageNutrition {
  calories?: number
  protein_g?: number
  fat_g?: number
  carbs_g?: number
}

const KJ_PER_KCAL = 4.184

/** First number in a value like "1,200 kcal", "<1 g" or 37; null if there isn't one. */
function leadingNumber(value: unknown): { n: number; unit: string } | null {
  if (typeof value === "number") return Number.isFinite(value) && value >= 0 ? { n: value, unit: "" } : null
  if (typeof value !== "string") return null
  const match = value.replace(/,/g, "").match(/(\d+(?:\.\d+)?)\s*([a-zA-Zµ]*)/)
  if (!match) return null
  return { n: Number(match[1]), unit: match[2].toLowerCase() }
}

function parseCalories(value: unknown): number | undefined {
  const parsed = leadingNumber(value)
  if (!parsed) return undefined
  const kcal = parsed.unit === "kj" ? parsed.n / KJ_PER_KCAL : parsed.n
  return kcal >= 0 && kcal <= 10000 ? Math.round(kcal) : undefined
}

function parseGrams(value: unknown): number | undefined {
  const parsed = leadingNumber(value)
  if (!parsed) return undefined
  let grams = parsed.n
  if (parsed.unit === "mg") grams = parsed.n / 1000
  else if (parsed.unit === "kg") grams = parsed.n * 1000
  else if (parsed.unit !== "" && parsed.unit !== "g" && !parsed.unit.startsWith("gram")) return undefined
  return grams >= 0 && grams <= 1000 ? Math.round(grams * 10) / 10 : undefined
}

/** The page's per-serving nutrition, or an empty object when it publishes none. */
export function parseSchemaNutrition(nutrition: unknown): PageNutrition {
  // Some sites wrap the block in an array.
  const block = Array.isArray(nutrition) ? nutrition[0] : nutrition
  if (!block || typeof block !== "object") return {}
  const n = block as Record<string, unknown>

  const result: PageNutrition = {}
  const calories = parseCalories(n.calories)
  const protein = parseGrams(n.proteinContent)
  const fat = parseGrams(n.fatContent)
  const carbs = parseGrams(n.carbohydrateContent)
  if (calories !== undefined) result.calories = calories
  if (protein !== undefined) result.protein_g = protein
  if (fat !== undefined) result.fat_g = fat
  if (carbs !== undefined) result.carbs_g = carbs

  // A block of all zeros is a plugin default, not real data.
  const values = Object.values(result)
  if (values.length > 0 && values.every((v) => v === 0)) return {}
  return result
}

/**
 * The page's published nutrition wins over the AI estimate, field by field; the
 * AI only fills what the page leaves out (some sites publish calories alone).
 * When the page provides any of it, servings come from the page's stated yield,
 * since its numbers are per serving of that yield, and the confidence score is
 * dropped (null): the numbers aren't purely the AI's.
 */
export function mergePageNutrition(
  estimate: RecipeMacros,
  page: PageNutrition,
  pageServings: number | null
): RecipeMacros {
  if (Object.keys(page).length === 0) return estimate
  const merged = clampRecipeMacros({
    ...estimate,
    ...page,
    servings: pageServings ?? estimate.servings,
  })
  return { ...merged, confidence: null }
}
