"use client";

import { useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, FileText, Link2, Sparkles, Upload } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  createBlankRecipe,
  importRecipeFromImages,
  importRecipeFromUrl,
} from "@/app/(dashboard)/recipes/actions";
import { filesToBase64Images, ImportFileError } from "@/lib/recipes/import-file-encoding";

export interface NewRecipeQuota {
  /** Premium users have no cap; the meter and paywall are both hidden. */
  isPremium: boolean;
  used: number;
  limit: number;
  exhausted: boolean;
}

export function NewRecipeDialog({
  trigger,
  quota,
}: {
  trigger: ReactNode;
  quota: NewRecipeQuota;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [isCreating, startCreating] = useTransition();
  const [isImportingLink, startImportingLink] = useTransition();
  const [isImportingPhoto, startImportingPhoto] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Seeded from the server, but can also flip mid-session: the allowance is
  // per account, so another device may spend the last import while this dialog
  // is open.
  const [quotaBlocked, setQuotaBlocked] = useState(quota.exhausted);

  const isBusy = isCreating || isImportingLink || isImportingPhoto;
  const remaining = Math.max(0, quota.limit - quota.used);

  /** Returns true when the failure was the paywall, which is shown, not printed. */
  function handleFailure(result: { error: string; reason?: string }) {
    if (result.reason === "quota_exceeded") {
      setQuotaBlocked(true);
      setError(null);
      return true;
    }
    setError(result.error);
    return false;
  }

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

  function handleImportFromLink() {
    if (!linkUrl.trim()) return;
    setError(null);
    startImportingLink(async () => {
      const result = await importRecipeFromUrl(linkUrl);
      if (result.ok) {
        setOpen(false);
        router.push(`/recipes/${result.recipeId}/edit`);
      } else {
        handleFailure(result);
      }
    });
  }

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;
    setError(null);
    startImportingPhoto(async () => {
      try {
        const images = await filesToBase64Images(files);
        const result = await importRecipeFromImages(images);
        if (result.ok) {
          setOpen(false);
          router.push(`/recipes/${result.recipeId}/edit`);
        } else {
          handleFailure(result);
        }
      } catch (err) {
        setError(
          err instanceof ImportFileError
            ? err.message
            : "Failed to process the selected file(s)",
        );
      }
    });
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) {
      setLinkUrl("");
      setError(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Recipe</DialogTitle>
          <DialogDescription>
            {quotaBlocked
              ? "You can still write recipes by hand — importing needs Premium."
              : "Import from a link, upload a file, or start with a blank page."}
          </DialogDescription>
        </DialogHeader>

        {quotaBlocked ? (
          <ImportPaywall limit={quota.limit} onNavigate={() => setOpen(false)} />
        ) : (
          <>
            {!quota.isPremium ? (
              <p className="text-xs text-kitch-grey">
                <span className="font-semibold text-kitch-charcoal">
                  {remaining} of {quota.limit}
                </span>{" "}
                free {remaining === 1 ? "import" : "imports"} left.{" "}
                <Link
                  href="/premium"
                  onClick={() => setOpen(false)}
                  className="font-semibold text-kitch-red hover:underline"
                >
                  Go unlimited
                </Link>
              </p>
            ) : null}

            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-kitch-grey">
                Import from a link
              </span>
              <div className="flex items-center gap-2">
                <div className="flex h-11 flex-1 items-center gap-2 rounded-full border border-kitch-charcoal/10 bg-kitch-cream-dark px-4">
                  <Link2 className="h-4 w-4 shrink-0 text-kitch-grey" />
                  <input
                    type="text"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleImportFromLink();
                    }}
                    disabled={isBusy}
                    placeholder="Paste recipe link here"
                    className="w-full bg-transparent text-sm text-kitch-charcoal placeholder:text-kitch-grey focus:outline-none disabled:opacity-60"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleImportFromLink}
                  disabled={isBusy || !linkUrl.trim()}
                  className="flex h-11 shrink-0 items-center rounded-full bg-gradient-to-r from-kitch-orange-from to-kitch-orange-to px-5 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-60"
                >
                  {isImportingLink ? "Importing…" : "Import"}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-kitch-charcoal/10" />
              <span className="text-xs text-kitch-grey">or</span>
              <div className="h-px flex-1 bg-kitch-charcoal/10" />
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,application/pdf"
              multiple
              className="hidden"
              onChange={handleFileSelected}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isBusy}
              className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-kitch-charcoal/20 bg-kitch-peach/40 px-6 py-8 text-center transition-colors hover:bg-kitch-peach/60 disabled:opacity-60"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-kitch-peach text-kitch-red">
                <Upload className="h-5 w-5" />
              </span>
              <span className="text-sm font-semibold text-kitch-charcoal">
                {isImportingPhoto ? "Importing…" : "Upload a photo or PDF"}
              </span>
              <span className="text-xs text-kitch-grey">
                Click to browse. JPG, PNG, or PDF up to 10MB.
              </span>
            </button>
          </>
        )}

        {/* Writing by hand is never an import, so it stays available on the
            free plan no matter how the allowance stands. */}
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
              Start with a blank recipe and fill it in yourself. Always free.
            </span>
          </span>
          <ArrowRight className="h-4 w-4 shrink-0 text-kitch-grey" />
        </button>
        {error ? <p className="text-sm text-kitch-red">{error}</p> : null}
      </DialogContent>
    </Dialog>
  );
}

function ImportPaywall({
  limit,
  onNavigate,
}: {
  limit: number;
  onNavigate: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-kitch-charcoal/10 bg-kitch-peach/40 px-6 py-8 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-kitch-orange-from to-kitch-orange-to text-white">
        <Sparkles className="h-5 w-5" />
      </span>
      <span className="font-literata text-lg font-semibold text-kitch-charcoal">
        You&rsquo;ve used all {limit} free imports
      </span>
      <span className="max-w-xs text-xs text-kitch-grey">
        Kitch Premium gives you unlimited recipe imports from links, photos, and
        PDFs.
      </span>
      <Link
        href="/premium"
        onClick={onNavigate}
        className="mt-1 flex h-11 items-center rounded-full bg-gradient-to-r from-kitch-orange-from to-kitch-orange-to px-6 text-sm font-semibold text-white shadow-sm hover:opacity-90"
      >
        See plans
      </Link>
    </div>
  );
}
