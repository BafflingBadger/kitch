"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { MEAL_TYPES, type MealPlanType } from "@/lib/meal-plan/constants";
import type { FoodMacros, FoodSuggestion } from "@/lib/meal-plan/macros";
import { LIMITS } from "@/lib/validation/limits";

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

/* ------------------------------------------------------------------ */
/* Quick Add                                                           */
/* ------------------------------------------------------------------ */

/**
 * Why an estimate was refused, when the UI should act on it rather than print
 * it: `limit_reached` swaps the Estimate button for a Premium upsell.
 */
export type EstimateFailureReason = "limit_reached";

/** Free-tier AI estimates per day. The real limit lives in `macro_estimates_consume()`. */
const FREE_DAILY_ESTIMATES = 3;

type FoodItemRow = {
  id: number;
  name: string;
  serving: string | null;
  calories: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  is_favourite: boolean;
};

function toFoodSuggestion(row: FoodItemRow): FoodSuggestion {
  return {
    id: row.id,
    name: row.name,
    serving: row.serving,
    calories: row.calories,
    proteinG: Number(row.protein_g),
    fatG: Number(row.fat_g),
    carbsG: Number(row.carbs_g),
    isFavourite: row.is_favourite,
  };
}

function isValidGrams(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= LIMITS.foodGrams;
}

/** Validates and normalises one item from the client. Returns null if it is out of range. */
function parseFoodItem(value: unknown): FoodMacros | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;

  const name = typeof item.name === "string" ? item.name.trim() : "";
  if (!name || name.length > LIMITS.foodName) return null;

  let serving: string | null = null;
  if (item.serving != null) {
    if (typeof item.serving !== "string") return null;
    serving = item.serving.trim() || null;
    if (serving && serving.length > LIMITS.foodServing) return null;
  }

  const { calories, proteinG, fatG, carbsG } = item;
  if (
    typeof calories !== "number" ||
    !Number.isFinite(calories) ||
    calories < 0 ||
    calories > LIMITS.foodCalories ||
    !isValidGrams(proteinG) ||
    !isValidGrams(fatG) ||
    !isValidGrams(carbsG)
  ) {
    return null;
  }

  return {
    name,
    serving,
    calories: Math.round(calories),
    proteinG: Math.round(proteinG * 10) / 10,
    fatG: Math.round(fatG * 10) / 10,
    carbsG: Math.round(carbsG * 10) / 10,
  };
}

/**
 * The caller's favourites and recent foods, plus how many AI estimates they
 * have left today (null for Premium).
 */
export async function listFoodSuggestions() {
  const supabase = await createClient();
  const { data: claimsData, error: authError } = await supabase.auth.getClaims();
  if (authError || !claimsData?.claims) {
    return { ok: false as const, error: "Not authenticated" };
  }
  const userId = claimsData.claims.sub;
  const today = new Date().toISOString().slice(0, 10);
  const columns = "id, name, serving, calories, protein_g, fat_g, carbs_g, is_favourite";

  const [favouritesResult, recentResult, premiumResult, usageResult] = await Promise.all([
    supabase
      .from("food_items")
      .select(columns)
      .eq("user_id", userId)
      .eq("is_favourite", true)
      .order("name", { ascending: true }),
    supabase
      .from("food_items")
      .select(columns)
      .eq("user_id", userId)
      .not("last_used_at", "is", null)
      .order("last_used_at", { ascending: false })
      .limit(15),
    supabase.rpc("has_active_premium"),
    supabase
      .from("macro_estimate_usage")
      .select("count")
      .eq("user_id", userId)
      .eq("day", today)
      .maybeSingle(),
  ]);

  if (favouritesResult.error || recentResult.error) {
    return {
      ok: false as const,
      error: (favouritesResult.error ?? recentResult.error)!.message,
    };
  }

  const favourites = (favouritesResult.data ?? []).map(toFoodSuggestion);
  const favouriteIds = new Set(favourites.map((f) => f.id));
  const recent = (recentResult.data ?? [])
    .map(toFoodSuggestion)
    .filter((item) => !favouriteIds.has(item.id));

  // Display only; the edge function is the gate. Treat a failed premium check
  // as free so the hint errs towards showing a count.
  const estimatesRemaining = premiumResult.data
    ? null
    : Math.max(FREE_DAILY_ESTIMATES - (usageResult.data?.count ?? 0), 0);

  return { ok: true as const, favourites, recent, estimatesRemaining };
}

