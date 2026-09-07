"use server";

import { createClient } from "@/lib/supabase/server";

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
