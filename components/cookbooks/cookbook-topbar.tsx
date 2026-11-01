import { Plus } from "lucide-react";

import { NewRecipeDialog } from "@/components/recipes/new-recipe-dialog";
import { getImportUsage } from "@/lib/subscription/entitlement";

/** The topbar's New Recipe button, which sits in its far right corner. */
export async function NewRecipeButton() {
  // Read here rather than inside the dialog so the meter is correct the moment
  // it opens, with no loading flash.
  const usage = await getImportUsage();

  return (
    <NewRecipeDialog
      quota={{
        isPremium: usage.isPremium,
        used: usage.used,
        limit: usage.limit,
        exhausted: usage.exhausted,
      }}
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
  );
}
