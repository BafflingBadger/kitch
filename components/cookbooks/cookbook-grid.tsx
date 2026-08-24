import { CookbookCard } from "@/components/cookbooks/cookbook-card";

export interface CookbookGridItem {
  id: number;
  title: string;
  count: number;
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
}: {
  allRecipes: AllRecipesSummary;
  cookbooks: CookbookGridItem[];
}) {
  return (
    <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
      <CookbookCard
        variant="hero"
        title="All Recipes"
        subtitle={`${allRecipes.count} Recipes • ${allRecipes.updatedLabel}`}
        imageUrl={allRecipes.imageUrl}
        href="/cookbooks/all"
      />
      {cookbooks.map((cookbook) => (
        <CookbookCard
          key={cookbook.id}
          variant="standard"
          title={cookbook.title}
          count={cookbook.count}
          imageUrl={cookbook.imageUrl}
          href={`/cookbooks/${cookbook.id}`}
        />
      ))}
      <CookbookCard variant="create" href="/cookbooks/new" />
    </div>
  );
}
