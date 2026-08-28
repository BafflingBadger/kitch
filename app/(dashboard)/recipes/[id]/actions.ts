"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

function recipeThumbnailUrl(path: string | null | undefined) {
  if (!path) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/recipes/${path}`;
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
    ingredients: { desc: string; is_heading: boolean }[];
    directions: { desc: string; is_heading: boolean }[];
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

  const { error: updateError } = await supabase
    .from("recipes")
    .update({
      name: trimmedName,
      rating: input.rating,
      notes: input.notes?.trim() || null,
      thumbnail: input.thumbnail,
    })
    .eq("id", recipeId)
    .eq("user_id", userId);
  if (updateError) {
    return { ok: false as const, error: updateError.message };
  }

  const ingredientRows = input.ingredients
    .filter((row) => row.desc.trim() !== "")
    .map((row, index) => ({
      recipe_id: recipeId,
      desc: row.desc.trim(),
      order: index,
      is_heading: row.is_heading,
    }));
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
