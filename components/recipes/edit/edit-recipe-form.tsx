"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  estimateRecipeMacros,
  updateRecipe,
  type RecipeMacrosInput,
} from "@/app/(dashboard)/recipes/[id]/actions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { parseMacroInput } from "@/components/meal-plan/macro-inputs";
import {
  AutoEstimateButton,
  RecipeNutritionEditor,
  type NutritionDraft,
} from "@/components/recipes/edit/recipe-nutrition-editor";
import { EditRecipeHeader } from "@/components/recipes/edit/edit-recipe-header";
import { RecipeImageUpload } from "@/components/recipes/edit/recipe-image-upload";
import { RecipeNameRatingNotes } from "@/components/recipes/edit/recipe-name-rating-notes";
import {
  EditableIngredientList,
  type EditableIngredient,
} from "@/components/recipes/edit/editable-ingredient-list";
import {
  EditableDirectionList,
  type EditableDirection,
} from "@/components/recipes/edit/editable-direction-list";

function recipeThumbnailUrl(path: string | null | undefined) {
  if (!path) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/recipes/${path}`;
}

function toNutritionDraft(macros: RecipeMacrosInput): NutritionDraft {
  return {
    servings: String(macros.servings),
    calories: String(macros.calories),
    proteinG: String(macros.proteinG),
    fatG: String(macros.fatG),
    carbsG: String(macros.carbsG),
  };
}

function fromNutritionDraft(draft: NutritionDraft, confidence: number | null): RecipeMacrosInput {
  return {
    confidence,
    servings: parseMacroInput(draft.servings),
    calories: parseMacroInput(draft.calories),
    proteinG: parseMacroInput(draft.proteinG),
    fatG: parseMacroInput(draft.fatG),
    carbsG: parseMacroInput(draft.carbsG),
  };
}

type MacroTotals = { calories: number; proteinG: number; fatG: number; carbsG: number };

/** The whole recipe's macros (per serving x servings), or null while servings isn't a valid number. */
function recipeTotals(draft: NutritionDraft): MacroTotals | null {
  const servings = parseMacroInput(draft.servings);
  if (servings <= 0) return null;
  return {
    calories: parseMacroInput(draft.calories) * servings,
    proteinG: parseMacroInput(draft.proteinG) * servings,
    fatG: parseMacroInput(draft.fatG) * servings,
    carbsG: parseMacroInput(draft.carbsG) * servings,
  };
}

/** Per-serving inputs for `totals` split across `servings`, rounded like the saved columns. */
function perServingDraft(totals: MacroTotals, servings: number) {
  const tenth = (n: number) => String(Math.round((n / servings) * 10) / 10);
  return {
    calories: String(Math.round(totals.calories / servings)),
    proteinG: tenth(totals.proteinG),
    fatG: tenth(totals.fatG),
    carbsG: tenth(totals.carbsG),
  };
}

/** The ingredient lines that matter for nutrition: non-empty, non-heading. */
function ingredientLines(items: EditableIngredient[]) {
  return items.filter((row) => !row.is_heading && row.desc.trim()).map((row) => row.desc.trim());
}

function sameNutrition(a: RecipeMacrosInput, b: RecipeMacrosInput) {
  return (
    a.servings === b.servings &&
    a.calories === b.calories &&
    a.proteinG === b.proteinG &&
    a.fatG === b.fatG &&
    a.carbsG === b.carbsG
  );
}

export function EditRecipeForm({
  recipeId,
  initialName,
  initialRating,
  initialNotes,
  initialThumbnail,
  initialIngredients,
  initialDirections,
  initialMacros,
  isPremium,
  backHref,
  backLabel,
}: {
  recipeId: number;
  initialName: string;
  initialRating: number;
  initialNotes: string | null;
  initialThumbnail: string | null;
  initialIngredients: EditableIngredient[];
  initialDirections: EditableDirection[];
  initialMacros: RecipeMacrosInput;
  isPremium: boolean;
  backHref: string;
  backLabel: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [nameError, setNameError] = useState<string | null>(null);
  const [rating, setRating] = useState(initialRating);
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [thumbnail, setThumbnail] = useState(initialThumbnail);
  const [ingredients, setIngredients] = useState<EditableIngredient[]>(initialIngredients);
  const [directions, setDirections] = useState<EditableDirection[]>(initialDirections);
  const [nutrition, setNutrition] = useState<NutritionDraft>(() => toNutritionDraft(initialMacros));
  // The AI's score for the numbers in the inputs. Recorded with the recipe, not
  // shown; cleared as soon as a nutrition field is edited by hand.
  const [confidence, setConfidence] = useState<number | null>(initialMacros.confidence);
  // The whole recipe's macros. Changing servings re-divides these, so the
  // recipe's total stays the same and rounding never compounds across edits.
  const totalsRef = useRef<MacroTotals | null>(recipeTotals(toNutritionDraft(initialMacros)));
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();
  const [isEstimating, startEstimating] = useTransition();
  const [estimateError, setEstimateError] = useState<string | null>(null);
  const [promptOpen, setPromptOpen] = useState(false);
  const nutritionRef = useRef<HTMLElement>(null);
  // Set by "Edit nutrition" so the prompt's close moves focus there, not back to Save.
  const focusNutritionOnClose = useRef(false);

  const returnHref = `/recipes/${recipeId}?backHref=${encodeURIComponent(backHref)}&backLabel=${encodeURIComponent(backLabel)}`;

  const save = (macros: RecipeMacrosInput) => {
    setSaveError(null);
    startSaving(async () => {
      const result = await updateRecipe(recipeId, {
        name,
        rating,
        notes,
        thumbnail,
        ingredients: ingredients.map(({ desc, is_heading }) => ({ desc, is_heading })),
        directions: directions.map(({ desc, is_heading }) => ({ desc, is_heading })),
        macros,
      });

      if (result.ok) {
        router.push(returnHref);
      } else {
        setSaveError(result.error);
      }
    });
  };

  const handleSave = () => {
    if (!name.trim()) {
      setNameError("Recipe name is required");
      return;
    }
    setNameError(null);

    // The ingredients changed but the nutrition didn't: ask before saving
    // numbers that may no longer match. Saving never estimates by itself.
    const macros = fromNutritionDraft(nutrition, confidence);
    const ingredientsChanged =
      ingredientLines(ingredients).join("\n") !== ingredientLines(initialIngredients).join("\n");
    if (
      ingredientsChanged &&
      sameNutrition(macros, fromNutritionDraft(toNutritionDraft(initialMacros), initialMacros.confidence))
    ) {
      setPromptOpen(true);
      return;
    }

    save(macros);
  };

  /** Fills the inputs with an AI estimate; resolves to the new macros, or null on failure. */
  const runAutoEstimate = (then?: (macros: RecipeMacrosInput) => void) => {
    setEstimateError(null);
    startEstimating(async () => {
      const servings = parseMacroInput(nutrition.servings);
      const result = await estimateRecipeMacros(
        name,
        ingredientLines(ingredients),
        servings > 0 ? servings : null,
      );
      if (!result.ok) {
        setEstimateError(result.error);
        setPromptOpen(false);
        nutritionRef.current?.scrollIntoView({ behavior: "smooth" });
        return;
      }
      const draft = toNutritionDraft(result.macros);
      setNutrition(draft);
      totalsRef.current = recipeTotals(draft);
      setConfidence(result.macros.confidence);
      then?.(result.macros);
    });
  };

  return (
    <div>
      <EditRecipeHeader
        backHref={backHref}
        onSave={handleSave}
        isSaving={isSaving}
        saveError={saveError}
      />

      <div className="mx-auto mt-6 grid max-w-6xl grid-cols-1 gap-6 lg:grid-cols-12 lg:items-center lg:gap-10">
        <div className="lg:col-span-6">
          <RecipeImageUpload
            imageUrl={recipeThumbnailUrl(thumbnail)}
            name={name}
            onUploaded={setThumbnail}
          />
        </div>

        <RecipeNameRatingNotes
          name={name}
          onNameChange={setName}
          nameError={nameError}
          rating={rating}
          onRatingChange={setRating}
          notes={notes}
          onNotesChange={setNotes}
        />
      </div>

      <div className="mx-auto mt-8 h-px w-full max-w-6xl bg-kitch-charcoal/10" />

      <div className="mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-10 lg:grid-cols-2 lg:items-start lg:gap-14">
        <EditableIngredientList items={ingredients} onChange={setIngredients} />
        <EditableDirectionList items={directions} onChange={setDirections} />
      </div>

      <RecipeNutritionEditor
        sectionRef={nutritionRef}
        values={nutrition}
        onChange={(field, value) => {
          if (field === "servings") {
            // Same recipe, split differently: rescale the per-serving numbers.
            // Kept as the AI's estimate, so its confidence still applies.
            const servings = parseMacroInput(value);
            const totals = totalsRef.current;
            setNutrition((current) => ({
              ...current,
              servings: value,
              ...(totals && servings > 0 ? perServingDraft(totals, servings) : {}),
            }));
            return;
          }
          setNutrition((current) => {
            const next = { ...current, [field]: value };
            totalsRef.current = recipeTotals(next) ?? totalsRef.current;
            return next;
          });
          setConfidence(null);
        }}
        isPremium={isPremium}
        onAutoEstimate={() => runAutoEstimate()}
        isEstimating={isEstimating}
        estimateError={estimateError}
      />

      <Dialog open={promptOpen} onOpenChange={setPromptOpen}>
        <DialogContent
          className="sm:max-w-lg"
          onCloseAutoFocus={(event) => {
            if (!focusNutritionOnClose.current) return;
            focusNutritionOnClose.current = false;
            event.preventDefault();
            nutritionRef.current?.scrollIntoView({ behavior: "smooth" });
            nutritionRef.current?.querySelector("input")?.focus({ preventScroll: true });
          }}
        >
          <DialogHeader className="text-left">
            <DialogTitle className="text-xl">Update the nutrition?</DialogTitle>
            <DialogDescription>
              You changed the ingredients, so the calories and macros may be out of date.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={isSaving || isEstimating}
              onClick={() => {
                setPromptOpen(false);
                save(fromNutritionDraft(nutrition, confidence));
              }}
              className="whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium text-kitch-grey transition-colors hover:bg-kitch-cream-dark hover:text-kitch-charcoal disabled:opacity-50"
            >
              Save anyway
            </button>
            <Button
              type="button"
              className="whitespace-nowrap rounded-full bg-kitch-charcoal text-white shadow-sm hover:bg-kitch-charcoal/90"
              disabled={isSaving || isEstimating}
              onClick={() => {
                focusNutritionOnClose.current = true;
                setPromptOpen(false);
              }}
            >
              Edit nutrition
            </Button>
            <AutoEstimateButton
              isPremium={isPremium}
              isEstimating={isEstimating}
              onClick={() =>
                runAutoEstimate((macros) => {
                  setPromptOpen(false);
                  save(macros);
                })
              }
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
