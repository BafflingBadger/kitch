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
import { deleteCookbook } from "@/app/(dashboard)/cookbooks/actions";

export function DeleteCookbookDialog({
  trigger,
  cookbookId,
  cookbookTitle,
  open: openProp,
  onOpenChange: onOpenChangeProp,
}: {
  trigger?: ReactNode;
  cookbookId: number;
  cookbookTitle: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : uncontrolledOpen;
  const setOpen = isControlled ? onOpenChangeProp! : setUncontrolledOpen;
  const [isDeleting, startDeleting] = useTransition();
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

  const handleDelete = () => {
    setError(null);
    startDeleting(async () => {
      const result = await deleteCookbook(cookbookId);
      if (result.ok) {
        setOpen(false);
        router.push("/cookbooks");
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
          <DialogTitle className="text-xl">Delete &quot;{cookbookTitle}&quot;?</DialogTitle>
          <DialogDescription>
            This removes the cookbook and unlinks its recipes. The recipes themselves
            won&apos;t be deleted. This can&apos;t be undone.
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
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-kitch-red text-white shadow-sm hover:bg-kitch-red/90"
          >
            {isDeleting ? "Deleting…" : "Delete Cookbook"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
