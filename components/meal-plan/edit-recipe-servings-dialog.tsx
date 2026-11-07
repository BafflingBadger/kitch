"use client";

import { useState, useTransition } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { updateMealPlanEntryServings } from "@/app/(dashboard)/meal-prep/actions";
import { formatCalories, scaleMacros } from "@/lib/meal-plan/macros";
import { ServingsStepper } from "@/components/meal-plan/servings-stepper";
import type { MealPlanRecipeEntry } from "@/components/meal-plan/week-grid";

/**
 * Change how many servings of a planned recipe were eaten. Reads `entry` on
 * mount, so remount (via `key`) to start a fresh edit.
 */
export function EditRecipeServingsDialog({
  entry,
  open,
  onOpenChange,
}: {
  entry: MealPlanRecipeEntry;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [servings, setServings] = useState(entry.servings);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();
  const total = scaleMacros(entry.perServing, servings);

  const save = () => {
    setError(null);
    startSaving(async () => {
      const result = await updateMealPlanEntryServings(entry.id, servings);
      if (result.ok) {
        onOpenChange(false);
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader className="text-left">
          <DialogTitle className="text-xl">Servings</DialogTitle>
          <DialogDescription>How much of {entry.recipeName} did you have?</DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between">
          <ServingsStepper value={servings} onChange={setServings} disabled={isSaving} />
          <p className="text-sm font-semibold text-kitch-charcoal">{formatCalories(total.calories)}</p>
        </div>

        {error ? <p className="text-sm text-kitch-red">{error}</p> : null}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
            className="rounded-full px-4 py-2 text-sm font-medium text-kitch-grey transition-colors hover:bg-kitch-cream-dark hover:text-kitch-charcoal disabled:opacity-50"
          >
            Cancel
          </button>
          <Button
            type="button"
            onClick={save}
            disabled={isSaving || servings === entry.servings}
            className="rounded-full bg-gradient-to-r from-kitch-orange-from to-kitch-orange-to text-white shadow-sm hover:opacity-90"
          >
            {isSaving ? "Saving…" : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
