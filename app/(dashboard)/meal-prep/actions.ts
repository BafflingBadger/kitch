"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { MEAL_TYPES, type MealPlanType } from "@/lib/meal-plan/constants";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function recipeThumbnailUrl(path: string | null | undefined) {
  if (!path) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/recipes/${path}`;
}

export async function addMealPlanEntry(recipeId: number, date: string, type: MealPlanType) {
  if (!Number.isInteger(recipeId) || recipeId <= 0) {
    return { ok: false as const, error: "Invalid recipe id" };
  }
  if (!ISO_DATE_RE.test(date)) {
    return { ok: false as const, error: "Invalid date" };
  }
  if (!MEAL_TYPES.includes(type)) {
    return { ok: false as const, error: "Invalid meal type" };
  }

  const supabase = await createClient();
  const { data: claimsData, error: authError } = await supabase.auth.getClaims();
  if (authError || !claimsData?.claims) {
    return { ok: false as const, error: "Not authenticated" };
  }
  const userId = claimsData.claims.sub;

  const { data: recipe } = await supabase
    .from("recipes")
    .select("id")
    .eq("id", recipeId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!recipe) {
    return { ok: false as const, error: "Recipe not found" };
  }

  const { error } = await supabase
    .from("mealplan_recipe_mapping")
    .insert({ recipe_id: recipeId, date, type, user_id: userId });

  if (error) {
    return { ok: false as const, error: error.message };
  }

  revalidatePath("/meal-prep");
  revalidatePath(`/recipes/${recipeId}`);

  return { ok: true as const };
}

export async function removeMealPlanEntry(entryId: number) {
  if (!Number.isInteger(entryId) || entryId <= 0) {
    return { ok: false as const, error: "Invalid entry id" };
  }

  const supabase = await createClient();
  const { data: claimsData, error: authError } = await supabase.auth.getClaims();
  if (authError || !claimsData?.claims) {
    return { ok: false as const, error: "Not authenticated" };
  }
  const userId = claimsData.claims.sub;

  const { error } = await supabase
    .from("mealplan_recipe_mapping")
    .delete()
    .eq("id", entryId)
    .eq("user_id", userId);

  if (error) {
    return { ok: false as const, error: error.message };
  }

  revalidatePath("/meal-prep");

  return { ok: true as const };
}

export async function listCookbooksForMealPlan() {
  const supabase = await createClient();
  const { data: claimsData, error: authError } = await supabase.auth.getClaims();
  if (authError || !claimsData?.claims) {
    return { ok: false as const, error: "Not authenticated" };
  }
  const userId = claimsData.claims.sub;

  const { data: cookbookRows, error } = await supabase
    .from("cookbooks")
    .select("id, title")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true });

  if (error) {
    return { ok: false as const, error: error.message };
  }

  return { ok: true as const, cookbooks: cookbookRows ?? [] };
}

type MealPlanRecipeOption = {
  id: number;
  name: string;
  imageUrl: string | null;
  source: string | null;
  rating: number;
  createdAt: number;
};

export async function listRecipesForMealPlan(cookbookId?: number) {
  const supabase = await createClient();
  const { data: claimsData, error: authError } = await supabase.auth.getClaims();
  if (authError || !claimsData?.claims) {
    return { ok: false as const, error: "Not authenticated" };
  }
  const userId = claimsData.claims.sub;

  let recipes: MealPlanRecipeOption[];

  if (cookbookId) {
    const { data: cookbook } = await supabase
      .from("cookbooks")
      .select("id")
      .eq("id", cookbookId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!cookbook) {
      return { ok: false as const, error: "Cookbook not found" };
    }

    const { data, error } = await supabase
      .from("recipes_mapping")
      .select("recipes(id, name, thumbnail, source_text, rating, created_at)")
      .eq("cookbook_id", cookbookId)
      .order("created_at", { ascending: false });

    if (error) {
      return { ok: false as const, error: error.message };
    }

    recipes = (data ?? [])
      .map((row) => row.recipes)
      .filter((recipe): recipe is NonNullable<typeof recipe> => recipe !== null)
      .map((recipe) => ({
        id: recipe.id,
        name: recipe.name,
        imageUrl: recipeThumbnailUrl(recipe.thumbnail),
        source: recipe.source_text,
        rating: recipe.rating ?? 0,
        createdAt: new Date(recipe.created_at).getTime(),
      }));
  } else {
    const { data: recipeRows, error } = await supabase
      .from("recipes")
      .select("id, name, thumbnail, source_text, rating, created_at")
      .eq("user_id", userId)
      .order("name", { ascending: true });

    if (error) {
      return { ok: false as const, error: error.message };
    }

    recipes = (recipeRows ?? []).map((recipe) => ({
      id: recipe.id,
      name: recipe.name,
      imageUrl: recipeThumbnailUrl(recipe.thumbnail),
      source: recipe.source_text,
      rating: recipe.rating ?? 0,
      createdAt: new Date(recipe.created_at).getTime(),
    }));
  }

  return { ok: true as const, recipes };
}
