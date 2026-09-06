"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  addGroceryItem,
  clearCheckedGroceryItems,
  deleteGroceryItem,
  renameGroceryItem,
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
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const activeItems = items.filter((item) => !item.checked);
  const checkedItems = [...items]
    .filter((item) => item.checked)
    .sort((a, b) => (b.checkedAt ?? "").localeCompare(a.checkedAt ?? ""));

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

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

  function startEditing(item: GroceryItem) {
    setEditingId(item.id);
    setEditingValue(item.name);
  }

  function commitEdit(item: GroceryItem) {
    setEditingId(null);
    const trimmed = editingValue.trim();
    if (!trimmed || trimmed === item.name) return;

    setError(null);
    const previous = items;
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, name: trimmed } : i)));
    void renameGroceryItem(item.id, trimmed).then((result) => {
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
      {error ? <p className="text-sm text-kitch-red">{error}</p> : null}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-kitch-charcoal/10 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-end px-3">
            <span className="text-sm text-kitch-grey">
              {activeItems.length} {activeItems.length === 1 ? "item" : "items"}
            </span>
          </div>
          <ul className="mt-2 flex flex-col gap-1">
            {activeItems.map((item) => (
              <li key={item.id} className="group">
                <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-kitch-cream-dark">
                  <Checkbox
                    checked={item.checked}
                    onCheckedChange={(checked) => handleToggle(item.id, checked === true)}
                    className="border-kitch-charcoal/30 data-[state=checked]:border-kitch-orange-to data-[state=checked]:bg-kitch-orange-to"
                  />
                  <input
                    value={editingId === item.id ? editingValue : item.name}
                    readOnly={editingId !== item.id}
                    onFocus={() => startEditing(item)}
                    onChange={(event) => setEditingValue(event.target.value)}
                    onBlur={() => commitEdit(item)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.nativeEvent.isComposing) {
                        event.preventDefault();
                        event.currentTarget.blur();
                      }
                    }}
                    className="flex-1 bg-transparent text-sm font-medium text-kitch-charcoal focus:outline-none"
                  />
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
                </div>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-3 rounded-xl px-3 py-2.5">
            <Checkbox checked={false} disabled className="border-kitch-charcoal/30" />
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
              className="flex-1 bg-transparent text-sm text-kitch-charcoal placeholder:text-kitch-grey placeholder:opacity-60 focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={handleAdd}
            disabled={isAdding || !newItemName.trim()}
            className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-kitch-grey transition-colors hover:bg-kitch-cream-dark hover:text-kitch-charcoal disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-kitch-grey"
          >
            <Plus className="h-4 w-4" />
            Add item
          </button>
        </div>

        <div className="flex flex-col rounded-xl border border-kitch-charcoal/10 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-end px-3">
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
            <div className="flex flex-1 items-center justify-center">
              <p className="text-sm text-kitch-grey">Checked items will show up here.</p>
            </div>
          ) : (
            <ul className="mt-2 flex flex-col gap-1">
              {checkedItems.map((item) => (
                <li key={item.id}>
                  <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-kitch-cream-dark">
                    <Checkbox
                      checked={item.checked}
                      onCheckedChange={(checked) => handleToggle(item.id, checked === true)}
                      className="border-kitch-charcoal/30 data-[state=checked]:border-kitch-orange-to data-[state=checked]:bg-kitch-orange-to"
                    />
                    <input
                      value={editingId === item.id ? editingValue : item.name}
                      readOnly={editingId !== item.id}
                      onFocus={() => startEditing(item)}
                      onChange={(event) => setEditingValue(event.target.value)}
                      onBlur={() => commitEdit(item)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.nativeEvent.isComposing) {
                          event.preventDefault();
                          event.currentTarget.blur();
                        }
                      }}
                      className={`flex-1 bg-transparent text-sm font-medium text-kitch-grey focus:outline-none ${
                        editingId === item.id ? "" : "line-through"
                      }`}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
