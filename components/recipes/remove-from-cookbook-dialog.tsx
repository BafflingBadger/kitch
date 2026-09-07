"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";

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
import { removeRecipeFromCookbook } from "@/app/(dashboard)/recipes/[id]/actions";

export function RemoveFromCookbookDialog({
  trigger,
  recipeId,
  recipeName,
  cookbookId,
  cookbookTitle,
  open: openProp,
  onOpenChange: onOpenChangeProp,
}: {
  trigger?: ReactNode;
  recipeId: number;
  recipeName: string;
  cookbookId: number;
  cookbookTitle: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : uncontrolledOpen;
  const setOpen = isControlled ? onOpenChangeProp! : setUncontrolledOpen;
  const [isRemoving, startRemoving] = useTransition();
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

  const handleRemove = () => {
    setError(null);
    startRemoving(async () => {
      const result = await removeRecipeFromCookbook(recipeId, cookbookId);
      if (result.ok) {
        setOpen(false);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent
        className="p-0 sm:max-w-md"
        onClick={(event) => event.stopPropagation()}
      >
        <DialogHeader className="gap-1 p-6 pb-3 text-left">
          <DialogTitle className="text-xl">
            Remove &quot;{recipeName}&quot; from &quot;{cookbookTitle}&quot;?
          </DialogTitle>
          <DialogDescription>
            The recipe will continue to exist in your other cookbooks and in All
            Recipes — this only removes it from this cookbook.
          </DialogDescription>
        </DialogHeader>

        {error ? <p className="px-6 pb-2 text-sm text-kitch-red">{error}</p> : null}

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
            onClick={handleRemove}
            disabled={isRemoving}
            className="bg-gradient-to-r from-kitch-orange-from to-kitch-orange-to text-white shadow-sm hover:opacity-90"
          >
            {isRemoving ? "Removing…" : "Remove"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
