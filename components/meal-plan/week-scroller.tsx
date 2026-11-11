"use client";

import { useEffect, useRef } from "react";

/**
 * The week's horizontal scroll area. Below `lg` each day is nearly full width
 * and snaps into place, so it opens on today rather than on Monday.
 */
export function WeekScroller({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = ref.current;
    // From lg the week starts on Monday, as it always has.
    if (window.matchMedia("(min-width: 1024px)").matches) return;
    if (!container || container.scrollWidth <= container.clientWidth) return;
    const today = container.querySelector<HTMLElement>("[data-today]");
    if (!today) return;
    // scrollTo on the container, not scrollIntoView, which would also scroll
    // the page vertically.
    const padding = parseFloat(getComputedStyle(container).paddingLeft) || 0;
    container.scrollTo({ left: today.offsetLeft - container.offsetLeft - padding });
  }, []);

  return (
    <div
      ref={ref}
      className="-mx-4 flex h-full snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:scroll-px-6 sm:gap-4 sm:px-6 lg:mx-0 lg:snap-none lg:px-0"
    >
      {children}
    </div>
  );
}
