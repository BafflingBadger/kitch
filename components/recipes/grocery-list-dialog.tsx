"use client";

import { useState, useTransition, type ReactNode } from "react";
import { ShoppingCart } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { addGroceryItems } from "@/app/(dashboard)/grocery-list/actions";
import { cn } from "@/lib/utils";
import type { RecipeIngredientItem } from "@/components/recipes/recipe-ingredients";

export function GroceryListDialog({
  recipeName,
  ingredients,
  trigger,
}: {
  recipeName: string;
  ingredients: RecipeIngredientItem[];
  trigger: ReactNode;
}) {
  const selectableItems = ingredients.filter((item) => !item.is_heading);

  const [open, setOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(
    () => new Set(selectableItems.map((item) => item.id)),
  );
  const [isSaving, startSaving] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) {
      setSelectedIds(new Set(selectableItems.map((item) => item.id)));
      setError(null);
    }
  }

  function toggleIngredient(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleAll() {
    setSelectedIds((prev) =>
      prev.size === selectableItems.length
        ? new Set()
        : new Set(selectableItems.map((item) => item.id)),
    );
  }

  function handleAdd() {
    const names = selectableItems
      .filter((item) => selectedIds.has(item.id))
      .map((item) => item.desc);
    if (names.length === 0) return;

    startSaving(async () => {
      const result = await addGroceryItems(names);
      if (result.ok) {
        setOpen(false);
      } else {
        setError(result.error);
      }
    });
  }

  const allSelected = selectedIds.size === selectableItems.length && selectableItems.length > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="p-0">
        <DialogHeader className="gap-1 p-6 pb-3 text-left">
          <DialogTitle className="text-xl">Add to Grocery List</DialogTitle>
          <DialogDescription>
            Choose which ingredients from {recipeName} to add.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-kitch-charcoal/70">
              {selectedIds.size} of {selectableItems.length} selected
            </span>
            <button
              type="button"
              onClick={toggleAll}
              className="text-sm font-bold text-kitch-red hover:text-kitch-red/80"
            >
              {allSelected ? "Deselect all" : "Select all"}
            </button>
          </div>

          <div className="mt-3 max-h-[320px] overflow-y-auto border-t border-kitch-charcoal/10 pt-3">
            {selectableItems.length === 0 ? (
              <p className="py-4 text-center text-sm text-kitch-grey">
                This recipe has no ingredients to add.
              </p>
            ) : (
              <ul className="flex flex-col gap-1">
                {selectableItems.map((item) => {
                  const checked = selectedIds.has(item.id);
                  return (
                    <li key={item.id}>
                      <label
                        className={cn(
                          "flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-kitch-cream-dark",
                          checked && "bg-kitch-peach/60",
                        )}
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggleIngredient(item.id)}
                          className="border-kitch-charcoal/30 data-[state=checked]:border-kitch-orange-to data-[state=checked]:bg-kitch-orange-to"
                        />
                        <span className="flex-1 text-sm font-medium text-kitch-charcoal">
                          {item.desc}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          {error ? <p className="mt-3 text-sm text-kitch-red">{error}</p> : null}
        </div>

        <DialogFooter className="p-6 pt-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            className="border-kitch-charcoal/10 bg-white text-kitch-charcoal shadow-none hover:bg-kitch-cream-dark hover:text-kitch-charcoal"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleAdd}
            disabled={isSaving || selectedIds.size === 0}
            className="gap-2 bg-gradient-to-r from-kitch-orange-from to-kitch-orange-to text-white shadow-sm hover:opacity-90"
          >
            <ShoppingCart className="h-4 w-4" />
            Add {selectedIds.size} to Grocery List
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
