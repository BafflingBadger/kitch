"use client";

import Link from "next/link";
import { LogOut, Settings } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar } from "@/components/ui/avatar";
import { LogoutButton } from "@/components/logout-button";

export function ProfileMenu({
  displayName,
  planLabel,
  avatarUrl,
}: {
  displayName: string;
  planLabel: string;
  avatarUrl?: string | null;
}) {
  return (
    <DropdownMenu>
      {/* Just the photo at rest; hovering (or opening the menu) slides the name
          and plan out to its left on a white pill. */}
      <DropdownMenuTrigger className="group flex shrink-0 items-center rounded-full border border-transparent p-1 text-right outline-none transition-colors hover:border-kitch-charcoal/10 hover:bg-white hover:shadow-sm focus-visible:border-kitch-charcoal/10 focus-visible:bg-white data-[state=open]:border-kitch-charcoal/10 data-[state=open]:bg-white data-[state=open]:shadow-sm">
        <div className="min-w-0 max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-200 group-hover:max-w-48 group-hover:px-3 group-hover:opacity-100 group-focus-visible:max-w-48 group-focus-visible:px-3 group-focus-visible:opacity-100 group-data-[state=open]:max-w-48 group-data-[state=open]:px-3 group-data-[state=open]:opacity-100">
          <p className="max-w-40 truncate text-sm font-semibold text-kitch-charcoal">
            {displayName}
          </p>
          <p className="text-xs text-kitch-grey">{planLabel}</p>
        </div>
        <Avatar displayName={displayName} avatarUrl={avatarUrl} sizeClassName="h-10 w-10" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-44 rounded-xl border border-kitch-charcoal/10 bg-white p-1.5 text-kitch-charcoal shadow-lg"
      >
        <DropdownMenuItem
          asChild
          className="cursor-pointer gap-2 rounded-lg px-2.5 py-2 text-sm font-medium text-kitch-charcoal focus:bg-kitch-cream-dark focus:text-kitch-charcoal"
        >
          <Link href="/settings">
            <Settings className="h-4 w-4" />
            Profile Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          asChild
          className="rounded-lg p-0 focus:bg-transparent"
        >
          <LogoutButton className="h-auto w-full justify-start gap-2 rounded-lg bg-transparent px-2.5 py-2 text-sm font-medium text-kitch-red shadow-none hover:bg-kitch-peach">
            <LogOut className="h-4 w-4" />
            Log out
          </LogoutButton>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
