// The keywords the AI picks from for each ingredient, read from the
// `ingredient_keywords` table that iOS and the web app match against too.
// Change the list with a migration, not here.

// Reference data that changes with a migration, so a warm instance can reuse it
// for a while instead of reading it on every import.
const CACHE_MS = 10 * 60 * 1000
let cached: { keywords: string[]; at: number } | null = null

// The keywords, or the last list loaded if the read fails. Empty only when it
// has never loaded: imports then store null keywords, and clients match them
// on device.
export async function getIngredientKeywords(supabase: any): Promise<string[]> {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.keywords

  const { data, error } = await supabase.from("ingredient_keywords").select("keyword")
  if (error || !data?.length) {
    console.error(`Failed to load ingredient keywords: ${error?.message ?? "no rows"}`)
    return cached?.keywords ?? []
  }

  cached = { keywords: data.map((row: { keyword: string }) => row.keyword).sort(), at: Date.now() }
  return cached.keywords
}

// The `keyword` property for the OpenAI schema. A real null means "none": the
// old hard-coded list had a "null" string for this, which then got saved.
export function keywordSchema(keywords: string[], description: string) {
  if (!keywords.length) return { type: "null", description: "Always null." }
  return { type: ["string", "null"], enum: [...keywords, null], description }
}

// What gets stored: a keyword from the list, or null. Never the string "null".
export function cleanKeyword(keyword: unknown, keywords: string[]): string | null {
  return typeof keyword === "string" && keywords.includes(keyword) ? keyword : null
}
