"use client";

import { GripVertical, Plus, Trash2 } from "lucide-react";

import { Textarea } from "@/components/ui/textarea";
import { DraggableRow } from "@/components/recipes/edit/draggable-row";
import { EditableHeadingText } from "@/components/recipes/edit/editable-heading-text";
import { useDragReorder } from "@/hooks/use-drag-reorder";

export interface EditableDirection {
  key: string;
  id: number | null;
  desc: string;
  is_heading: boolean;
}

export function EditableDirectionList({
  items,
  onChange,
}: {
  items: EditableDirection[];
  onChange: (items: EditableDirection[]) => void;
}) {
  const { reorder } = useDragReorder(items, onChange);

  const updateDesc = (key: string, desc: string) => {
    onChange(items.map((item) => (item.key === key ? { ...item, desc } : item)));
  };

  const removeRow = (key: string) => {
    onChange(items.filter((item) => item.key !== key));
  };

  const addStep = () => {
    onChange([...items, { key: crypto.randomUUID(), id: null, desc: "", is_heading: false }]);
  };

  const addHeading = () => {
    onChange([...items, { key: crypto.randomUUID(), id: null, desc: "", is_heading: true }]);
  };

  let stepNumber = 0;

  return (
    <section>
      <h2 className="font-literata text-2xl font-semibold text-kitch-charcoal">Directions</h2>
      <ul className="mt-6 flex flex-col gap-3">
        {items.map((item, index) => {
          if (item.is_heading) {
            return (
              <DraggableRow key={item.key} index={index} onReorder={reorder}>
                <div className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-kitch-charcoal/30" />
                  <EditableHeadingText
                    value={item.desc}
                    onChange={(desc) => updateDesc(item.key, desc)}
                    placeholder="Section heading"
                    textClassName="font-literata text-lg font-semibold"
                    inputClassName="font-literata text-lg font-semibold"
                  />
                  <button
                    type="button"
                    onClick={() => removeRow(item.key)}
                    aria-label="Remove heading"
                    className="shrink-0 rounded-full p-2 text-kitch-charcoal/40 transition-colors hover:bg-kitch-cream-dark hover:text-kitch-red"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </DraggableRow>
            );
          }

          stepNumber += 1;
          return (
            <DraggableRow key={item.key} index={index} onReorder={reorder}>
              <div className="flex items-start gap-2">
                <GripVertical className="mt-2.5 h-4 w-4 shrink-0 cursor-grab text-kitch-charcoal/30" />
                <span className="mt-2 shrink-0 font-literata text-2xl font-semibold leading-none text-kitch-charcoal/25">
                  {String(stepNumber).padStart(2, "0")}
                </span>
                <Textarea
                  value={item.desc}
                  onChange={(event) => updateDesc(item.key, event.target.value)}
                  placeholder="Describe this step"
                  rows={2}
                  className="border-kitch-charcoal/15 bg-white text-sm text-kitch-charcoal placeholder:text-kitch-grey"
                />
                <button
                  type="button"
                  onClick={() => removeRow(item.key)}
                  aria-label="Remove step"
                  className="mt-1 shrink-0 rounded-full p-2 text-kitch-charcoal/40 transition-colors hover:bg-kitch-cream-dark hover:text-kitch-red"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </DraggableRow>
          );
        })}
      </ul>
      <div className="mt-4 h-px w-full bg-kitch-charcoal/10" />
      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={addStep}
          className="inline-flex items-center gap-1.5 rounded-full border border-kitch-charcoal/10 px-4 py-2 text-sm font-medium text-kitch-charcoal transition-colors hover:bg-kitch-cream-dark"
        >
          <Plus className="h-4 w-4" />
          Add step
        </button>
        <button
          type="button"
          onClick={addHeading}
          className="inline-flex items-center gap-1.5 rounded-full border border-kitch-charcoal/10 px-4 py-2 text-sm font-medium text-kitch-charcoal transition-colors hover:bg-kitch-cream-dark"
        >
          <Plus className="h-4 w-4" />
          Add heading
        </button>
      </div>
    </section>
  );
}
