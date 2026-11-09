import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";
import { buildVocabulary, type IngredientVocabulary } from "@/lib/ingredients/keywords";

/**
 * The `ingredient_keywords` table (shared with iOS and `import-recipe`), ready
 * to match against. Fails open with an empty list: nothing is matched and saved
 * keywords are kept as they are (see `isKnownKeyword`).
 */
export async function getIngredientVocabulary(
  supabase: SupabaseClient<Database>,
): Promise<IngredientVocabulary> {
  const { data, error } = await supabase
    .from("ingredient_keywords")
    .select("keyword, image_name, aliases");
  if (error) console.error(`Failed to load ingredient keywords: ${error.message}`);
  return buildVocabulary(data ?? []);
}
