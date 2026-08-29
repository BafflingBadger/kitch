import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function WeekNavigator({
  weekLabel,
  prevHref,
  nextHref,
}: {
  weekLabel: string;
  prevHref: string;
  nextHref: string;
}) {
  return (
    <div className="inline-flex shrink-0 items-center gap-1 rounded-full border border-kitch-charcoal/10 bg-white px-2 py-1.5 shadow-sm">
      <Link
        href={prevHref}
        aria-label="Previous week"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-kitch-charcoal transition-colors hover:bg-kitch-cream-dark"
      >
        <ChevronLeft className="h-4 w-4" />
      </Link>
      <span className="whitespace-nowrap px-2 text-sm font-semibold text-kitch-charcoal">
        {weekLabel}
      </span>
      <Link
        href={nextHref}
        aria-label="Next week"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-kitch-charcoal transition-colors hover:bg-kitch-cream-dark"
      >
        <ChevronRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
