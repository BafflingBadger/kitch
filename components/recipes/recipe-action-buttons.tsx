"use client";

import { useState } from "react";
import { BookOpen, Calendar, Check, Share2, ShoppingCart } from "lucide-react";

import { ManageCookbooksDialog } from "@/components/recipes/manage-cookbooks-dialog";
import { AddMealDialog } from "@/components/meal-plan/add-meal-dialog";
import { cn } from "@/lib/utils";

const buttonClassName =
  "flex flex-1 items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-kitch-grey transition-colors hover:text-kitch-charcoal";

export function RecipeActionButtons({
  recipeId,
  recipeName,
  imageUrl,
}: {
  recipeId: number;
  recipeName: string;
  imageUrl: string | null;
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
    <div className="grid grid-cols-2 divide-kitch-charcoal/10 sm:grid-cols-4 sm:divide-x">
      <ManageCookbooksDialog
        recipeId={recipeId}
        trigger={
          <button type="button" className={buttonClassName}>
            <BookOpen className="h-4 w-4" />
            Cookbooks
          </button>
        }
      />
      <AddMealDialog
        recipe={{ id: recipeId, name: recipeName, imageUrl }}
        trigger={
          <button type="button" className={buttonClassName}>
            <Calendar className="h-4 w-4" />
            Meal Plan
          </button>
        }
      />
      <button type="button" className={buttonClassName}>
        <ShoppingCart className="h-4 w-4" />
        Grocery List
      </button>
      <button
        type="button"
        onClick={handleShare}
        className={cn(buttonClassName, copied && "text-kitch-orange-to")}
      >
        {copied ? (
          <>
            <Check className="h-4 w-4" />
            Copied!
          </>
        ) : (
          <>
            <Share2 className="h-4 w-4" />
            Share
          </>
        )}
      </button>
    </div>
  );
}
