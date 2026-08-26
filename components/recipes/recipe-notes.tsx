import { NotebookPen } from "lucide-react";

import { cn } from "@/lib/utils";

export function RecipeNotes({
  notes,
  className,
}: {
  notes: string | null;
  className?: string;
}) {
  const hasNotes = Boolean(notes && notes.trim() !== "");

  if (!hasNotes) return null;

  return (
    <section
      className={cn(
        "rounded-2xl border-l-2 border-kitch-orange-to bg-kitch-peach/40 p-4",
        className,
      )}
    >
      <div className="flex items-center gap-1.5 text-kitch-peach-foreground">
        <NotebookPen className="h-3.5 w-3.5" />
        <h2 className="text-xs font-semibold uppercase tracking-wide">Note</h2>
      </div>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-kitch-charcoal">
        {notes}
      </p>
    </section>
  );
}
