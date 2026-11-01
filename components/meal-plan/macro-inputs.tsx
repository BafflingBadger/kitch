import { LIMITS } from "@/lib/validation/limits";

const MACRO_FIELDS = [
  { field: "calories", label: "Cal", unit: "kcal" },
  { field: "proteinG", label: "Protein", unit: "g" },
  { field: "fatG", label: "Fat", unit: "g" },
  { field: "carbsG", label: "Carbs", unit: "g" },
] as const;

export type MacroField = (typeof MACRO_FIELDS)[number]["field"];

/** Macro values as typed; strings so a field can be empty mid-edit. */
export type MacroInputValues = Record<MacroField, string>;

/** A typed macro value as a number, with blank or junk input counting as 0. */
export function parseMacroInput(value: string) {
  const n = Number(value);
  return Number.isFinite(n) && value.trim() !== "" ? n : 0;
}

/** The four labelled Cal / Protein / Fat / Carbs inputs used by Quick Add and the edit dialog. */
export function MacroInputs({
  values,
  onChange,
}: {
  values: MacroInputValues;
  onChange: (field: MacroField, value: string) => void;
}) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {MACRO_FIELDS.map(({ field, label, unit }) => (
        <label key={field} className="flex min-w-0 flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-kitch-grey">
            {label}
          </span>
          <span className="flex h-9 items-center rounded-lg border border-kitch-charcoal/10 bg-white pr-2.5 focus-within:ring-1 focus-within:ring-ring">
            <input
              type="number"
              inputMode="decimal"
              min={0}
              max={field === "calories" ? LIMITS.foodCalories : LIMITS.foodGrams}
              step={field === "calories" ? 1 : 0.1}
              value={values[field]}
              onChange={(event) => onChange(field, event.target.value)}
              className="h-full w-full min-w-0 bg-transparent pl-2.5 text-sm font-semibold text-kitch-charcoal [appearance:textfield] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <span className="shrink-0 text-[10px] text-kitch-grey">{unit}</span>
          </span>
        </label>
      ))}
    </div>
  );
}
