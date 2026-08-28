"use client";

import { useState } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function EditableHeadingText({
  value,
  onChange,
  placeholder,
  textClassName,
  inputClassName,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  textClassName?: string;
  inputClassName?: string;
}) {
  const [isEditing, setIsEditing] = useState(value === "");

  if (isEditing) {
    return (
      <Input
        autoFocus
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={() => setIsEditing(false)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            event.currentTarget.blur();
          }
        }}
        placeholder={placeholder}
        className={cn(
          "border-kitch-charcoal/15 bg-white text-kitch-charcoal placeholder:text-kitch-grey",
          inputClassName,
        )}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setIsEditing(true)}
      className={cn(
        "flex-1 truncate rounded-md px-1 py-1.5 text-left text-kitch-charcoal transition-colors hover:bg-kitch-cream-dark",
        !value && "font-normal text-kitch-grey",
        textClassName,
      )}
    >
      {value || placeholder}
    </button>
  );
}
