"use client";

import { useState } from "react";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EditCookbookDialog } from "@/components/cookbooks/edit-cookbook-dialog";
import { DeleteCookbookDialog } from "@/components/cookbooks/delete-cookbook-dialog";

export function CookbookCardMenu({
  cookbookId,
  cookbookTitle,
}: {
  cookbookId: number;
  cookbookTitle: string;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <div
        className="absolute right-2 top-2 z-10"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Cookbook options"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-kitch-charcoal shadow-sm transition-colors hover:bg-white"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-44 rounded-xl border border-kitch-charcoal/10 bg-white p-1.5 text-kitch-charcoal shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <DropdownMenuItem
              onSelect={() => setEditOpen(true)}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-kitch-charcoal focus:bg-kitch-cream-dark focus:text-kitch-charcoal"
            >
              <Pencil className="h-4 w-4" />
              Edit Cookbook
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => setDeleteOpen(true)}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-kitch-red focus:bg-kitch-red/10 focus:text-kitch-red"
            >
              <Trash2 className="h-4 w-4" />
              Delete Cookbook
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <EditCookbookDialog cookbookId={cookbookId} open={editOpen} onOpenChange={setEditOpen} />
      <DeleteCookbookDialog
        cookbookId={cookbookId}
        cookbookTitle={cookbookTitle}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </>
  );
}
