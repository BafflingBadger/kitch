"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getEntitlement } from "@/lib/subscription/entitlement";
import { LIMITS, isIdList } from "@/lib/validation/limits";

function recipeThumbnailUrl(path: string | null | undefined) {
  if (!path) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/recipes/${path}`;
}

/** What `RecipeImageUpload` writes: `public/<uuid>.<ext>`. */
const UPLOADED_THUMBNAIL =
  /^public\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp|heic)$/;

/** `id` is the existing row being edited, or null for a new one. */
type RecipeRow = { id?: number | null; desc: string; is_heading: boolean };

function isRecipeRowList(value: unknown): value is RecipeRow[] {
  return (
    Array.isArray(value) &&
    value.length <= LIMITS.recipeRows &&
    value.every(
      (row) =>
        typeof row?.desc === "string" &&
        row.desc.length <= LIMITS.recipeLine &&
        typeof row.is_heading === "boolean" &&
        (row.id == null || (Number.isInteger(row.id) && row.id > 0)),
    )
  );
}

/** Per-serving macros as the recipe editor sends them. */
export interface RecipeMacrosInput {
  servings: number;
  calories: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
  /**
   * The AI's score out of 10 for these numbers, when they are Auto Estimate's
   * unedited output; null when typed or edited by hand. Recorded, not shown.
   */
  confidence: number | null;
}

function isNumberIn(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}

/** Validates and rounds to the column precision, or returns null. */
function parseRecipeMacros(value: unknown): RecipeMacrosInput | null {
  if (!value || typeof value !== "object") return null;
  const m = value as Record<string, unknown>;
  if (
    !isNumberIn(m.servings, 0, LIMITS.recipeServings) ||
    !isNumberIn(m.calories, 0, LIMITS.foodCalories) ||
    !isNumberIn(m.proteinG, 0, LIMITS.foodGrams) ||
    !isNumberIn(m.fatG, 0, LIMITS.foodGrams) ||
    !isNumberIn(m.carbsG, 0, LIMITS.foodGrams)
  ) {
    return null;
  }
  const servings = Math.round(m.servings * 100) / 100;
  if (servings <= 0) return null;
  let confidence: number | null = null;
  if (m.confidence != null) {
    if (!Number.isInteger(m.confidence) || !isNumberIn(m.confidence, 0, 10)) return null;
    confidence = m.confidence as number;
  }
  return {
    servings,
    calories: Math.round(m.calories),
    proteinG: Math.round(m.proteinG * 10) / 10,
    fatG: Math.round(m.fatG * 10) / 10,
    carbsG: Math.round(m.carbsG * 10) / 10,
    confidence,
  };
}

function validateRecipeInput(
  name: string,
  input: { notes: unknown; thumbnail: unknown; ingredients: unknown; directions: unknown },
): string | null {
  if (name.length > LIMITS.recipeName) {
    return `Recipe names can be up to ${LIMITS.recipeName} characters`;
  }
  if (input.notes !== null && typeof input.notes !== "string") return "Invalid notes";
  if (typeof input.notes === "string" && input.notes.length > LIMITS.recipeNotes) {
    return `Notes can be up to ${LIMITS.recipeNotes} characters`;
  }
  if (input.thumbnail !== null && typeof input.thumbnail !== "string") return "Invalid image";
  if (!isRecipeRowList(input.ingredients)) return "Invalid ingredient list";
  if (!isRecipeRowList(input.directions)) return "Invalid direction list";
  return null;
}

export async function updateRecipeRating(recipeId: number, rating: number) {
  if (!Number.isInteger(recipeId) || recipeId <= 0) {
    return { ok: false as const, error: "Invalid recipe id" };
  }
  if (!Number.isInteger(rating) || rating < 0 || rating > 5) {
    return { ok: false as const, error: "Rating must be between 0 and 5" };
  }

  const supabase = await createClient();
  const { data: claimsData, error: authError } = await supabase.auth.getClaims();
  if (authError || !claimsData?.claims) {
    return { ok: false as const, error: "Not authenticated" };
  }
  const userId = claimsData.claims.sub;

  const { error } = await supabase
    .from("recipes")
    .update({ rating })
    .eq("id", recipeId)
    .eq("user_id", userId);

  if (error) {
    return { ok: false as const, error: error.message };
  }

  revalidatePath(`/recipes/${recipeId}`);
  revalidatePath("/cookbooks/[id]", "page");

  return { ok: true as const };
}

export async function updateRecipe(
  recipeId: number,
  input: {
    name: string;
    rating: number;
    notes: string | null;
    thumbnail: string | null;
    ingredients: RecipeRow[];
    directions: RecipeRow[];
    macros: RecipeMacrosInput;
  },
) {
  if (!Number.isInteger(recipeId) || recipeId <= 0) {
    return { ok: false as const, error: "Invalid recipe id" };
  }
  const trimmedName = input.name.trim();
  if (!trimmedName) {
    return { ok: false as const, error: "Recipe name is required" };
  }
  if (!Number.isInteger(input.rating) || input.rating < 0 || input.rating > 5) {
    return { ok: false as const, error: "Rating must be between 0 and 5" };
  }
  const inputError = validateRecipeInput(trimmedName, input);
  if (inputError) {
    return { ok: false as const, error: inputError };
  }
  // Macros are only ever what the user typed or accepted from Auto Estimate:
  // saving never calls the AI.
  const macros = parseRecipeMacros(input.macros);
  if (!macros) {
    return { ok: false as const, error: "Check the servings and nutrition numbers" };
  }

  const supabase = await createClient();
  const { data: claimsData, error: authError } = await supabase.auth.getClaims();
  if (authError || !claimsData?.claims) {
    return { ok: false as const, error: "Not authenticated" };
  }
  const userId = claimsData.claims.sub;

  const { data: recipe } = await supabase
    .from("recipes")
    .select("id, thumbnail")
    .eq("id", recipeId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!recipe) {
    return { ok: false as const, error: "Recipe not found" };
  }

  // A new thumbnail must be a file the web uploader just produced. Pointing it
  // at an existing object would let the recipes-bucket delete policy -- which
  // trusts whatever `thumbnail` names -- remove someone else's image.
  if (
    input.thumbnail !== null &&
    input.thumbnail !== recipe.thumbnail &&
    !UPLOADED_THUMBNAIL.test(input.thumbnail)
  ) {
    return { ok: false as const, error: "That image isn't valid" };
  }

  const { error: updateError } = await supabase
    .from("recipes")
    .update({
      name: trimmedName,
      rating: input.rating,
      notes: input.notes?.trim() || null,
      thumbnail: input.thumbnail,
      servings: macros.servings,
      calories: macros.calories,
      protein_g: macros.proteinG,
      fat_g: macros.fatG,
      carbs_g: macros.carbsG,
      macros_confidence: macros.confidence,
    })
    .eq("id", recipeId)
    .eq("user_id", userId);
  if (updateError) {
    return { ok: false as const, error: updateError.message };
  }

  // The editor only edits text, so carry over what it doesn't show: the icon
  // `keyword` (iOS draws ingredient icons from it) and the `measurement` it
  // bolds. Matched by the row's id on the server, so a caller can't set them.
  const { data: existingIngredients, error: existingIngredientsError } = await supabase
    .from("ingredients")
    .select("id, keyword, measurement")
    .eq("recipe_id", recipeId);
  if (existingIngredientsError) {
    return { ok: false as const, error: existingIngredientsError.message };
  }
  const existingById = new Map((existingIngredients ?? []).map((row) => [row.id, row]));

  const ingredientRows = input.ingredients
    .filter((row) => row.desc.trim() !== "")
    .map((row, index) => {
      const desc = row.desc.trim();
      const existing = row.id != null && !row.is_heading ? existingById.get(row.id) : undefined;
      // An edited line is still the same ingredient, but its measurement must
      // still appear in the text, since clients bold it by finding it there.
      const measurement =
        existing?.measurement && desc.includes(existing.measurement) ? existing.measurement : null;
      return {
        recipe_id: recipeId,
        desc,
        order: index,
        is_heading: row.is_heading,
        keyword: existing?.keyword ?? null,
        measurement,
      };
    });
  const directionRows = input.directions
    .filter((row) => row.desc.trim() !== "")
    .map((row, index) => ({
      recipe_id: recipeId,
      desc: row.desc.trim(),
      order: index,
      is_heading: row.is_heading,
    }));

  const { error: deleteIngredientsError } = await supabase
    .from("ingredients")
    .delete()
    .eq("recipe_id", recipeId);
  if (deleteIngredientsError) {
    return { ok: false as const, error: deleteIngredientsError.message };
  }
  if (ingredientRows.length > 0) {
    const { error } = await supabase.from("ingredients").insert(ingredientRows);
    if (error) return { ok: false as const, error: error.message };
  }

  const { error: deleteDirectionsError } = await supabase
    .from("directions")
    .delete()
    .eq("recipe_id", recipeId);
  if (deleteDirectionsError) {
    return { ok: false as const, error: deleteDirectionsError.message };
  }
  if (directionRows.length > 0) {
    const { error } = await supabase.from("directions").insert(directionRows);
    if (error) return { ok: false as const, error: error.message };
  }

  revalidatePath(`/recipes/${recipeId}`);
  revalidatePath(`/recipes/${recipeId}/edit`);
  revalidatePath("/cookbooks/[id]", "page");

  return { ok: true as const };
}

/**
 * "Auto Estimate" in the recipe editor (Premium only). Estimates from the
 * editor's unsaved name and ingredient lines and returns the numbers for the
 * user to review; nothing is saved. The edge function is the real gate.
 */
export async function estimateRecipeMacros(name: string, ingredients: string[], servings: number | null) {
  const trimmedName = typeof name === "string" ? name.trim() : "";
  if (trimmedName.length > LIMITS.recipeName) {
    return { ok: false as const, error: "That recipe name is too long" };
  }
  if (
    !Array.isArray(ingredients) ||
    ingredients.length > LIMITS.recipeRows ||
    !ingredients.every((line) => typeof line === "string" && line.length <= LIMITS.recipeLine)
  ) {
    return { ok: false as const, error: "Invalid ingredient list" };
  }
  if (servings !== null && !isNumberIn(servings, 0, LIMITS.recipeServings)) {
    return { ok: false as const, error: "Invalid servings" };
  }

  const supabase = await createClient();
  const { data: claimsData, error: authError } = await supabase.auth.getClaims();
  if (authError || !claimsData?.claims) {
    return { ok: false as const, error: "Not authenticated" };
  }
  if (!(await getEntitlement()).isPremium) {
    return { ok: false as const, error: "Auto Estimate is a Premium feature." };
  }

  const { data, error } = await supabase.functions.invoke("estimate-recipe-macros", {
    body: {
      name: trimmedName,
      ingredients: ingredients.map((line) => line.trim()).filter(Boolean),
      servings: servings && servings > 0 ? servings : undefined,
    },
  });

  if (error) {
    let message = "Could not estimate macros";
    if (error.context && typeof error.context.json === "function") {
      try {
        const errorBody = await error.context.json();
        if (errorBody?.error) message = errorBody.error;
      } catch {
        // response body wasn't JSON; fall back to the generic message
      }
    }
    return { ok: false as const, error: message };
  }

  const raw = data?.macros as Record<string, unknown> | undefined;
  const macros = parseRecipeMacros({
    servings: raw?.servings,
    calories: raw?.calories,
    proteinG: raw?.protein_g,
    fatG: raw?.fat_g,
    carbsG: raw?.carbs_g,
    confidence: raw?.confidence ?? null,
  });
  if (!macros) {
    return { ok: false as const, error: "Could not estimate macros" };
  }

  return { ok: true as const, macros };
}

export async function listCookbooksForRecipe(recipeId: number) {
  if (!Number.isInteger(recipeId) || recipeId <= 0) {
    return { ok: false as const, error: "Invalid recipe id" };
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

  const { data: cookbookRows } = await supabase
    .from("cookbooks")
    .select("id, title")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true });

  const cookbookIds = (cookbookRows ?? []).map((cookbook) => cookbook.id);

  const [{ data: memberships }, { data: latestMappings }] = await Promise.all([
    supabase.from("recipes_mapping").select("cookbook_id").eq("recipe_id", recipeId),
    cookbookIds.length > 0
      ? supabase
          .from("recipes_mapping")
          .select("cookbook_id, created_at, recipes(thumbnail)")
          .in("cookbook_id", cookbookIds)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as Array<{ cookbook_id: number; recipes: { thumbnail: string | null } | null }> }),
  ]);

  const latestThumbnailByCookbook = new Map<number, string | null>();
  for (const mapping of latestMappings ?? []) {
    if (!latestThumbnailByCookbook.has(mapping.cookbook_id)) {
      latestThumbnailByCookbook.set(mapping.cookbook_id, mapping.recipes?.thumbnail ?? null);
    }
  }

  const memberIds = new Set((memberships ?? []).map((m) => m.cookbook_id));
  const items = (cookbookRows ?? []).map((cookbook) => ({
    id: cookbook.id,
    title: cookbook.title,
    isMember: memberIds.has(cookbook.id),
    imageUrl: recipeThumbnailUrl(latestThumbnailByCookbook.get(cookbook.id)),
  }));

  return { ok: true as const, cookbooks: items };
}

export async function createCookbook(title: string) {
  const trimmedTitle = title.trim();
  if (!trimmedTitle) {
    return { ok: false as const, error: "Cookbook name is required" };
  }
  if (trimmedTitle.length > LIMITS.cookbookTitle) {
    return { ok: false as const, error: `Cookbook names can be up to ${LIMITS.cookbookTitle} characters` };
  }

  const supabase = await createClient();
  const { data: claimsData, error: authError } = await supabase.auth.getClaims();
  if (authError || !claimsData?.claims) {
    return { ok: false as const, error: "Not authenticated" };
  }
  const userId = claimsData.claims.sub;

  const { data: cookbook, error } = await supabase
    .from("cookbooks")
    .insert({ title: trimmedTitle, user_id: userId })
    .select("id, title")
    .single();

  if (error || !cookbook) {
    return { ok: false as const, error: error?.message ?? "Failed to create cookbook" };
  }

  revalidatePath("/cookbooks");

  return { ok: true as const, cookbook };
}

export async function saveRecipeCookbooks(recipeId: number, cookbookIds: number[]) {
  if (!Number.isInteger(recipeId) || recipeId <= 0) {
    return { ok: false as const, error: "Invalid recipe id" };
  }
  if (!isIdList(cookbookIds)) {
    return { ok: false as const, error: "Invalid cookbook list" };
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

  const { data: ownedCookbooks } = await supabase
    .from("cookbooks")
    .select("id")
    .eq("user_id", userId);
  const ownedIds = new Set((ownedCookbooks ?? []).map((c) => c.id));
  const targetIds = cookbookIds.filter((id) => ownedIds.has(id));

  const { data: existingMappings } = await supabase
    .from("recipes_mapping")
    .select("cookbook_id")
    .eq("recipe_id", recipeId);
  const existingIds = new Set((existingMappings ?? []).map((m) => m.cookbook_id));

  const toAdd = targetIds.filter((id) => !existingIds.has(id));
  const toRemove = [...existingIds].filter((id) => !targetIds.includes(id));

  if (toAdd.length > 0) {
    const { error } = await supabase
      .from("recipes_mapping")
      .insert(toAdd.map((cookbook_id) => ({ recipe_id: recipeId, cookbook_id })));
    if (error) return { ok: false as const, error: error.message };
  }

  if (toRemove.length > 0) {
    const { error } = await supabase
      .from("recipes_mapping")
      .delete()
      .eq("recipe_id", recipeId)
      .in("cookbook_id", toRemove);
    if (error) return { ok: false as const, error: error.message };
  }

  revalidatePath(`/recipes/${recipeId}`);
  revalidatePath("/cookbooks");
  revalidatePath("/cookbooks/[id]", "page");

  return { ok: true as const };
}

export async function deleteRecipe(recipeId: number) {
  if (!Number.isInteger(recipeId) || recipeId <= 0) {
    return { ok: false as const, error: "Invalid recipe id" };
  }

  const supabase = await createClient();
  const { data: claimsData, error: authError } = await supabase.auth.getClaims();
  if (authError || !claimsData?.claims) {
    return { ok: false as const, error: "Not authenticated" };
  }
  const userId = claimsData.claims.sub;

  const { data: recipe } = await supabase
    .from("recipes")
    .select("id, thumbnail")
    .eq("id", recipeId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!recipe) {
    return { ok: false as const, error: "Recipe not found" };
  }

  const { data: sourceImages } = await supabase
    .from("recipe_source_images")
    .select("storage_path")
    .eq("recipe_id", recipeId);

  // Imports that found no image store "" rather than null, so filter on falsy.
  const storagePaths = [
    ...(recipe.thumbnail ? [recipe.thumbnail] : []),
    ...(sourceImages ?? []).map((row) => row.storage_path),
  ];

  // Remove files before the row: the storage delete policy proves ownership by
  // joining back to `recipes`, so it stops authorizing these objects the moment
  // the recipe is gone. Failing this way leaves a recipe with a missing image,
  // which a retry fixes; the reverse leaves files no one can ever delete.
  if (storagePaths.length) {
    const { error: storageError } = await supabase.storage
      .from("recipes")
      .remove(storagePaths);
    if (storageError) {
      return { ok: false as const, error: storageError.message };
    }
  }

  const { error } = await supabase.from("recipes").delete().eq("id", recipeId);
  if (error) {
    return { ok: false as const, error: error.message };
  }

  revalidatePath("/cookbooks");
  revalidatePath("/cookbooks/[id]", "page");

  return { ok: true as const };
}

export async function removeRecipeFromCookbook(recipeId: number, cookbookId: number) {
  if (
    !Number.isInteger(recipeId) ||
    recipeId <= 0 ||
    !Number.isInteger(cookbookId) ||
    cookbookId <= 0
  ) {
    return { ok: false as const, error: "Invalid id" };
  }

  const supabase = await createClient();
  const { data: claimsData, error: authError } = await supabase.auth.getClaims();
  if (authError || !claimsData?.claims) {
    return { ok: false as const, error: "Not authenticated" };
  }
  const userId = claimsData.claims.sub;

  const { data: cookbook } = await supabase
    .from("cookbooks")
    .select("id")
    .eq("id", cookbookId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!cookbook) {
    return { ok: false as const, error: "Cookbook not found" };
  }

  const { error: mappingError } = await supabase
    .from("recipes_mapping")
    .delete()
    .eq("recipe_id", recipeId)
    .eq("cookbook_id", cookbookId);
  if (mappingError) {
    return { ok: false as const, error: mappingError.message };
  }

  revalidatePath(`/recipes/${recipeId}`);
  revalidatePath("/cookbooks");
  revalidatePath("/cookbooks/[id]", "page");

  return { ok: true as const };
}
