"use client";

import { useLayoutEffect, useRef } from "react";

import { Textarea } from "@/components/ui/textarea";
import { LocalStarRating } from "@/components/recipes/edit/local-star-rating";

export function RecipeNameRatingNotes({
  name,
  onNameChange,
  nameError,
  rating,
  onRatingChange,
  notes,
  onNotesChange,
}: {
  name: string;
  onNameChange: (value: string) => void;
  nameError: string | null;
  rating: number;
  onRatingChange: (value: number) => void;
  notes: string;
  onNotesChange: (value: string) => void;
}) {
  const nameRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = nameRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [name]);

  return (
    <div className="flex flex-col lg:col-span-6">
      <label
        htmlFor="recipe-name"
        className="text-xs font-semibold uppercase tracking-[0.2em] text-kitch-orange-to"
      >
        Recipe Name
      </label>
      <Textarea
        ref={nameRef}
        id="recipe-name"
        value={name}
        onChange={(event) => onNameChange(event.target.value.replace(/\n/g, ""))}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
          }
        }}
        placeholder="Recipe name"
        rows={1}
        className="mt-2 min-h-0 resize-none overflow-hidden rounded-2xl border border-kitch-charcoal/10 bg-white px-4 pb-3 pt-[7px] font-literata text-3xl font-semibold leading-snug text-kitch-charcoal shadow-none placeholder:text-kitch-grey focus-visible:ring-1 focus-visible:ring-kitch-orange-to md:text-4xl"
      />
      {nameError ? <p className="mt-1 text-sm text-kitch-red">{nameError}</p> : null}

      <span className="mt-5 text-sm font-medium text-kitch-charcoal">Rating</span>
      <div className="mt-2">
        <LocalStarRating rating={rating} onChange={onRatingChange} />
      </div>

      <span className="mt-5 text-sm font-medium text-kitch-charcoal">Notes</span>
      <Textarea
        value={notes}
        onChange={(event) => onNotesChange(event.target.value)}
        placeholder="Add a note about this recipe…"
        rows={4}
        className="mt-2 rounded-2xl border border-kitch-charcoal/10 bg-white px-4 py-3 text-sm text-kitch-charcoal shadow-none placeholder:text-kitch-grey focus-visible:ring-1 focus-visible:ring-kitch-orange-to"
      />
    </div>
  );
}
