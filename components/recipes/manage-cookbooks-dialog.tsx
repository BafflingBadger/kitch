"use client";

import { useEffect, useState, useTransition } from "react";
import { Check, Plus } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CoverImage } from "@/components/cookbooks/cover-image";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createCookbook,
  listCookbooksForRecipe,
  saveRecipeCookbooks,
} from "@/app/(dashboard)/recipes/[id]/actions";
import { cn } from "@/lib/utils";

interface CookbookOption {
  id: number;
  title: string;
  imageUrl: string | null;
}

export function ManageCookbooksDialog({
  recipeId,
  trigger,
}: {
  recipeId: number;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cookbooks, setCookbooks] = useState<CookbookOption[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isCreating, setIsCreating] = useState(false);
  const [newCookbookName, setNewCookbookName] = useState("");
  const [isCreatingCookbook, startCreatingCookbook] = useTransition();
  const [isSaving, startSaving] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    listCookbooksForRecipe(recipeId).then((result) => {
      if (cancelled) return;
      setLoading(false);
      if (result.ok) {
        setCookbooks(result.cookbooks);
        setSelectedIds(
          new Set(result.cookbooks.filter((c) => c.isMember).map((c) => c.id)),
        );
      } else {
        setError(result.error);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open, recipeId]);

  const toggleCookbook = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleCreateCookbook = () => {
    const title = newCookbookName.trim();
    if (!title) return;
    startCreatingCookbook(async () => {
      const result = await createCookbook(title);
      if (result.ok) {
        setCookbooks((prev) => [
          { id: result.cookbook.id, title: result.cookbook.title, imageUrl: null },
          ...prev,
        ]);
        setSelectedIds((prev) => new Set(prev).add(result.cookbook.id));
        setNewCookbookName("");
        setIsCreating(false);
        setError(null);
      } else {
        setError(result.error);
      }
    });
  };

  const handleSave = () => {
    startSaving(async () => {
      const result = await saveRecipeCookbooks(recipeId, [...selectedIds]);
      if (result.ok) {
        setOpen(false);
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          setIsCreating(false);
          setNewCookbookName("");
          setError(null);
        }
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="p-0">
        <DialogHeader className="gap-1 border-b border-kitch-charcoal/10 p-6 pb-5 text-left">
          <DialogTitle className="text-xl">Manage Cookbooks</DialogTitle>
          <DialogDescription>
            Choose which cookbooks this recipe belongs to, or create a new one.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[320px] overflow-y-auto px-6 py-4">
          {loading ? (
            <p className="py-4 text-center text-sm text-kitch-grey">Loading…</p>
          ) : cookbooks.length === 0 ? (
            <p className="py-4 text-center text-sm text-kitch-grey">
              You don&apos;t have any cookbooks yet.
            </p>
          ) : (
            <ul className="flex flex-col gap-1">
              {cookbooks.map((cookbook) => {
                const checked = selectedIds.has(cookbook.id);
                return (
                  <li key={cookbook.id}>
                    <label
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-kitch-cream-dark",
                        checked && "bg-kitch-peach/60",
                      )}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleCookbook(cookbook.id)}
                        className="border-kitch-charcoal/30 data-[state=checked]:border-kitch-orange-to data-[state=checked]:bg-kitch-orange-to"
                      />
                      <span className="h-10 w-10 shrink-0 overflow-hidden rounded-lg">
                        <CoverImage imageUrl={cookbook.imageUrl} alt={cookbook.title} />
                      </span>
                      <span className="flex-1 text-sm font-medium text-kitch-charcoal">
                        {cookbook.title}
                      </span>
                      {checked ? (
                        <Check className="h-4 w-4 shrink-0 text-kitch-orange-to" />
                      ) : null}
                    </label>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="mt-3 border-t border-kitch-charcoal/10 pt-3">
            {isCreating ? (
              <div className="flex flex-col gap-2 rounded-xl bg-kitch-cream-dark p-3">
                <Label
                  htmlFor="new-cookbook-name"
                  className="text-xs font-medium text-kitch-grey"
                >
                  New cookbook name
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="new-cookbook-name"
                    autoFocus
                    value={newCookbookName}
                    onChange={(event) => setNewCookbookName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.nativeEvent.isComposing) {
                        event.preventDefault();
                        handleCreateCookbook();
                      }
                    }}
                    placeholder="e.g. Holiday Baking"
                    disabled={isCreatingCookbook}
                    className="border-kitch-charcoal/15 bg-white text-kitch-charcoal placeholder:text-kitch-grey"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleCreateCookbook}
                    disabled={isCreatingCookbook || !newCookbookName.trim()}
                    className="bg-gradient-to-r from-kitch-orange-from to-kitch-orange-to text-white shadow-sm hover:opacity-90"
                  >
                    Add
                  </Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsCreating(true)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-kitch-cream-dark"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-kitch-grey/40 text-kitch-charcoal">
                  <Plus className="h-4 w-4" />
                </span>
                <span className="text-sm font-medium text-kitch-charcoal">
                  Create new cookbook
                </span>
              </button>
            )}
          </div>

          {error ? <p className="mt-3 text-sm text-kitch-red">{error}</p> : null}
        </div>

        <DialogFooter className="border-t border-kitch-charcoal/10 p-6 pt-4 sm:justify-between">
          <span className="self-center text-xs text-kitch-grey">
            {selectedIds.size} selected
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="border-kitch-charcoal/10 bg-kitch-cream text-kitch-charcoal shadow-none hover:bg-kitch-cream-dark hover:text-kitch-charcoal"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={isSaving || loading}
              className="bg-gradient-to-r from-kitch-orange-from to-kitch-orange-to text-white shadow-sm hover:opacity-90"
            >
              {isSaving ? "Saving…" : "Save"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
