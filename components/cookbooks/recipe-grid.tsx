import { RecipeCard } from "@/components/cookbooks/recipe-card";

export interface RecipeGridItem {
  id: number;
  title: string;
  imageUrl: string | null;
  source: string | null;
  rating: number;
  createdAt: number;
}

export function RecipeGrid({ recipes }: { recipes: RecipeGridItem[] }) {
  if (recipes.length === 0) {
    return (
      <p className="text-sm text-kitch-grey">No recipes in this cookbook yet.</p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
      {recipes.map((recipe) => (
        <RecipeCard
          key={recipe.id}
          id={recipe.id}
          title={recipe.title}
          imageUrl={recipe.imageUrl}
          source={recipe.source}
          rating={recipe.rating}
        />
      ))}
    </div>
  );
}
