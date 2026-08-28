import { Suspense } from "react";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { EditRecipeForm } from "@/components/recipes/edit/edit-recipe-form";

async function EditRecipeContent({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ backHref?: string; backLabel?: string }>;
}) {
  const { id } = await params;
  const { backHref, backLabel } = await searchParams;

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData!.claims.sub;

  const numericId = Number(id);
  if (!Number.isInteger(numericId)) notFound();

  const { data: recipe } = await supabase
    .from("recipes")
    .select("id, name, thumbnail, notes, rating")
    .eq("id", numericId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!recipe) notFound();

  const [{ data: ingredientRows }, { data: directionRows }] = await Promise.all([
    supabase
      .from("ingredients")
      .select("id, desc, order, is_heading")
      .eq("recipe_id", numericId)
      .order("order", { ascending: true }),
    supabase
      .from("directions")
      .select("id, desc, order, is_heading")
      .eq("recipe_id", numericId)
      .order("order", { ascending: true }),
  ]);

  return (
    <EditRecipeForm
      recipeId={recipe.id}
      initialName={recipe.name}
      initialRating={recipe.rating ?? 0}
      initialNotes={recipe.notes}
      initialThumbnail={recipe.thumbnail}
      initialIngredients={(ingredientRows ?? []).map((row) => ({
        key: String(row.id),
        id: row.id,
        desc: row.desc,
        is_heading: row.is_heading ?? false,
      }))}
      initialDirections={(directionRows ?? []).map((row) => ({
        key: String(row.id),
        id: row.id,
        desc: row.desc,
        is_heading: row.is_heading ?? false,
      }))}
      backHref={backHref ?? "/cookbooks"}
      backLabel={backLabel ?? "Cookbooks"}
    />
  );
}

export default function EditRecipePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ backHref?: string; backLabel?: string }>;
}) {
  return (
    <Suspense fallback={<div className="text-sm text-kitch-grey">Loading…</div>}>
      <EditRecipeContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}
