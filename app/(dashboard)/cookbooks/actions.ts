"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

function recipeThumbnailUrl(path: string | null | undefined) {
  if (!path) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/recipes/${path}`;
}

type CookbookRecipeOption = {
  id: number;
  name: string;
  imageUrl: string | null;
  source: string | null;
  rating: number;
  createdAt: number;
};

export async function getCookbookForEdit(cookbookId: number) {
  if (!Number.isInteger(cookbookId) || cookbookId <= 0) {
    return { ok: false as const, error: "Invalid cookbook id" };
  }

  const supabase = await createClient();
  const { data: claimsData, error: authError } = await supabase.auth.getClaims();
  if (authError || !claimsData?.claims) {
    return { ok: false as const, error: "Not authenticated" };
  }
  const userId = claimsData.claims.sub;

  const { data: cookbook } = await supabase
    .from("cookbooks")
    .select("id, title")
    .eq("id", cookbookId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!cookbook) {
    return { ok: false as const, error: "Cookbook not found" };
  }

  const [{ data: mappingRows }, { data: thumbnailRows }] = await Promise.all([
    supabase
      .from("recipes_mapping")
      .select("recipes(id, name, thumbnail, source_text, rating, created_at)")
      .eq("cookbook_id", cookbookId)
      .order("created_at", { ascending: false }),
    supabase
      .from("cookbook_thumbnail_mapping")
      .select("recipe_id")
      .eq("cookbook_id", cookbookId)
      // "order" is quoted because it collides with PostgREST's reserved ?order= sort param.
      .eq('"order"' as "order", 0)
      .maybeSingle(),
  ]);

  const recipes: CookbookRecipeOption[] = (mappingRows ?? [])
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

  return {
    ok: true as const,
    title: cookbook.title,
    recipes,
    thumbnailRecipeId: thumbnailRows?.recipe_id ?? null,
  };
}

export async function createCookbookWithDetails(input: {
  title: string;
  recipeIds: number[];
  thumbnailRecipeId: number | null;
}) {
  const trimmedTitle = input.title.trim();
  if (!trimmedTitle) {
    return { ok: false as const, error: "Cookbook name is required" };
  }

  const supabase = await createClient();
  const { data: claimsData, error: authError } = await supabase.auth.getClaims();
  if (authError || !claimsData?.claims) {
    return { ok: false as const, error: "Not authenticated" };
  }
  const userId = claimsData.claims.sub;

  const { data: cookbook, error: insertError } = await supabase
    .from("cookbooks")
    .insert({ title: trimmedTitle, user_id: userId })
    .select("id")
    .single();
  if (insertError || !cookbook) {
    return { ok: false as const, error: insertError?.message ?? "Failed to create cookbook" };
  }

  const { data: ownedRecipes } = await supabase
    .from("recipes")
    .select("id")
    .eq("user_id", userId)
    .in("id", input.recipeIds);
  const ownedIds = new Set((ownedRecipes ?? []).map((r) => r.id));
  const targetIds = input.recipeIds.filter((id) => ownedIds.has(id));

  if (targetIds.length > 0) {
    const { error } = await supabase
      .from("recipes_mapping")
      .insert(targetIds.map((recipe_id) => ({ recipe_id, cookbook_id: cookbook.id })));
    if (error) {
      return { ok: false as const, error: error.message };
    }
  }

  if (input.thumbnailRecipeId !== null && targetIds.includes(input.thumbnailRecipeId)) {
    const { error } = await supabase.from("cookbook_thumbnail_mapping").insert({
      cookbook_id: cookbook.id,
      recipe_id: input.thumbnailRecipeId,
      order: 0,
      user_id: userId,
    });
    if (error) {
      return { ok: false as const, error: error.message };
    }
  }

  revalidatePath("/cookbooks");

  return { ok: true as const, cookbookId: cookbook.id };
}

export async function updateCookbookDetails(input: {
  cookbookId: number;
  title: string;
  recipeIds: number[];
  thumbnailRecipeId: number | null;
}) {
  if (!Number.isInteger(input.cookbookId) || input.cookbookId <= 0) {
    return { ok: false as const, error: "Invalid cookbook id" };
  }
  const trimmedTitle = input.title.trim();
  if (!trimmedTitle) {
    return { ok: false as const, error: "Cookbook name is required" };
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
    .eq("id", input.cookbookId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!cookbook) {
    return { ok: false as const, error: "Cookbook not found" };
  }

  const { error: titleError } = await supabase
    .from("cookbooks")
    .update({ title: trimmedTitle })
    .eq("id", input.cookbookId);
  if (titleError) {
    return { ok: false as const, error: titleError.message };
  }

  const { data: ownedRecipes } = await supabase
    .from("recipes")
    .select("id")
    .eq("user_id", userId)
    .in("id", input.recipeIds);
  const ownedIds = new Set((ownedRecipes ?? []).map((r) => r.id));
  const targetIds = input.recipeIds.filter((id) => ownedIds.has(id));

  const { data: existingMappings } = await supabase
    .from("recipes_mapping")
    .select("recipe_id")
    .eq("cookbook_id", input.cookbookId);
  const existingIds = new Set((existingMappings ?? []).map((m) => m.recipe_id));

  const toAdd = targetIds.filter((id) => !existingIds.has(id));
  const toRemove = [...existingIds].filter((id) => !targetIds.includes(id));

  if (toAdd.length > 0) {
    const { error } = await supabase
      .from("recipes_mapping")
      .insert(toAdd.map((recipe_id) => ({ recipe_id, cookbook_id: input.cookbookId })));
    if (error) {
      return { ok: false as const, error: error.message };
    }
  }

  if (toRemove.length > 0) {
    const { error } = await supabase
      .from("recipes_mapping")
      .delete()
      .eq("cookbook_id", input.cookbookId)
      .in("recipe_id", toRemove);
    if (error) {
      return { ok: false as const, error: error.message };
    }
  }

  const { error: deleteThumbnailError } = await supabase
    .from("cookbook_thumbnail_mapping")
    .delete()
    .eq("cookbook_id", input.cookbookId)
    // "order" is quoted because it collides with PostgREST's reserved ?order= sort param.
    .eq('"order"' as "order", 0);
  if (deleteThumbnailError) {
    return { ok: false as const, error: deleteThumbnailError.message };
  }

  if (input.thumbnailRecipeId !== null && targetIds.includes(input.thumbnailRecipeId)) {
    const { error } = await supabase.from("cookbook_thumbnail_mapping").insert({
      cookbook_id: input.cookbookId,
      recipe_id: input.thumbnailRecipeId,
      order: 0,
      user_id: userId,
    });
    if (error) {
      return { ok: false as const, error: error.message };
    }
  }

  revalidatePath("/cookbooks");
  revalidatePath("/cookbooks/[id]", "page");

  return { ok: true as const };
}

export async function deleteCookbook(cookbookId: number) {
  if (!Number.isInteger(cookbookId) || cookbookId <= 0) {
    return { ok: false as const, error: "Invalid cookbook id" };
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

  const { error } = await supabase.from("cookbooks").delete().eq("id", cookbookId);
  if (error) {
    return { ok: false as const, error: error.message };
  }

  revalidatePath("/cookbooks");

  return { ok: true as const };
}
