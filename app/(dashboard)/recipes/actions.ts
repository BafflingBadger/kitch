"use server";

import { createClient } from "@/lib/supabase/server";

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

  const { data, error } = await supabase.functions.invoke("import-recipe", { body });

  if (error) {
    let message = "Failed to import recipe";
    if (error.context && typeof error.context.json === "function") {
      try {
        const errorBody = await error.context.json();
        if (errorBody?.error) message = errorBody.error;
      } catch {
        // response body wasn't JSON; fall back to the generic message
      }
    } else if (error.message) {
      message = error.message;
    }
    return { ok: false as const, error: message };
  }

  const recipeId = data?.id;
  if (!recipeId) {
    return { ok: false as const, error: "Import succeeded but no recipe was returned" };
  }

  return { ok: true as const, recipeId };
}

export async function importRecipeFromImages(images: string[]) {
  if (!images.length) {
    return { ok: false as const, error: "No images provided" };
  }
  return invokeImportRecipe({ images });
}

export async function importRecipeFromUrl(urlText: string) {
  const trimmed = urlText.trim();
  if (!trimmed) {
    return { ok: false as const, error: "No link provided" };
  }
  try {
    new URL(trimmed);
  } catch {
    return { ok: false as const, error: "That doesn't look like a valid URL" };
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
