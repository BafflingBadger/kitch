import { cn } from "@/lib/utils";

export interface RecipeDirectionItem {
  id: number;
  desc: string;
  order: number;
  is_heading: boolean | null;
}

export function RecipeDirections({ items }: { items: RecipeDirectionItem[] }) {
  let stepNumber = 0;

  return (
    <section>
      <h2 className="font-literata text-2xl font-semibold text-kitch-charcoal">
        Directions
      </h2>
      {items.length === 0 ? (
        <p className="mt-4 text-sm text-kitch-grey">No directions listed yet.</p>
      ) : (
        <ol className="mt-6">
          {items.map((item, index) => {
            if (item.is_heading) {
              return (
                <h3
                  key={item.id}
                  className="pt-6 font-literata text-lg font-semibold text-kitch-charcoal first:pt-0"
                >
                  {item.desc}
                </h3>
              );
            }
            stepNumber += 1;
            const previous = items[index - 1];
            const showDivider = Boolean(previous && !previous.is_heading);
            return (
              <li
                key={item.id}
                className={cn(
                  "flex gap-5 py-6 last:pb-0",
                  index === 0 && "pt-0",
                  showDivider && "border-t border-kitch-charcoal/10",
                )}
              >
                <span className="shrink-0 font-literata text-3xl font-semibold leading-none text-kitch-charcoal/15">
                  {String(stepNumber).padStart(2, "0")}
                </span>
                <p className="pt-1 text-base leading-relaxed text-kitch-charcoal">
                  {item.desc}
                </p>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
