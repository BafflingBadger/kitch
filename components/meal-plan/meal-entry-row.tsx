"use client";

import { useTransition } from "react";
import Link from "next/link";
import { X } from "lucide-react";

import { CoverImage } from "@/components/cookbooks/cover-image";
import { removeMealPlanEntry } from "@/app/(dashboard)/meal-prep/actions";
import { MEAL_TYPE_META } from "@/lib/meal-plan/constants";
import type { MealPlanEntryItem } from "@/components/meal-plan/week-grid";

export function MealEntryRow({ entry }: { entry: MealPlanEntryItem }) {
  const [isPending, startTransition] = useTransition();
  const meta = MEAL_TYPE_META[entry.type];
  const Icon = meta.icon;

  return (
    <div className="group relative mb-3 overflow-hidden rounded-xl border border-kitch-charcoal/10 bg-white shadow-sm last:mb-0">
      <Link href={`/recipes/${entry.recipeId}?backHref=/meal-prep&backLabel=Meal Plan`} className="block">
        <div className="aspect-[16/10] w-full overflow-hidden">
          <CoverImage imageUrl={entry.imageUrl} alt={entry.recipeName} />
        </div>
        <div className="p-2.5">
          <div className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-kitch-red">
            <Icon className="h-3.5 w-3.5" />
            {meta.label}
          </div>
          <p className="mt-1 text-sm font-semibold leading-snug text-kitch-charcoal">{entry.recipeName}</p>
        </div>
      </Link>
      <button
        type="button"
        aria-label={`Remove ${entry.recipeName} from plan`}
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            await removeMealPlanEntry(entry.id);
          })
        }
        className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white opacity-0 backdrop-blur-sm transition-opacity hover:bg-black/70 group-hover:opacity-100 disabled:opacity-50"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
