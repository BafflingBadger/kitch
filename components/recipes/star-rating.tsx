"use client";

import { useState, useTransition } from "react";
import { Star } from "lucide-react";

import { updateRecipeRating } from "@/app/(dashboard)/recipes/[id]/actions";
import { cn } from "@/lib/utils";

export function StarRating({
  recipeId,
  initialRating,
}: {
  recipeId: number;
  initialRating: number;
}) {
  const [rating, setRating] = useState(initialRating);
  const [isPending, startTransition] = useTransition();

  const handleRate = (value: number) => {
    const previous = rating;
    const next = value === rating ? 0 : value;
    setRating(next);
    startTransition(async () => {
      const result = await updateRecipeRating(recipeId, next);
      if (!result.ok) {
        setRating(previous);
      }
    });
  };

  return (
    <div
      role="radiogroup"
      aria-label="Rate this recipe"
      className={cn(
        "flex items-center gap-1",
        isPending && "pointer-events-none opacity-50",
      )}
    >
      {[1, 2, 3, 4, 5].map((value) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={value === rating}
          aria-label={`${value} star${value === 1 ? "" : "s"}`}
          onClick={() => handleRate(value)}
          className="p-0.5"
        >
          <Star
            className={cn(
              "h-6 w-6 transition-colors",
              value <= rating
                ? "fill-red-500 text-red-500"
                : "text-kitch-charcoal/20",
            )}
          />
        </button>
      ))}
    </div>
  );
}
