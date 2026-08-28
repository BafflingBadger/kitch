"use client";

import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

export function LocalStarRating({
  rating,
  onChange,
}: {
  rating: number;
  onChange: (value: number) => void;
}) {
  return (
    <div role="radiogroup" aria-label="Rate this recipe" className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((value) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={value === rating}
          aria-label={`${value} star${value === 1 ? "" : "s"}`}
          onClick={() => onChange(value === rating ? 0 : value)}
          className="p-0.5"
        >
          <Star
            className={cn(
              "h-6 w-6 transition-colors",
              value <= rating ? "fill-red-500 text-red-500" : "text-kitch-charcoal/20",
            )}
          />
        </button>
      ))}
    </div>
  );
}
