// The keywords the AI picks from for each ingredient, read from the
// `ingredient_keywords` table that iOS and the web app match against too.
// Change the list with a migration, not here.

import {
  buildVocabulary,
  matchKeyword,
  type IngredientKeywordRow,
  type IngredientVocabulary,
} from "../_shared/keyword-matcher.ts"

export interface IngredientKeywords {
  // Every keyword, sorted: what the AI may answer with
  list: string[]
  // The same rows, ready for the on-device matcher
  vocabulary: IngredientVocabulary
}

const EMPTY: IngredientKeywords = { list: [], vocabulary: buildVocabulary([]) }

// Reference data that changes with a migration, so a warm instance can reuse it
// for a while instead of reading it on every import.
const CACHE_MS = 10 * 60 * 1000
let cached: { keywords: IngredientKeywords; at: number } | null = null

// The keywords, or the last list loaded if the read fails. Empty only when it
// has never loaded: imports then store null keywords, and clients match them
// on device.
export async function getIngredientKeywords(supabase: any): Promise<IngredientKeywords> {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.keywords

  const { data, error } = await supabase
    .from("ingredient_keywords")
    .select("keyword, image_name, aliases")
  if (error || !data?.length) {
    console.error(`Failed to load ingredient keywords: ${error?.message ?? "no rows"}`)
    return cached?.keywords ?? EMPTY
  }

  const rows = data as IngredientKeywordRow[]
  const keywords = {
    list: rows.map((row) => row.keyword).sort(),
    vocabulary: buildVocabulary(rows),
  }
  cached = { keywords, at: Date.now() }
  return keywords
}

// The `keyword` property for the OpenAI schema. A real null means "none": the
// old hard-coded list had a "null" string for this, which then got saved.
export function keywordSchema(keywords: string[], description: string) {
  if (!keywords.length) return { type: "null", description: "Always null." }
  return { type: ["string", "null"], enum: [...keywords, null], description }
}

// What gets stored: the AI's keyword if it's in the list, else the on-device
// matcher's pick for the line (what iOS and the web would show), else null.
// Never the string "null".
export function resolveKeyword(
  aiKeyword: unknown,
  desc: string,
  measurement: string | null | undefined,
  keywords: IngredientKeywords,
): string | null {
  if (typeof aiKeyword === "string" && keywords.vocabulary.images.has(aiKeyword)) return aiKeyword
  return matchKeyword(keywords.vocabulary, desc ?? "", measurement)
}
