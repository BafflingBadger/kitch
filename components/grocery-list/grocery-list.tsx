"use client";

import { useRef, useState, useTransition } from "react";
import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  addGroceryItem,
  clearActiveGroceryItems,
  clearCheckedGroceryItems,
  deleteGroceryItem,
  setGroceryItemChecked,
} from "@/app/(dashboard)/grocery-list/actions";

export type GroceryItem = {
  id: number;
  name: string;
  checked: boolean;
  checkedAt: string | null;
};

export function GroceryList({ initialItems }: { initialItems: GroceryItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [newItemName, setNewItemName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isAdding, startAdding] = useTransition();
  const [isClearing, startClearing] = useTransition();
  const [isResetting, startResetting] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const activeItems = items.filter((item) => !item.checked);
  const checkedItems = [...items]
    .filter((item) => item.checked)
    .sort((a, b) => (b.checkedAt ?? "").localeCompare(a.checkedAt ?? ""));

  function handleAdd() {
    const name = newItemName.trim();
    if (!name) return;
    setError(null);
    setNewItemName("");
    inputRef.current?.focus();
    const tempId = -Date.now();
    setItems((prev) => [...prev, { id: tempId, name, checked: false, checkedAt: null }]);

    startAdding(async () => {
      const result = await addGroceryItem(name);
      if (result.ok) {
        setItems((prev) =>
          prev.map((item) =>
            item.id === tempId
              ? {
                  id: result.item.id,
                  name: result.item.name,
                  checked: result.item.checked,
                  checkedAt: result.item.checked_at,
                }
              : item,
          ),
        );
      } else {
        setItems((prev) => prev.filter((item) => item.id !== tempId));
        setError(result.error);
      }
    });
  }

  function handleToggle(id: number, checked: boolean) {
    setError(null);
    const previous = items;
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, checked, checkedAt: checked ? new Date().toISOString() : null }
          : item,
      ),
    );
    void setGroceryItemChecked(id, checked).then((result) => {
      if (!result.ok) {
        setItems(previous);
        setError(result.error);
      }
    });
  }

  function handleDelete(id: number) {
    setError(null);
    const previous = items;
    setItems((prev) => prev.filter((item) => item.id !== id));
    void deleteGroceryItem(id).then((result) => {
      if (!result.ok) {
        setItems(previous);
        setError(result.error);
      }
    });
  }

  function handleResetActive() {
    setError(null);
    const previous = items;
    setItems((prev) => prev.filter((item) => item.checked));
    startResetting(async () => {
      const result = await clearActiveGroceryItems();
      if (!result.ok) {
        setItems(previous);
        setError(result.error);
      }
    });
  }

  function handleClearChecked() {
    setError(null);
    const previous = items;
    setItems((prev) => prev.filter((item) => !item.checked));
    startClearing(async () => {
      const result = await clearCheckedGroceryItems();
      if (!result.ok) {
        setItems(previous);
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="md:max-w-[calc(50%-0.75rem)]">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            handleAdd();
          }}
          className="flex items-center gap-2 rounded-full border border-kitch-charcoal/10 bg-white py-1.5 pl-4 pr-1.5 shadow-sm"
        >
          <Plus className="h-4 w-4 shrink-0 text-kitch-grey" />
          <input
            ref={inputRef}
            value={newItemName}
            onChange={(event) => setNewItemName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.nativeEvent.isComposing) {
                event.preventDefault();
                handleAdd();
              }
            }}
            placeholder="Add an item…"
            className="flex-1 bg-transparent text-sm text-kitch-charcoal placeholder:text-kitch-grey focus:outline-none"
          />
          <Button
            type="submit"
            disabled={isAdding || !newItemName.trim()}
            className="shrink-0 gap-1.5 rounded-full bg-gradient-to-r from-kitch-orange-from to-kitch-orange-to px-4 text-white shadow-sm hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </form>
        {error ? <p className="mt-2 text-sm text-kitch-red">{error}</p> : null}
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-kitch-charcoal/10 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between px-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-kitch-grey">
              To Buy ({activeItems.length})
            </h2>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleResetActive}
              disabled={isResetting || activeItems.length === 0}
              className="font-bold text-kitch-red hover:bg-kitch-peach hover:text-kitch-red"
            >
              Clear All
            </Button>
          </div>
          {activeItems.length === 0 ? (
            <p className="px-3 py-2.5 text-sm text-kitch-grey">
              Your grocery list is empty. Add an item above to get started.
            </p>
          ) : (
            <ul className="mt-2 flex flex-col gap-1">
              {activeItems.map((item) => (
                <li key={item.id} className="group">
                  <label className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-kitch-cream-dark">
                    <Checkbox
                      checked={item.checked}
                      onCheckedChange={(checked) => handleToggle(item.id, checked === true)}
                      className="border-kitch-charcoal/30 data-[state=checked]:border-kitch-orange-to data-[state=checked]:bg-kitch-orange-to"
                    />
                    <span className="flex-1 text-sm font-medium text-kitch-charcoal">
                      {item.name}
                    </span>
                    <button
                      type="button"
                      aria-label={`Remove ${item.name}`}
                      onClick={(event) => {
                        event.preventDefault();
                        handleDelete(item.id);
                      }}
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-kitch-grey opacity-0 transition-opacity hover:bg-kitch-charcoal/10 hover:text-kitch-charcoal group-hover:opacity-100"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-kitch-charcoal/10 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between px-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-kitch-grey">
              Checked ({checkedItems.length})
            </h2>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClearChecked}
              disabled={isClearing || checkedItems.length === 0}
              className="font-bold text-kitch-red hover:bg-kitch-peach hover:text-kitch-red"
            >
              Clear all
            </Button>
          </div>
          {checkedItems.length === 0 ? (
            <p className="px-3 py-2.5 text-sm text-kitch-grey">
              Items you check off will show up here.
            </p>
          ) : (
            <ul className="mt-2 flex flex-col gap-1">
              {checkedItems.map((item) => (
                <li key={item.id}>
                  <label className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-kitch-cream-dark">
                    <Checkbox
                      checked={item.checked}
                      onCheckedChange={(checked) => handleToggle(item.id, checked === true)}
                      className="border-kitch-charcoal/30 data-[state=checked]:border-kitch-orange-to data-[state=checked]:bg-kitch-orange-to"
                    />
                    <span className="flex-1 text-sm font-medium text-kitch-grey line-through">
                      {item.name}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
