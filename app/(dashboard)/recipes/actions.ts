"use server";

import { createClient } from "@/lib/supabase/server";
import { LIMITS } from "@/lib/validation/limits";
import { getImportUsage } from "@/lib/subscription/entitlement";

/**
 * Why a caller was turned away, when the reason is something the UI should act
 * on rather than just print. `quota_exceeded` swaps the import fields for an
 * upgrade prompt instead of showing a red error string.
 */
export type ImportFailureReason = "quota_exceeded";

function recipeThumbnailUrl(path: string | null | undefined) {
  if (!path) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/recipes/${path}`;
}

export async function createBlankRecipe() {
  const supabase = await createClient();
  const { data: claimsData, error: authError } = await supabase.auth.getClaims();
  if (authError || !claimsData?.claims) {
    return { ok: false as const, error: "Not authenticated" };
  }
  const userId = claimsData.claims.sub;

  const { data: recipe, error } = await supabase
    .from("recipes")
    .insert({ user_id: userId, name: "Untitled Recipe" })
    .select("id")
    .single();

  if (error || !recipe) {
    return { ok: false as const, error: error?.message ?? "Failed to create recipe" };
  }

  return { ok: true as const, recipeId: recipe.id };
}

async function invokeImportRecipe(body: { urlText?: string; images?: string[] }) {
  const supabase = await createClient();
  const { data: claimsData, error: authError } = await supabase.auth.getClaims();
  if (authError || !claimsData?.claims) {
    return { ok: false as const, error: "Not authenticated" };
  }

  // Pre-flight the free-plan cap. This is a courtesy, not the gate -- the real
  // one is inside the edge function, which is also what protects the iOS app
  // and anyone calling the endpoint directly. Checking here just saves a ~30s
  // scrape-and-OpenAI round-trip before telling someone they need to upgrade.
  const usage = await getImportUsage();
  if (usage.exhausted) {
    return {
      ok: false as const,
      error: `You've used all ${usage.limit} free imports.`,
      reason: "quota_exceeded" as const,
    };
  }

  const { data, error } = await supabase.functions.invoke("import-recipe", { body });

  if (error) {
    let message = "Failed to import recipe";
    let reason: ImportFailureReason | undefined;
    if (error.context && typeof error.context.json === "function") {
      try {
        const errorBody = await error.context.json();
        if (errorBody?.error) message = errorBody.error;
        // The edge function answers 402 with this code when the cap is hit.
        // Reachable despite the pre-flight above: the counter can be spent by
        // another device between the two calls.
        if (errorBody?.code === "import_limit_reached") reason = "quota_exceeded";
      } catch {
        // response body wasn't JSON; fall back to the generic message
      }
    } else if (error.message) {
      message = error.message;
    }
    return { ok: false as const, error: message, reason };
  }

  const recipeId = data?.id;
  if (!recipeId) {
    return { ok: false as const, error: "Import succeeded but no recipe was returned" };
  }

  return { ok: true as const, recipeId };
}

export async function importRecipeFromImages(images: string[]) {
  if (!Array.isArray(images) || !images.length) {
    return { ok: false as const, error: "No images provided" };
  }
  if (images.length > LIMITS.importImages || !images.every((image) => typeof image === "string")) {
    return {
      ok: false as const,
      error: `You can import up to ${LIMITS.importImages} pages at a time`,
    };
  }
  return invokeImportRecipe({ images });
}

export async function importRecipeFromUrl(urlText: string) {
  const trimmed = urlText.trim();
  if (!trimmed) {
    return { ok: false as const, error: "No link provided" };
  }
  if (trimmed.length > LIMITS.importUrl) {
    return { ok: false as const, error: "That link is too long" };
  }
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false as const, error: "That doesn't look like a valid URL" };
  }
  // Only web pages -- never file:, data:, javascript: or anything else the
  // scraper might be coaxed into resolving.
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false as const, error: "Please paste a web link (http or https)" };
  }
  return invokeImportRecipe({ urlText: trimmed });
}

export interface RecipeSearchResult {
  id: number;
  name: string;
  imageUrl: string | null;
  source: string | null;
  rating: number;
}

export async function listRecipesForSearch() {
  const supabase = await createClient();
  const { data: claimsData, error: authError } = await supabase.auth.getClaims();
  if (authError || !claimsData?.claims) {
    return { ok: false as const, error: "Not authenticated" };
  }
  const userId = claimsData.claims.sub;

  const { data, error } = await supabase
    .from("recipes")
    .select("id, name, thumbnail, source_text, rating")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    return { ok: false as const, error: error.message };
  }

  const recipes: RecipeSearchResult[] = (data ?? []).map((recipe) => ({
    id: recipe.id,
    name: recipe.name,
    imageUrl: recipeThumbnailUrl(recipe.thumbnail),
    source: recipe.source_text,
    rating: recipe.rating ?? 0,
  }));

  return { ok: true as const, recipes };
}
