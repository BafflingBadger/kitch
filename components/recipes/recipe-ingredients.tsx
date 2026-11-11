"use client";

import { useState } from "react";
import { Users } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export interface RecipeIngredientItem {
  id: number;
  desc: string;
  order: number;
  is_heading: boolean | null;
}

// Ticks are a cooking aid only: kept in component state, never saved.
export function RecipeIngredients({
  items,
  servings,
}: {
  items: RecipeIngredientItem[];
  servings?: number;
}) {
  const [checkedIds, setCheckedIds] = useState<Set<number>>(() => new Set());

  function toggle(id: number, checked: boolean) {
    setCheckedIds((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  return (
    <section>
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-literata text-2xl font-semibold text-kitch-charcoal">
          Ingredients
        </h2>
        {servings !== undefined && (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-kitch-charcoal/10 bg-white px-3 py-1 text-xs font-medium text-kitch-grey">
            <Users className="h-3.5 w-3.5" aria-hidden="true" />
            Serves {servings}
          </span>
        )}
      </div>
      <div className="mt-6 rounded-2xl bg-kitch-cream pb-6">
        {items.length === 0 ? (
          <p className="text-sm text-kitch-grey">No ingredients listed yet.</p>
        ) : (
          <ul>
            {items.map((item, index) => {
              if (item.is_heading) {
                return (
                  <h3
                    key={item.id}
                    className="pt-4 font-literata text-base font-semibold text-kitch-charcoal first:pt-0"
                  >
                    {item.desc}
                  </h3>
                );
              }
              const previous = items[index - 1];
              const showDivider = Boolean(previous && !previous.is_heading);
              const checked = checkedIds.has(item.id);
              const checkboxId = `ingredient-${item.id}`;
              return (
                <li
                  key={item.id}
                  className={cn(
                    "ml-4 flex items-start gap-3 py-2.5 text-sm leading-relaxed text-kitch-charcoal",
                    index === 0 && "pt-0",
                    showDivider && "border-t border-kitch-charcoal/10",
                  )}
                >
                  <Checkbox
                    id={checkboxId}
                    checked={checked}
                    onCheckedChange={(value) => toggle(item.id, value === true)}
                    className="mt-[3px] border-kitch-charcoal/30 data-[state=checked]:border-kitch-orange-to data-[state=checked]:bg-kitch-orange-to"
                  />
                  <label
                    htmlFor={checkboxId}
                    className={cn(
                      "cursor-pointer",
                      checked && "text-kitch-grey line-through",
                    )}
                  >
                    {item.desc}
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
