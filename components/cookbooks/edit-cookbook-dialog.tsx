"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CoverImage } from "@/components/cookbooks/cover-image";
import {
  SelectRecipesDialog,
  type SelectableRecipe,
} from "@/components/cookbooks/select-recipes-dialog";
import {
  createCookbookWithDetails,
  getCookbookForEdit,
  updateCookbookDetails,
} from "@/app/(dashboard)/cookbooks/actions";
import { cn } from "@/lib/utils";

export function EditCookbookDialog({
  trigger,
  cookbookId,
  open: openProp,
  onOpenChange: onOpenChangeProp,
}: {
  trigger?: ReactNode;
  cookbookId?: number;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const isEditMode = cookbookId !== undefined;
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : uncontrolledOpen;
  const setOpen = isControlled ? onOpenChangeProp! : setUncontrolledOpen;
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [recipes, setRecipes] = useState<SelectableRecipe[]>([]);
  const [thumbnailRecipeId, setThumbnailRecipeId] = useState<number | null>(null);
  const [isSaving, startSaving] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Works around a Radix Dialog/DropdownMenu interaction bug where closing a
    // Dialog opened from a DropdownMenuItem can leave `pointer-events: none`
    // stuck on <body>, freezing the rest of the page until reload.
    if (!open) {
      document.body.style.pointerEvents = "";
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (!isEditMode) {
      setTitle("");
      setRecipes([]);
      setThumbnailRecipeId(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    getCookbookForEdit(cookbookId).then((result) => {
      if (cancelled) return;
      setLoading(false);
      if (result.ok) {
        setTitle(result.title);
        setRecipes(result.recipes);
        setThumbnailRecipeId(result.thumbnailRecipeId);
      } else {
        setError(result.error);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open, isEditMode, cookbookId]);

  const handleRecipesConfirmed = (selected: SelectableRecipe[]) => {
    setRecipes(selected);
    if (thumbnailRecipeId !== null && !selected.some((r) => r.id === thumbnailRecipeId)) {
      setThumbnailRecipeId(null);
    }
  };

  const handleSave = () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("Cookbook name is required");
      return;
    }
    setError(null);
    const recipeIds = recipes.map((r) => r.id);

    startSaving(async () => {
      if (isEditMode) {
        const result = await updateCookbookDetails({
          cookbookId,
          title: trimmedTitle,
          recipeIds,
          thumbnailRecipeId,
        });
        if (result.ok) {
          setOpen(false);
        } else {
          setError(result.error);
        }
      } else {
        const result = await createCookbookWithDetails({
          title: trimmedTitle,
          recipeIds,
          thumbnailRecipeId,
        });
        if (result.ok) {
          setOpen(false);
          router.push(`/cookbooks/${result.cookbookId}`);
        } else {
          setError(result.error);
        }
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent
        className="flex max-h-[85vh] flex-col p-0 sm:max-w-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <DialogHeader className="shrink-0 gap-1 p-6 pb-3 text-left">
          <DialogTitle className="text-xl">
            {isEditMode ? "Edit Cookbook" : "New Cookbook"}
          </DialogTitle>
          <DialogDescription>
            Name your cookbook, add recipes, and select a cover photo.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 pb-4">
          {loading ? (
            <p className="py-4 text-center text-sm text-kitch-grey">Loading…</p>
          ) : (
            <>
              <div className="flex flex-col gap-2">
                <Label
                  htmlFor="cookbook-name"
                  className="text-xs font-semibold uppercase tracking-wide text-kitch-grey"
                >
                  Cookbook Name
                </Label>
                <Input
                  id="cookbook-name"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="e.g. Weeknight Favorites"
                  className="h-11 rounded-full border-kitch-charcoal/15 bg-kitch-cream px-4 text-kitch-charcoal placeholder:text-kitch-grey"
                />
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-kitch-grey">
                    Choose a Recipe as the Cover
                  </span>
                  <SelectRecipesDialog
                    initialSelectedIds={new Set(recipes.map((r) => r.id))}
                    onConfirm={handleRecipesConfirmed}
                    trigger={
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-full border-kitch-charcoal/15 bg-white text-kitch-charcoal shadow-sm hover:bg-kitch-cream-dark hover:text-kitch-charcoal"
                      >
                        Add Recipes
                      </Button>
                    }
                  />
                </div>

                {recipes.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-kitch-grey/30 py-6 text-center text-sm text-kitch-grey">
                    Add recipes to choose a cover.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {recipes.map((recipe) => {
                      const checked = thumbnailRecipeId === recipe.id;
                      return (
                        <button
                          key={recipe.id}
                          type="button"
                          onClick={() => setThumbnailRecipeId(recipe.id)}
                          className={cn(
                            "group relative aspect-square overflow-hidden rounded-xl border-2",
                            checked ? "border-kitch-red ring-2 ring-kitch-red" : "border-transparent",
                          )}
                        >
                          <CoverImage imageUrl={recipe.imageUrl} alt={recipe.name} />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/5 to-transparent" />
                          <span className="absolute inset-x-0 bottom-0 truncate p-2 text-left text-xs font-medium text-white">
                            {recipe.name}
                          </span>
                          {checked ? (
                            <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-kitch-red text-white shadow-sm">
                              <Check className="h-3 w-3" />
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {error ? <p className="text-sm text-kitch-red">{error}</p> : null}
            </>
          )}
        </div>

        <DialogFooter className="shrink-0 p-6 pt-3">
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
            onClick={handleSave}
            disabled={isSaving || loading || !title.trim()}
            className="bg-gradient-to-r from-kitch-orange-from to-kitch-orange-to text-white shadow-sm hover:opacity-90"
          >
            {isSaving ? "Saving…" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
