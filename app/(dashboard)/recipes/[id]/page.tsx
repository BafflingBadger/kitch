import { Suspense } from "react";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { CoverImage } from "@/components/cookbooks/cover-image";
import { RecipeHeader } from "@/components/recipes/recipe-header";
import { StarRating } from "@/components/recipes/star-rating";
import { RecipeActionButtons } from "@/components/recipes/recipe-action-buttons";
import { RecipeIngredients } from "@/components/recipes/recipe-ingredients";
import { RecipeDirections } from "@/components/recipes/recipe-directions";
import { RecipeNotes } from "@/components/recipes/recipe-notes";

function recipeThumbnailUrl(path: string | null | undefined) {
  if (!path) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/recipes/${path}`;
}

async function RecipeDetailContent({
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
    .select("id, name, thumbnail, notes, rating, source_text, created_at")
    .eq("id", numericId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!recipe) notFound();

  const [{ data: ingredientRows }, { data: directionRows }] = await Promise.all([
    supabase
      .from("ingredients")
      .select("id, desc, order, is_heading, measurement, keyword")
      .eq("recipe_id", numericId)
      .order("order", { ascending: true }),
    supabase
      .from("directions")
      .select("id, desc, order, is_heading")
      .eq("recipe_id", numericId)
      .order("order", { ascending: true }),
  ]);

  const imageUrl = recipeThumbnailUrl(recipe.thumbnail);

  return (
    <div>
      <RecipeHeader
        backHref={backHref ?? "/cookbooks"}
        backLabel={backLabel ?? "Cookbooks"}
      />

      <div className="mx-auto mt-6 grid max-w-6xl grid-cols-1 gap-6 lg:grid-cols-12 lg:items-center lg:gap-10">
        <div className="aspect-[16/9] w-full overflow-hidden rounded-3xl lg:col-span-6 lg:aspect-[4/3]">
          <CoverImage imageUrl={imageUrl} alt={recipe.name} />
        </div>

        <div className="flex flex-col lg:col-span-6">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-kitch-orange-to">
            Recipe
          </span>
          <h1 className="mt-2 font-literata text-3xl font-semibold leading-tight text-kitch-charcoal md:text-4xl">
            {recipe.name}
          </h1>
          <div className="mt-3">
            <StarRating recipeId={recipe.id} initialRating={recipe.rating ?? 0} />
          </div>
          <div className="mt-5">
            <RecipeActionButtons recipeId={recipe.id} />
          </div>
        </div>
      </div>

      <div className="mx-auto mt-8 h-px w-full max-w-6xl bg-kitch-charcoal/10" />

      <div className="mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-10 lg:grid-cols-12 lg:items-start lg:gap-14">
        <div className="lg:sticky lg:top-8 lg:col-span-4 lg:flex lg:flex-col lg:gap-6">
          <RecipeIngredients items={ingredientRows ?? []} />
          <RecipeNotes notes={recipe.notes} />
        </div>
        <div className="lg:col-span-8">
          <RecipeDirections items={directionRows ?? []} />
        </div>
      </div>
    </div>
  );
}

export default function RecipeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ backHref?: string; backLabel?: string }>;
}) {
  return (
    <Suspense fallback={<div className="text-sm text-kitch-grey">Loading…</div>}>
      <RecipeDetailContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}
