import { createClient } from "@/lib/supabase/server";
import {
  FollowingCookbookGrid,
  type FollowingCookbookItem,
} from "@/components/cookbooks/following-cookbook-grid";
import { FollowingUsersRow, type FollowingUserItem } from "@/components/cookbooks/following-users-row";

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

type FollowingUserRpcRow = {
  id: string;
  display_name: string;
  profile_pic_url: string | null;
};

export async function FollowingCookbooksContent() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData!.claims.sub;

  const { data: followRows } = await supabase
    .from("followers")
    .select("follows_user_id, follows_cookbook_id, follow_type")
    .eq("user_id", userId);

  const cookbookFollows = (followRows ?? []).filter((row) => row.follow_type === "cookbook");
  const specificFollows = cookbookFollows.filter((row) => row.follows_cookbook_id !== null);
  const specificCookbookIds = specificFollows.map((row) => row.follows_cookbook_id as number);
  const ownerByCookbookId = new Map(
    specificFollows.map((row) => [row.follows_cookbook_id as number, row.follows_user_id]),
  );
  const allRecipesOwnerIds = Array.from(
    new Set(
      cookbookFollows
        .filter((row) => row.follows_cookbook_id === null)
        .map((row) => row.follows_user_id),
    ),
  );
  const ownerIds = Array.from(new Set(cookbookFollows.map((row) => row.follows_user_id)));

  const allRecipesQueries = allRecipesOwnerIds.map(async (ownerId) => {
    const [{ data: recentRows, count }, { data: chosenThumb }] = await Promise.all([
      supabase
        .from("recipes")
        .select("thumbnail, created_at", { count: "exact" })
        .eq("user_id", ownerId)
        .order("created_at", { ascending: false })
        .limit(1),
      supabase
        .from("cookbook_thumbnail_mapping")
        .select("recipes(thumbnail)")
        .is("cookbook_id", null)
        .eq("user_id", ownerId)
        .eq('"order"' as "order", 0)
        .maybeSingle(),
    ]);
    return {
      ownerId,
      count: count ?? 0,
      latestCreatedAt: recentRows?.[0]?.created_at ?? null,
      imageUrl: recipeThumbnailUrl(chosenThumb?.recipes?.thumbnail ?? recentRows?.[0]?.thumbnail),
    };
  });

  const [
    { data: cookbookRows },
    { data: latestMappings },
    { data: chosenThumbnails },
    { data: ownerRows },
    { data: followingUsersRaw },
    allRecipesResults,
  ] = await Promise.all([
    specificCookbookIds.length > 0
      ? supabase
          .from("cookbooks")
          .select("id, title, recipes_mapping(count)")
          .in("id", specificCookbookIds)
      : Promise.resolve({ data: [] as { id: number; title: string; recipes_mapping: { count: number }[] }[] }),
    specificCookbookIds.length > 0
      ? supabase
          .from("recipes_mapping")
          .select("cookbook_id, created_at, recipes(thumbnail)")
          .in("cookbook_id", specificCookbookIds)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as { cookbook_id: number; created_at: string; recipes: { thumbnail: string | null } | null }[] }),
    specificCookbookIds.length > 0
      ? supabase
          .from("cookbook_thumbnail_mapping")
          .select("cookbook_id, recipes(thumbnail)")
          .eq('"order"' as "order", 0)
          .in("cookbook_id", specificCookbookIds)
      : Promise.resolve({ data: [] as { cookbook_id: number | null; recipes: { thumbnail: string | null } | null }[] }),
    ownerIds.length > 0
      ? supabase.from("users").select("id, display_name, profile_pic_url").in("id", ownerIds)
      : Promise.resolve({ data: [] as { id: string; display_name: string; profile_pic_url: string | null }[] }),
    supabase.rpc("Users_ReadAllFollowing", { p_user_id: userId }),
    Promise.all(allRecipesQueries),
  ]);

  const latestThumbnailByCookbook = new Map<number, string | null>();
  const latestUpdateByCookbook = new Map<number, string>();
  for (const mapping of latestMappings ?? []) {
    if (!latestThumbnailByCookbook.has(mapping.cookbook_id)) {
      latestThumbnailByCookbook.set(mapping.cookbook_id, mapping.recipes?.thumbnail ?? null);
      latestUpdateByCookbook.set(mapping.cookbook_id, mapping.created_at);
    }
  }

  const chosenThumbnailByCookbook = new Map<number, string | null>();
  for (const mapping of chosenThumbnails ?? []) {
    if (mapping.cookbook_id !== null) {
      chosenThumbnailByCookbook.set(mapping.cookbook_id, mapping.recipes?.thumbnail ?? null);
    }
  }

  const ownerById = new Map((ownerRows ?? []).map((owner) => [owner.id, owner]));

  const specificItems: FollowingCookbookItem[] = (cookbookRows ?? []).map((row) => {
    const ownerId = ownerByCookbookId.get(row.id) ?? "";
    const owner = ownerById.get(ownerId);
    return {
      key: `${ownerId}:${row.id}`,
      href: `/cookbooks/${row.id}?owner=${ownerId}`,
      title: row.title,
      count: row.recipes_mapping?.[0]?.count ?? 0,
      updatedLabel: relativeUpdateLabel(latestUpdateByCookbook.get(row.id) ?? null),
      imageUrl: recipeThumbnailUrl(
        chosenThumbnailByCookbook.get(row.id) ?? latestThumbnailByCookbook.get(row.id),
      ),
      ownerId,
      ownerName: owner?.display_name ?? "Unknown",
      ownerAvatarUrl: owner?.profile_pic_url ?? null,
    };
  });

  const allRecipesItems: FollowingCookbookItem[] = allRecipesResults.map((result) => {
    const owner = ownerById.get(result.ownerId);
    return {
      key: `${result.ownerId}:all`,
      href: `/cookbooks/all?owner=${result.ownerId}`,
      title: "All Recipes",
      count: result.count,
      updatedLabel: relativeUpdateLabel(result.latestCreatedAt),
      imageUrl: result.imageUrl,
      ownerId: result.ownerId,
      ownerName: owner?.display_name ?? "Unknown",
      ownerAvatarUrl: owner?.profile_pic_url ?? null,
    };
  });

  const cookbooks = [...specificItems, ...allRecipesItems];

  const followingUsers: FollowingUserItem[] = ((followingUsersRaw as FollowingUserRpcRow[] | null) ?? []).map(
    (user) => ({
      id: user.id,
      displayName: user.display_name,
      avatarUrl: user.profile_pic_url,
    }),
  );

  return (
    <div className="space-y-8">
      <section>
        <h2 className="font-literata text-2xl font-semibold text-kitch-charcoal">Users</h2>
        <div className="mt-4">
          <FollowingUsersRow users={followingUsers} />
        </div>
      </section>
      <section>
        <h2 className="font-literata text-2xl font-semibold text-kitch-charcoal">Cookbooks</h2>
        <div className="mt-4">
          <FollowingCookbookGrid cookbooks={cookbooks} />
        </div>
      </section>
    </div>
  );
}
