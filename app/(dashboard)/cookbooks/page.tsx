import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";
import { CookbookGrid } from "@/components/cookbooks/cookbook-grid";
import { CookbookToggle } from "@/components/cookbooks/cookbook-toggle";

function timeOfDayGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 18) return "Good Afternoon";
  return "Good Evening";
}

function relativeUpdateLabel(dateString: string | null) {
  if (!dateString) return "No recipes yet";
  const diffDays = Math.floor(
    (Date.now() - new Date(dateString).getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diffDays <= 0) return "Updated today";
  if (diffDays === 1) return "Updated yesterday";
  return `Updated ${diffDays} days ago`;
}

function recipeThumbnailUrl(path: string | null | undefined) {
  if (!path) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/recipes/${path}`;
}

async function CookbooksContent() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData!.claims.sub;
  const email = claimsData!.claims.email as string | undefined;

  const { data: profile } = await supabase
    .from("users")
    .select("display_name")
    .eq("id", userId)
    .maybeSingle();

  const firstName = (
    profile?.display_name ??
    email?.split("@")[0] ??
    "there"
  ).split(" ")[0];

  const [
    { data: cookbookRows },
    { data: latestMappings },
    { data: recentRecipes, count: recipeCount },
  ] = await Promise.all([
    supabase
      .from("cookbooks")
      .select("id, title, recipes_mapping(count)")
      .eq("user_id", userId)
      .order("sort_order"),
    supabase
      .from("recipes_mapping")
      .select("cookbook_id, created_at, recipes(thumbnail), cookbooks!inner(user_id)")
      .eq("cookbooks.user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("recipes")
      .select("id, created_at", { count: "exact" })
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1),
  ]);

  const latestThumbnailByCookbook = new Map<number, string | null>();
  for (const mapping of latestMappings ?? []) {
    if (!latestThumbnailByCookbook.has(mapping.cookbook_id)) {
      latestThumbnailByCookbook.set(
        mapping.cookbook_id,
        mapping.recipes?.thumbnail ?? null,
      );
    }
  }

  const cookbooks = (cookbookRows ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    count: row.recipes_mapping?.[0]?.count ?? 0,
    imageUrl: recipeThumbnailUrl(latestThumbnailByCookbook.get(row.id)),
  }));

  const allRecipes = {
    count: recipeCount ?? 0,
    imageUrl: "/images/all-recipes-cover.jpg",
    updatedLabel: relativeUpdateLabel(recentRecipes?.[0]?.created_at ?? null),
  };

  return (
    <CookbookToggle
      greeting={`${timeOfDayGreeting()}, ${firstName}`}
      subtext="Ready to create something delicious tonight?"
    >
      <CookbookGrid allRecipes={allRecipes} cookbooks={cookbooks} />
    </CookbookToggle>
  );
}

export default function CookbooksPage() {
  return (
    <Suspense fallback={<div className="text-sm text-kitch-grey">Loading…</div>}>
      <CookbooksContent />
    </Suspense>
  );
}
