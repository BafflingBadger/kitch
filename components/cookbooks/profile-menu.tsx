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

/** The profile row pinned to the bottom-left of the sidebar. */
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
    <div className="flex items-center gap-3">
      <Link href="/settings" aria-label="Settings" className="shrink-0">
        <Avatar
          displayName={displayName}
          avatarUrl={avatarUrl}
          sizeClassName="h-10 w-10"
        />
      </Link>
      <div className="min-w-0 flex-1">
        <Link
          href="/settings"
          className="block truncate text-sm font-semibold text-kitch-charcoal hover:underline"
        >
          {displayName}
        </Link>
        <Link
          href="/premium"
          className="block w-fit text-xs leading-tight text-kitch-grey hover:text-kitch-charcoal hover:underline"
        >
          {planLabel}
        </Link>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Account menu"
          className="rounded-md p-1 text-kitch-grey outline-none hover:text-kitch-charcoal focus-visible:text-kitch-charcoal"
        >
          <Settings className="h-4 w-4" />
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
              Settings
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
    </div>
  );
}
