"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Calendar,
  Compass,
  LogOut,
  MoreVertical,
  Settings,
  ShoppingCart,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar } from "@/components/ui/avatar";
import { LogoutButton } from "@/components/logout-button";
import { cn } from "@/lib/utils";

const navItems = [
  {
    href: "/cookbooks",
    label: "Recipes",
    icon: BookOpen,
    activePrefixes: ["/recipes", "/users"],
  },
  { href: "/meal-prep", label: "Meal Plan", icon: Calendar },
  { href: "/grocery-list", label: "Grocery List", icon: ShoppingCart },
  { href: "/discover", label: "Discover", icon: Compass },
];

export function CookbookSidebar({
  displayName,
  planLabel,
  avatarUrl,
}: {
  displayName: string;
  planLabel: string;
  avatarUrl?: string | null;
}) {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-72 shrink-0 flex-col justify-between border-r border-kitch-charcoal/10 bg-kitch-cream-dark p-6">
      <div>
        <Link
          href="/cookbooks"
          onClick={(event) => {
            // Personal/Following is local component state, not part of the URL. Next's
            // client-side router cache can keep a previously-visited /cookbooks page
            // instance alive (still on Following) even when navigating in from another
            // route, so a normal Link transition doesn't reliably land on Personal —
            // force a full reload so the page always remounts fresh there.
            event.preventDefault();
            window.location.href = "/cookbooks";
          }}
          className="flex items-center gap-2"
        >
          <Image
            src="/logo.png"
            alt="Kitch"
            width={42}
            height={34}
            className="h-[44px] w-auto object-contain"
          />
          <div>
            <span className="font-literata text-3xl font-bold leading-tight text-[#B23E34]">
              Kitch
            </span>
            <p className="-mt-1 text-xs text-kitch-grey">Cooking made easy</p>
          </div>
        </Link>

        <nav className="mt-8 flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              pathname.startsWith(`${item.href}/`) ||
              item.activePrefixes?.some(
                (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
              );
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-semibold transition-colors",
                  isActive
                    ? "bg-white text-kitch-charcoal shadow-[0_2px_6px_rgba(0,0,0,0.1)]"
                    : "text-kitch-grey hover:bg-white/60",
                )}
              >
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                    isActive
                      ? "bg-gradient-to-br from-kitch-orange-from to-kitch-orange-to text-white"
                      : "bg-kitch-charcoal/5 text-kitch-grey",
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex items-center gap-3 border-t border-kitch-charcoal/10 pt-4">
        <Avatar displayName={displayName} avatarUrl={avatarUrl} sizeClassName="h-9 w-9" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-kitch-charcoal">
            {displayName}
          </p>
          <p className="text-xs text-kitch-grey">{planLabel}</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger className="text-kitch-grey hover:text-kitch-charcoal">
            <MoreVertical className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-44 rounded-xl border border-kitch-charcoal/10 bg-white p-1.5 text-kitch-charcoal shadow-lg"
          >
            <DropdownMenuItem asChild className="rounded-lg p-0 focus:bg-transparent">
              <Link
                href="/settings"
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium text-kitch-charcoal transition-colors hover:bg-kitch-cream-dark"
              >
                <Settings className="h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="rounded-lg p-0 focus:bg-transparent">
              <LogoutButton className="h-auto w-full justify-start gap-2 rounded-lg bg-transparent px-2.5 py-2 text-sm font-medium text-kitch-red shadow-none hover:bg-kitch-peach">
                <LogOut className="h-4 w-4" />
                Log out
              </LogoutButton>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
