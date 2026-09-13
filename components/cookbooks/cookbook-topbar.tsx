import { Plus } from "lucide-react";

import { NewRecipeDialog } from "@/components/recipes/new-recipe-dialog";
import { DashboardSearch } from "@/components/cookbooks/dashboard-search";

export function CookbookTopbar() {
  return (
    <div className="flex items-center justify-between gap-4">
      <DashboardSearch />
      <div className="flex shrink-0 items-center gap-4">
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
