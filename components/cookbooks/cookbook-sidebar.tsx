"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Calendar,
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
import { LogoutButton } from "@/components/logout-button";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/cookbooks", label: "Cookbooks", icon: BookOpen, activePrefixes: ["/recipes"] },
  { href: "/meal-prep", label: "Meal Plan", icon: Calendar },
  { href: "/grocery-list", label: "Grocery List", icon: ShoppingCart },
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
  const initials =
    displayName
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?";

  return (
    <aside className="flex h-screen w-72 shrink-0 flex-col justify-between border-r border-kitch-charcoal/10 bg-kitch-cream-dark p-6">
      <div>
        <div className="flex items-center gap-2">
          <Image
            src="/logo.png"
            alt="Kitch"
            width={42}
            height={34}
            className="object-contain"
          />
          <span className="font-literata text-3xl font-bold text-kitch-red">
            Kitch
          </span>
        </div>
        <p style={{ marginLeft: "3.1rem" }} className="-mt-1 text-xs text-kitch-grey">
          Cooking made easy
        </p>

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
                  "flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-gradient-to-r from-kitch-orange-from to-kitch-orange-to text-white shadow-sm"
                    : "text-kitch-charcoal/80 hover:bg-kitch-cream",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex items-center gap-3 border-t border-kitch-charcoal/10 pt-4">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt={displayName}
            className="h-9 w-9 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-kitch-peach text-sm font-semibold text-kitch-peach-foreground">
            {initials}
          </span>
        )}
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
