"use client";

import Link from "next/link";
import { ChevronDown, LogOut, Settings } from "lucide-react";

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
      <DropdownMenuTrigger className="flex shrink-0 items-center gap-3 rounded-2xl border border-kitch-charcoal/15 bg-white py-1.5 pl-2 pr-3 text-left shadow-[0_1px_2px_rgba(0,0,0,0.06)] outline-none">
        <Avatar
          displayName={displayName}
          avatarUrl={avatarUrl}
          sizeClassName="h-9 w-9"
          className="rounded-xl"
        />
        <div className="min-w-0">
          <p className="max-w-40 truncate text-sm font-semibold text-kitch-charcoal">
            {displayName}
          </p>
          <p className="text-xs text-kitch-grey">{planLabel}</p>
        </div>
        <ChevronDown className="ml-2 h-4 w-4 text-kitch-grey" />
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
