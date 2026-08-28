"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

export function DraggableRow({
  index,
  onReorder,
  children,
  className,
}: {
  index: number;
  onReorder: (from: number, to: number) => void;
  children: React.ReactNode;
  className?: string;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  return (
    <li
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData("text/plain", String(index));
        event.dataTransfer.effectAllowed = "move";
        setIsDragging(true);
      }}
      onDragEnd={() => setIsDragging(false)}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragOver(false);
        const from = Number(event.dataTransfer.getData("text/plain"));
        if (Number.isInteger(from)) {
          onReorder(from, index);
        }
      }}
      className={cn(
        "transition-opacity",
        isDragging && "opacity-40",
        isDragOver && "border-t-2 border-kitch-orange-to",
        className,
      )}
    >
      {children}
    </li>
  );
}
