"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { updateRecipe } from "@/app/(dashboard)/recipes/[id]/actions";
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

export function EditRecipeForm({
  recipeId,
  initialName,
  initialRating,
  initialNotes,
  initialThumbnail,
  initialIngredients,
  initialDirections,
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
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();

  const returnHref = `/recipes/${recipeId}?backHref=${encodeURIComponent(backHref)}&backLabel=${encodeURIComponent(backLabel)}`;

  const handleSave = () => {
    if (!name.trim()) {
      setNameError("Recipe name is required");
      return;
    }
    setNameError(null);
    setSaveError(null);

    startSaving(async () => {
      const result = await updateRecipe(recipeId, {
        name,
        rating,
        notes,
        thumbnail,
        ingredients: ingredients.map(({ desc, is_heading }) => ({ desc, is_heading })),
        directions: directions.map(({ desc, is_heading }) => ({ desc, is_heading })),
      });

      if (result.ok) {
        router.push(returnHref);
      } else {
        setSaveError(result.error);
      }
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
    </div>
  );
}
