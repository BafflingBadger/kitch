"use client";

import { Minus, Plus } from "lucide-react";

import { LIMITS } from "@/lib/validation/limits";
import { formatServings } from "@/lib/meal-plan/macros";

const STEP = 0.5;

/** Servings eaten of a meal-plan recipe, in half-serving steps. */
export function ServingsStepper({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  const set = (next: number) =>
    onChange(Math.min(Math.max(Math.round(next / STEP) * STEP, STEP), LIMITS.mealPlanServings));

  return (
    <div className="inline-flex items-center rounded-full border border-kitch-charcoal/10 bg-kitch-cream p-1">
      <button
        type="button"
        aria-label="Fewer servings"
        disabled={disabled || value <= STEP}
        onClick={() => set(value - STEP)}
        className="flex h-8 w-8 items-center justify-center rounded-full text-kitch-charcoal transition-colors hover:bg-white disabled:opacity-40"
      >
        <Minus className="h-4 w-4" />
      </button>
      <span className="min-w-[3rem] text-center text-sm font-semibold text-kitch-charcoal">
        {formatServings(value)}
      </span>
      <button
        type="button"
        aria-label="More servings"
        disabled={disabled || value >= LIMITS.mealPlanServings}
        onClick={() => set(value + STEP)}
        className="flex h-8 w-8 items-center justify-center rounded-full text-kitch-charcoal transition-colors hover:bg-white disabled:opacity-40"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
