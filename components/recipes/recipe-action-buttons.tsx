"use client";

import { useState } from "react";
import { BookOpen, Calendar, Check, Share2, ShoppingCart } from "lucide-react";

import { ManageCookbooksDialog } from "@/components/recipes/manage-cookbooks-dialog";
import { AddMealDialog } from "@/components/meal-plan/add-meal-dialog";
import { GroceryListDialog } from "@/components/recipes/grocery-list-dialog";
import type { RecipeIngredientItem } from "@/components/recipes/recipe-ingredients";
import { cn } from "@/lib/utils";

// Four across, each a round icon with its label underneath. Between sm and lg,
// where the recipe is one wide column, a row of icon-and-label buttons split by
// dividers instead; from lg the details column is too narrow for that row.
const buttonClassName =
  "group flex flex-1 flex-col items-center justify-center gap-1.5 px-1 py-1 text-xs font-medium text-kitch-grey transition-colors hover:text-kitch-charcoal sm:max-lg:flex-row sm:max-lg:gap-2 sm:max-lg:px-3 sm:max-lg:py-2 sm:max-lg:text-sm";

function ActionIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex h-11 w-11 items-center justify-center rounded-full border border-kitch-charcoal/10 bg-white text-kitch-charcoal shadow-[0_1px_2px_rgba(0,0,0,0.04)] sm:max-lg:h-auto sm:max-lg:w-auto sm:max-lg:border-0 sm:max-lg:bg-transparent sm:max-lg:text-current sm:max-lg:shadow-none">
      {children}
    </span>
  );
}

export function RecipeActionButtons({
  recipeId,
  recipeName,
  imageUrl,
  ingredients,
}: {
  recipeId: number;
  recipeName: string;
  imageUrl: string | null;
  ingredients: RecipeIngredientItem[];
}) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/recipes/${recipeId}`,
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be denied by the browser (permissions, insecure context); no-op.
    }
  };

  return (
    <div className="grid grid-cols-4 divide-kitch-charcoal/10 sm:max-lg:divide-x">
      <ManageCookbooksDialog
        recipeId={recipeId}
        trigger={
          <button type="button" className={buttonClassName}>
            <ActionIcon><BookOpen className="h-4 w-4" /></ActionIcon>
            Cookbooks
          </button>
        }
      />
      <AddMealDialog
        recipe={{ id: recipeId, name: recipeName, imageUrl }}
        trigger={
          <button type="button" className={buttonClassName}>
            <ActionIcon><Calendar className="h-4 w-4" /></ActionIcon>
            Meal Plan
          </button>
        }
      />
      <GroceryListDialog
        recipeName={recipeName}
        ingredients={ingredients}
        trigger={
          <button type="button" className={buttonClassName}>
            <ActionIcon><ShoppingCart className="h-4 w-4" /></ActionIcon>
            Grocery List
          </button>
        }
      />
      <button
        type="button"
        onClick={handleShare}
        className={cn(buttonClassName, copied && "text-kitch-orange-to")}
      >
        {copied ? (
          <>
            <ActionIcon><Check className="h-4 w-4" /></ActionIcon>
            Copied!
          </>
        ) : (
          <>
            <ActionIcon><Share2 className="h-4 w-4" /></ActionIcon>
            Share
          </>
        )}
      </button>
    </div>
  );
}
