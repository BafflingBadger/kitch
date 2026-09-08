import { Bell, Plus } from "lucide-react";

import { NewRecipeDialog } from "@/components/recipes/new-recipe-dialog";
import { RecipeSearch } from "@/components/cookbooks/recipe-search";

export function CookbookTopbar() {
  return (
    <div className="flex items-center justify-between gap-4">
      <RecipeSearch />
      <div className="flex shrink-0 items-center gap-4">
        <button
          type="button"
          className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-kitch-charcoal/70 hover:bg-kitch-cream-dark"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-kitch-red" />
        </button>
        <NewRecipeDialog
          trigger={
            <button
              type="button"
              className="flex shrink-0 items-center gap-1.5 rounded-full bg-gradient-to-r from-kitch-orange-from to-kitch-orange-to px-4 py-2.5 text-sm font-semibold text-white shadow-sm"
            >
              <Plus className="h-4 w-4" />
              New Recipe
            </button>
          }
        />
      </div>
    </div>
  );
}
