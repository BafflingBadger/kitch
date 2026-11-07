"use client";

import Link from "next/link";
import { Crown, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { MacroInputs, type MacroField, type MacroInputValues } from "@/components/meal-plan/macro-inputs";
import { LIMITS } from "@/lib/validation/limits";

/** Servings plus per-serving macros, as typed (strings so fields can be empty). */
export type NutritionDraft = MacroInputValues & { servings: string };

/**
 * "Nutrition per serving" on the recipe editor: servings, the four macro
 * inputs, and Auto Estimate (Premium only). Saving never estimates; the
 * numbers are whatever is in these inputs.
 */
export function RecipeNutritionEditor({
  values,
  onChange,
  isPremium,
  onAutoEstimate,
  isEstimating,
  estimateError,
  sectionRef,
}: {
  values: NutritionDraft;
  onChange: (field: MacroField | "servings", value: string) => void;
  isPremium: boolean;
  onAutoEstimate: () => void;
  isEstimating: boolean;
  estimateError: string | null;
  sectionRef?: React.Ref<HTMLElement>;
}) {
  return (
    <section ref={sectionRef} className="mx-auto mt-10 max-w-5xl scroll-mt-24">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-literata text-2xl font-semibold text-kitch-charcoal">Nutrition</h2>
          <p className="text-sm text-kitch-grey">Calories and macros for one serving.</p>
        </div>
        <AutoEstimateButton isPremium={isPremium} onClick={onAutoEstimate} isEstimating={isEstimating} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 rounded-3xl border border-kitch-charcoal/10 bg-white p-5 sm:grid-cols-[8rem_1fr]">
        <label className="flex min-w-0 flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-kitch-grey">
            Servings
          </span>
          <span className="flex h-9 items-center rounded-lg border border-kitch-charcoal/10 bg-white focus-within:ring-1 focus-within:ring-ring">
            <input
              type="number"
              inputMode="decimal"
              min={0}
              max={LIMITS.recipeServings}
              step={0.5}
              value={values.servings}
              onChange={(event) => onChange("servings", event.target.value)}
              className="h-full w-full min-w-0 bg-transparent px-2.5 text-sm font-semibold text-kitch-charcoal [appearance:textfield] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
          </span>
        </label>
        <MacroInputs values={values} onChange={onChange} />
      </div>

      {!isPremium ? (
        <p className="mt-2 text-xs text-kitch-grey">
          Auto Estimate is part of Kitch Premium.{" "}
          {/* New tab, so unsaved edits here aren't lost. */}
          <Link href="/premium" target="_blank" className="font-medium text-kitch-red hover:underline">
            See Premium
          </Link>
        </p>
      ) : null}
      {estimateError ? <p className="mt-2 text-sm text-kitch-red">{estimateError}</p> : null}
    </section>
  );
}

export function AutoEstimateButton({
  isPremium,
  onClick,
  isEstimating,
}: {
  isPremium: boolean;
  onClick: () => void;
  isEstimating: boolean;
}) {
  return (
    <Button
      type="button"
      onClick={onClick}
      disabled={!isPremium || isEstimating}
      className="whitespace-nowrap rounded-full bg-gradient-to-r from-kitch-orange-from to-kitch-orange-to text-white shadow-sm hover:opacity-90 disabled:opacity-60"
    >
      {isPremium ? <Sparkles className="h-4 w-4" /> : <Crown className="h-4 w-4" />}
      {isEstimating ? "Estimating…" : "Auto Estimate"}
      {!isPremium ? (
        <span className="ml-1 rounded-full bg-white/25 px-1.5 py-0.5 text-[10px] font-semibold">Premium</span>
      ) : null}
    </Button>
  );
}