export async function estimateMacros(description: string) {
  const trimmed = typeof description === "string" ? description.trim() : "";
  if (!trimmed) {
    return { ok: false as const, error: "Describe what you ate" };
  }
  if (trimmed.length > LIMITS.foodDescription) {
    return { ok: false as const, error: "That description is too long" };
  }

  const supabase = await createClient();
  const { data: claimsData, error: authError } = await supabase.auth.getClaims();
  if (authError || !claimsData?.claims) {
    return { ok: false as const, error: "Not authenticated" };
  }

  const { data, error } = await supabase.functions.invoke("estimate-macros", {
    body: { description: trimmed },
  });

  if (error) {
    let message = "Could not estimate macros";
    let reason: EstimateFailureReason | undefined;
    if (error.context && typeof error.context.json === "function") {
      try {
        const errorBody = await error.context.json();
        if (errorBody?.error) message = errorBody.error;
        if (errorBody?.code === "macro_estimate_limit_reached") reason = "limit_reached";
      } catch {
        // response body wasn't JSON; fall back to the generic message
      }
    }
    return { ok: false as const, error: message, reason };
  }

  const rawItems: unknown[] = Array.isArray(data?.items) ? data.items : [];
  const items = rawItems
    .map((raw) => {
      const item = raw as Record<string, unknown>;
      return parseFoodItem({
        name: item.name,
        serving: item.serving,
        calories: item.calories,
        proteinG: item.protein_g,
        fatG: item.fat_g,
        carbsG: item.carbs_g,
      });
    })
    .filter((item): item is FoodMacros => item !== null);

  if (items.length === 0) {
    return { ok: false as const, error: "Couldn't find any food in that description" };
  }

  const remaining = typeof data?.remaining === "number" ? data.remaining : null;
  return { ok: true as const, items, estimatesRemaining: remaining };
}

export async function addFoodEntries(date: string, type: MealPlanType, items: unknown) {
  if (!ISO_DATE_RE.test(date)) {
    return { ok: false as const, error: "Invalid date" };
  }
  if (!MEAL_TYPES.includes(type)) {
    return { ok: false as const, error: "Invalid meal type" };
  }
  if (!Array.isArray(items) || items.length === 0) {
    return { ok: false as const, error: "Add at least one food" };
  }
  if (items.length > LIMITS.quickAddItems) {
    return { ok: false as const, error: `You can add up to ${LIMITS.quickAddItems} foods at once` };
  }
  const parsed = items.map(parseFoodItem);
  if (parsed.some((item) => item === null)) {
    return { ok: false as const, error: "Check each food has a name and sensible numbers" };
  }

  const supabase = await createClient();
  const { data: claimsData, error: authError } = await supabase.auth.getClaims();
  if (authError || !claimsData?.claims) {
    return { ok: false as const, error: "Not authenticated" };
  }

  const userId = claimsData.claims.sub;

  const { error } = await supabase.rpc("meal_food_entries_add", {
    p_date: date,
    p_type: type,
    p_items: (parsed as FoodMacros[]).map((item) => ({
      name: item.name,
      serving: item.serving,
      calories: item.calories,
      protein_g: item.proteinG,
      fat_g: item.fatG,
      carbs_g: item.carbsG,
    })),
  });

  if (error) {
    return { ok: false as const, error: error.message };
  }

  // Foods starred in the review list before they had a library row. The RPC
  // has just created (or matched) that row by case-insensitive name, so match
  // the same way. Best effort: the entries are already saved.
  const favouriteNames = items
    .filter((item) => (item as { isFavourite?: unknown })?.isFavourite === true)
    .map((item) => (item as { name: string }).name.trim());
  await Promise.all(
    favouriteNames.map((name) =>
      supabase
        .from("food_items")
        .update({ is_favourite: true })
        .eq("user_id", userId)
        .ilike("name", name.replace(/[\\%_]/g, "\\$&")),
    ),
  );

  revalidatePath("/meal-prep");

  return { ok: true as const };
}

export async function setFoodFavourite(foodItemId: number, isFavourite: boolean) {
  if (!Number.isInteger(foodItemId) || foodItemId <= 0) {
    return { ok: false as const, error: "Invalid food id" };
  }
  if (typeof isFavourite !== "boolean") {
    return { ok: false as const, error: "Invalid favourite value" };
  }

  const supabase = await createClient();
  const { data: claimsData, error: authError } = await supabase.auth.getClaims();
  if (authError || !claimsData?.claims) {
    return { ok: false as const, error: "Not authenticated" };
  }
  const userId = claimsData.claims.sub;

  const { error } = await supabase
    .from("food_items")
    .update({ is_favourite: isFavourite })
    .eq("id", foodItemId)
    .eq("user_id", userId);

  if (error) {
    return { ok: false as const, error: error.message };
  }

  revalidatePath("/meal-prep");

  return { ok: true as const };
}

export async function removeFoodEntry(entryId: number) {
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
    .from("mealplan_food_entries")
    .delete()
    .eq("id", entryId)
    .eq("user_id", userId);

  if (error) {
    return { ok: false as const, error: error.message };
  }

  revalidatePath("/meal-prep");

  return { ok: true as const };
}
