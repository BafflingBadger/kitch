import { Suspense } from "react";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { CookbookGrid } from "@/components/cookbooks/cookbook-grid";
import { FollowUserButton } from "@/components/cookbooks/follow-user-button";
import { Avatar } from "@/components/ui/avatar";

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

async function ProfileContent({ params }: { params: Promise<{ id: string }> }) {
  const { id: profileUserId } = await params;

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const viewerId = claimsData?.claims.sub;
  const isOwnProfile = viewerId === profileUserId;

  const { data: profile } = await supabase
    .from("users")
    .select("display_name, profile_pic_url")
    .eq("id", profileUserId)
    .maybeSingle();

  if (!profile) notFound();

  const [
    { data: cookbookRows },
    { data: latestMappings },
    { data: chosenThumbnails },
    { data: recentRecipes, count: recipeCount },
    { data: followRow },
  ] = await Promise.all([
    supabase
      .from("cookbooks")
      .select("id, title, recipes_mapping(count)")
      .eq("user_id", profileUserId)
      .order("sort_order"),
    supabase
      .from("recipes_mapping")
      .select("cookbook_id, created_at, recipes(thumbnail), cookbooks!inner(user_id)")
      .eq("cookbooks.user_id", profileUserId)
      .order("created_at", { ascending: false }),
    supabase
      .from("cookbook_thumbnail_mapping")
      .select("cookbook_id, recipes(thumbnail), cookbooks!inner(user_id)")
      // "order" is quoted because it collides with PostgREST's reserved ?order= sort param.
      .eq('"order"' as "order", 0)
      .eq("cookbooks.user_id", profileUserId),
    supabase
      .from("recipes")
      .select("id, created_at", { count: "exact" })
      .eq("user_id", profileUserId)
      .order("created_at", { ascending: false })
      .limit(1),
    isOwnProfile || !viewerId
      ? Promise.resolve({ data: null })
      : supabase
          .from("followers")
          .select("id")
          .eq("user_id", viewerId)
          .eq("follows_user_id", profileUserId)
          .eq("follow_type", "user")
          .maybeSingle(),
  ]);
  const isFollowing = !!followRow;

  const latestThumbnailByCookbook = new Map<number, string | null>();
  const latestUpdateByCookbook = new Map<number, string>();
  for (const mapping of latestMappings ?? []) {
    if (!latestThumbnailByCookbook.has(mapping.cookbook_id)) {
      latestThumbnailByCookbook.set(
        mapping.cookbook_id,
        mapping.recipes?.thumbnail ?? null,
      );
      latestUpdateByCookbook.set(mapping.cookbook_id, mapping.created_at);
    }
  }

  const chosenThumbnailByCookbook = new Map<number, string | null>();
  for (const mapping of chosenThumbnails ?? []) {
    if (mapping.cookbook_id !== null) {
      chosenThumbnailByCookbook.set(mapping.cookbook_id, mapping.recipes?.thumbnail ?? null);
    }
  }

  const cookbooks = (cookbookRows ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    count: row.recipes_mapping?.[0]?.count ?? 0,
    updatedLabel: relativeUpdateLabel(latestUpdateByCookbook.get(row.id) ?? null),
    imageUrl: recipeThumbnailUrl(
      chosenThumbnailByCookbook.get(row.id) ?? latestThumbnailByCookbook.get(row.id),
    ),
  }));

  const allRecipes = {
    count: recipeCount ?? 0,
    imageUrl: "/images/all-recipes-cover.jpg",
    updatedLabel: relativeUpdateLabel(recentRecipes?.[0]?.created_at ?? null),
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar
            displayName={profile.display_name}
            avatarUrl={profile.profile_pic_url}
            sizeClassName="h-16 w-16"
          />
          <h1 className="font-literata text-3xl font-semibold text-kitch-charcoal">
            {profile.display_name}
          </h1>
        </div>
        {isOwnProfile ? null : (
          <FollowUserButton userId={profileUserId} initialIsFollowing={isFollowing} />
        )}
      </div>

      <div className="mt-8">
        <CookbookGrid
          allRecipes={allRecipes}
          cookbooks={cookbooks}
          ownerId={profileUserId}
          ownerName={profile.display_name}
        />
      </div>
    </div>
  );
}

export default function ProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<div className="text-sm text-kitch-grey">Loading…</div>}>
      <ProfileContent params={params} />
    </Suspense>
  );
}
