"use client";

import { useState } from "react";
import { BookOpen, Calendar, Check, Share2, ShoppingCart } from "lucide-react";

import { ManageCookbooksDialog } from "@/components/recipes/manage-cookbooks-dialog";
import { AddMealDialog } from "@/components/meal-plan/add-meal-dialog";
import { GroceryListDialog } from "@/components/recipes/grocery-list-dialog";
import type { RecipeIngredientItem } from "@/components/recipes/recipe-ingredients";
import { cn } from "@/lib/utils";

// Four across, each a round icon with its label underneath. When the container
// is wide enough for every label on one line (`actions-row:`, a container query
// on the wrapper below), a row of icon-and-label buttons split by dividers. The
// row never wraps its labels; if they don't fit, the round icons are used.
const buttonClassName =
  "group flex flex-1 flex-col items-center justify-center gap-1.5 px-1 py-1 text-xs font-medium text-kitch-grey transition-colors hover:text-kitch-charcoal actions-row:flex-row actions-row:gap-2 actions-row:whitespace-nowrap actions-row:px-3 actions-row:py-2 actions-row:text-sm";

function ActionIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex h-11 w-11 items-center justify-center rounded-full border border-kitch-charcoal/10 bg-white text-kitch-charcoal shadow-[0_1px_2px_rgba(0,0,0,0.04)] actions-row:h-auto actions-row:w-auto actions-row:border-0 actions-row:bg-transparent actions-row:text-current actions-row:shadow-none">
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
    <div className="[container-name:recipe-actions] [container-type:inline-size]">
      <div className="grid grid-cols-4 divide-kitch-charcoal/10 actions-row:divide-x">
        <ManageCookbooksDialog
          recipeId={recipeId}
          trigger={
            <button type="button" className={buttonClassName}>
              <ActionIcon>
                <BookOpen className="h-4 w-4" />
              </ActionIcon>
              Cookbooks
            </button>
          }
        />
        <AddMealDialog
          recipe={{ id: recipeId, name: recipeName, imageUrl }}
          trigger={
            <button type="button" className={buttonClassName}>
              <ActionIcon>
                <Calendar className="h-4 w-4" />
              </ActionIcon>
              Meal Plan
            </button>
          }
        />
        <GroceryListDialog
          recipeName={recipeName}
          ingredients={ingredients}
          trigger={
            <button type="button" className={buttonClassName}>
              <ActionIcon>
                <ShoppingCart className="h-4 w-4" />
              </ActionIcon>
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
              <ActionIcon>
                <Check className="h-4 w-4" />
              </ActionIcon>
              Copied!
            </>
          ) : (
            <>
              <ActionIcon>
                <Share2 className="h-4 w-4" />
              </ActionIcon>
              Share
            </>
          )}
        </button>
      </div>
    </div>
  );
}
