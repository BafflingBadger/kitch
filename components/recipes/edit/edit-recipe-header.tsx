import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";

export function EditRecipeHeader({
  backHref,
  onSave,
  isSaving,
  saveError,
}: {
  backHref: string;
  onSave: () => void;
  isSaving: boolean;
  saveError: string | null;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-kitch-grey transition-colors hover:text-kitch-charcoal"
      >
        <ArrowLeft className="h-4 w-4" />
        Cancel
      </Link>
      <div className="flex flex-col items-end gap-1.5">
        <Button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className="rounded-full bg-gradient-to-r from-kitch-orange-from to-kitch-orange-to px-6 text-white shadow-sm hover:opacity-90"
        >
          {isSaving ? "Saving…" : "Save recipe"}
        </Button>
        {saveError ? <p className="text-sm text-kitch-red">{saveError}</p> : null}
      </div>
    </div>
  );
}
