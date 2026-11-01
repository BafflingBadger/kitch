"use client";

import { useState, useTransition } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { removeFoodEntry, updateFoodEntry } from "@/app/(dashboard)/meal-prep/actions";
import { MEAL_TYPES, MEAL_TYPE_META, type MealPlanType } from "@/lib/meal-plan/constants";
import { LIMITS } from "@/lib/validation/limits";
import { cn } from "@/lib/utils";
import {
  MacroInputs,
  parseMacroInput,
  type MacroInputValues,
} from "@/components/meal-plan/macro-inputs";
import type { MealPlanFoodEntry } from "@/components/meal-plan/week-grid";

type Draft = MacroInputValues & { type: MealPlanType; name: string; serving: string };

function toDraft(entry: MealPlanFoodEntry): Draft {
  return {
    type: entry.type,
    name: entry.name,
    serving: entry.serving ?? "",
    calories: String(entry.calories),
    proteinG: String(entry.proteinG),
    fatG: String(entry.fatG),
    carbsG: String(entry.carbsG),
  };
}

/**
 * Edit a Quick Add food on the calendar, or take it off the plan. The draft is
 * read from `entry` on mount, so remount (via `key`) to start a fresh edit.
 */
export function EditFoodEntryDialog({
  entry,
  open,
  onOpenChange,
}: {
  entry: MealPlanFoodEntry;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [draft, setDraft] = useState(() => toDraft(entry));
  const [error, setError] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();
  const [isRemoving, startRemoving] = useTransition();

  const update = (patch: Partial<Draft>) => setDraft((current) => ({ ...current, ...patch }));

  const save = () => {
    setError(null);
    if (!draft.name.trim()) {
      setError("The food needs a name");
      return;
    }
    startSaving(async () => {
      const result = await updateFoodEntry(entry.id, draft.type, {
        name: draft.name,
        serving: draft.serving,
        calories: parseMacroInput(draft.calories),
        proteinG: parseMacroInput(draft.proteinG),
        fatG: parseMacroInput(draft.fatG),
        carbsG: parseMacroInput(draft.carbsG),
      });
      if (result.ok) {
        onOpenChange(false);
      } else {
        setError(result.error);
      }
    });
  };

  const remove = () => {
    setError(null);
    startRemoving(async () => {
      const result = await removeFoodEntry(entry.id);
      if (result.ok) {
        onOpenChange(false);
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="p-0 sm:max-w-xl">
        <DialogHeader className="gap-1 p-6 pb-0 text-left">
          <DialogTitle className="text-xl">Edit food</DialogTitle>
          <DialogDescription>Changes only apply to this day&rsquo;s plan.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 px-6 pt-2">
          <div className="grid grid-cols-4 gap-1 rounded-full border border-kitch-charcoal/10 bg-kitch-cream p-1">
            {MEAL_TYPES.map((type) => {
              const { label, icon: Icon } = MEAL_TYPE_META[type];
              const selected = draft.type === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => update({ type })}
                  aria-pressed={selected}
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded-full border py-1.5 text-sm font-medium transition-colors",
                    selected
                      ? "border-kitch-charcoal/10 bg-white text-kitch-charcoal shadow-[0_1px_2px_rgba(0,0,0,0.08)]"
                      : "border-transparent text-kitch-grey hover:text-kitch-charcoal",
                  )}
                >
                  <Icon className={cn("h-3.5 w-3.5", selected && "text-kitch-red")} />
                  {label}
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-kitch-charcoal/10 bg-kitch-cream p-4">
            {/* Name and portion are editable but read as plain text, as in Quick Add. */}
            <div className="flex flex-col">
              <input
                value={draft.name}
                onChange={(event) => update({ name: event.target.value })}
                maxLength={LIMITS.foodName}
                aria-label="Food name"
                className="-mx-1 w-full rounded-md bg-transparent px-1 text-[15px] font-semibold text-kitch-charcoal hover:bg-white/60 focus:bg-white focus:outline-none"
              />
              <input
                value={draft.serving}
                onChange={(event) => update({ serving: event.target.value })}
                maxLength={LIMITS.foodServing}
                placeholder="Add portion"
                aria-label="Portion"
                className="-mx-1 mt-0.5 w-full rounded-md bg-transparent px-1 text-xs text-kitch-grey placeholder:text-kitch-grey/60 hover:bg-white/60 focus:bg-white focus:outline-none"
              />
            </div>
            <MacroInputs values={draft} onChange={(field, value) => update({ [field]: value })} />
          </div>

          {error ? <p className="text-sm text-kitch-red">{error}</p> : null}
        </div>

        <div className="flex items-center justify-between gap-3 p-6 pt-2">
          <button
            type="button"
            onClick={remove}
            disabled={isRemoving || isSaving}
            className="rounded-full px-3 py-2 text-sm font-medium text-kitch-red transition-colors hover:bg-kitch-peach disabled:opacity-50"
          >
            {isRemoving ? "Removing…" : "Remove from plan"}
          </button>
          <Button
            type="button"
            onClick={save}
            disabled={isSaving || isRemoving}
            className="h-11 rounded-full bg-kitch-charcoal px-6 text-sm font-semibold text-white shadow-sm hover:bg-kitch-charcoal/90"
          >
            {isSaving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
