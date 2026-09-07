"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, FileText, Link2, Upload } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { createBlankRecipe } from "@/app/(dashboard)/recipes/actions";

export function NewRecipeDialog({ trigger }: { trigger: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, startCreating] = useTransition();
  const router = useRouter();

  function handleWriteFromScratch() {
    setError(null);
    startCreating(async () => {
      const result = await createBlankRecipe();
      if (result.ok) {
        setOpen(false);
        router.push(`/recipes/${result.recipeId}/edit`);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="bg-white sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Recipe</DialogTitle>
          <DialogDescription>
            Import from a link, upload a file, or start with a blank page.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-kitch-grey">
            Import from a link
          </span>
          <div className="flex items-center gap-2">
            <div className="flex h-11 flex-1 items-center gap-2 rounded-full border border-kitch-charcoal/10 bg-kitch-cream-dark px-4">
              <Link2 className="h-4 w-4 shrink-0 text-kitch-grey" />
              <input
                type="text"
                placeholder="Paste recipe link here"
                className="w-full bg-transparent text-sm text-kitch-charcoal placeholder:text-kitch-grey focus:outline-none"
              />
            </div>
            <button
              type="button"
              className="flex h-11 shrink-0 items-center rounded-full bg-gradient-to-r from-kitch-orange-from to-kitch-orange-to px-5 text-sm font-semibold text-white shadow-sm hover:opacity-90"
            >
              Import
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-kitch-charcoal/10" />
          <span className="text-xs text-kitch-grey">or</span>
          <div className="h-px flex-1 bg-kitch-charcoal/10" />
        </div>

        <button
          type="button"
          className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-kitch-charcoal/20 bg-kitch-peach/40 px-6 py-8 text-center transition-colors hover:bg-kitch-peach/60"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-kitch-peach text-kitch-red">
            <Upload className="h-5 w-5" />
          </span>
          <span className="text-sm font-semibold text-kitch-charcoal">
            Upload a photo or PDF
          </span>
          <span className="text-xs text-kitch-grey">
            Drag and drop, or click to browse. JPG, PNG, or PDF up to 10MB.
          </span>
        </button>

        <button
          type="button"
          onClick={handleWriteFromScratch}
          disabled={isCreating}
          className={cn(
            "flex items-center gap-3 rounded-2xl border border-kitch-charcoal/10 bg-kitch-cream-dark px-4 py-3.5 text-left transition-colors hover:bg-kitch-cream-dark/70 disabled:opacity-60",
          )}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-kitch-red shadow-sm">
            <FileText className="h-4 w-4" />
          </span>
          <span className="flex-1">
            <span className="block text-sm font-semibold text-kitch-charcoal">
              {isCreating ? "Creating…" : "Write from scratch"}
            </span>
            <span className="block text-xs text-kitch-grey">
              Start with a blank recipe and fill it in yourself.
            </span>
          </span>
          <ArrowRight className="h-4 w-4 shrink-0 text-kitch-grey" />
        </button>
        {error ? <p className="text-sm text-kitch-red">{error}</p> : null}
      </DialogContent>
    </Dialog>
  );
}
