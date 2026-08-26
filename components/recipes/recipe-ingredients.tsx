import { cn } from "@/lib/utils";

export interface RecipeIngredientItem {
  id: number;
  desc: string;
  order: number;
  is_heading: boolean | null;
}

export function RecipeIngredients({ items }: { items: RecipeIngredientItem[] }) {
  return (
    <section>
      <h2 className="font-literata text-2xl font-semibold text-kitch-charcoal">
        Ingredients
      </h2>
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
              return (
                <li
                  key={item.id}
                  className={cn(
                    "ml-4 py-2.5 text-sm leading-relaxed text-kitch-charcoal",
                    index === 0 && "pt-0",
                    showDivider && "border-t border-kitch-charcoal/10",
                  )}
                >
                  {item.desc}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
