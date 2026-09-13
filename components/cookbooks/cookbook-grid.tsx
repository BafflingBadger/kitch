import { Plus } from "lucide-react";

import { CookbookCard } from "@/components/cookbooks/cookbook-card";
import { EditCookbookDialog } from "@/components/cookbooks/edit-cookbook-dialog";

export interface CookbookGridItem {
  id: number;
  title: string;
  count: number;
  updatedLabel: string;
  imageUrl: string | null;
}

export interface AllRecipesSummary {
  count: number;
  imageUrl: string | null;
  updatedLabel: string;
}

export function CookbookGrid({
  allRecipes,
  cookbooks,
  ownerId,
  ownerName,
}: {
  allRecipes: AllRecipesSummary;
  cookbooks: CookbookGridItem[];
  ownerId?: string;
  ownerName?: string;
}) {
  const readOnly = Boolean(ownerId);

  const ownerHref = (cookbookPath: string) => {
    if (!ownerId) return cookbookPath;
    const params = new URLSearchParams({ owner: ownerId });
    params.set("backHref", `/users/${ownerId}`);
    if (ownerName) params.set("backLabel", ownerName);
    return `${cookbookPath}?${params.toString()}`;
  };

  return (
    <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
      <CookbookCard
        variant="hero"
        title="All Recipes"
        subtitle={`${allRecipes.count} Recipes • ${allRecipes.updatedLabel}`}
        imageUrl={allRecipes.imageUrl}
        href={ownerHref("/cookbooks/all")}
      />
      {cookbooks.map((cookbook) => (
        <CookbookCard
          key={cookbook.id}
          variant="standard"
          id={cookbook.id}
          title={cookbook.title}
          count={cookbook.count}
          updatedLabel={cookbook.updatedLabel}
          imageUrl={cookbook.imageUrl}
          href={ownerHref(`/cookbooks/${cookbook.id}`)}
          readOnly={readOnly}
        />
      ))}
      {ownerId ? null : (
        <EditCookbookDialog
          trigger={
            <button
              type="button"
              className="group flex h-[366px] flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-kitch-grey/30 text-center transition-colors hover:border-kitch-grey/50 hover:bg-kitch-cream-dark"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-kitch-cream-dark text-kitch-charcoal transition-colors group-hover:bg-kitch-cream">
                <Plus className="h-5 w-5" />
              </span>
              <div>
                <p className="font-literata text-lg font-semibold text-kitch-charcoal">
                  New Cookbook
                </p>
                <p className="mt-1 text-sm text-kitch-grey">Create a new collection</p>
              </div>
            </button>
          }
        />
      )}
    </div>
  );
}
