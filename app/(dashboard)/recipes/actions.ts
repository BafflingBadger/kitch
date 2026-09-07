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
