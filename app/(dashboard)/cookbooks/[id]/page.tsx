import { Suspense } from "react";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { RecipeSortToggle } from "@/components/cookbooks/recipe-sort-toggle";
import type { RecipeGridItem } from "@/components/cookbooks/recipe-grid";

function recipeThumbnailUrl(path: string | null | undefined) {
  if (!path) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/recipes/${path}`;
}

type RecipeRow = {
  id: number;
  name: string;
  thumbnail: string | null;
  source_text: string;
  rating: number | null;
  created_at: string;
};

async function CookbookDetailContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: cookbookId } = await params;

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData!.claims.sub;

  let title = "All Recipes";
  let recipeRows: RecipeRow[] = [];

  if (cookbookId === "all") {
    const { data } = await supabase
      .from("recipes")
      .select("id, name, thumbnail, source_text, rating, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    recipeRows = data ?? [];
  } else {
    const numericId = Number(cookbookId);
    if (!Number.isInteger(numericId)) notFound();

    const { data: cookbook } = await supabase
      .from("cookbooks")
      .select("title")
      .eq("id", numericId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!cookbook) notFound();
    title = cookbook.title;

    const { data } = await supabase
      .from("recipes_mapping")
      .select("recipes(id, name, thumbnail, source_text, rating, created_at)")
      .eq("cookbook_id", numericId)
      .order("created_at", { ascending: false });

    recipeRows = (data ?? [])
      .map((row) => row.recipes)
      .filter((recipe): recipe is RecipeRow => recipe !== null);
  }

  const recipes: RecipeGridItem[] = recipeRows.map((recipe) => ({
    id: recipe.id,
    title: recipe.name,
    imageUrl: recipeThumbnailUrl(recipe.thumbnail),
    source: recipe.source_text,
    rating: recipe.rating ?? 0,
    createdAt: new Date(recipe.created_at).getTime(),
  }));

  return <RecipeSortToggle title={title} recipes={recipes} />;
}

export default function CookbookDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<div className="text-sm text-kitch-grey">Loading…</div>}>
      <CookbookDetailContent params={params} />
    </Suspense>
  );
}
