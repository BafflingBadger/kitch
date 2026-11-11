"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  isNavItemActive,
  navItems,
  reloadToCookbooks,
} from "@/components/cookbooks/cookbook-sidebar";
import { cn } from "@/lib/utils";

/** The bottom navigation shown below `lg`, where the sidebar is hidden. */
export function MobileTabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-kitch-charcoal/10 bg-kitch-cream-dark/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      <div className="mx-auto grid max-w-xl grid-cols-4">
        {navItems.map((item) => {
          const isActive = isNavItemActive(item, pathname);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={item.href === "/cookbooks" ? reloadToCookbooks : undefined}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex flex-col items-center gap-1 px-1 pb-2 pt-2.5 text-[11px] font-medium",
                isActive ? "text-kitch-charcoal" : "text-kitch-grey",
              )}
            >
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-xl",
                  isActive
                    ? "bg-gradient-to-br from-kitch-orange-from to-kitch-orange-to text-white"
                    : "text-kitch-grey",
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className="truncate">{item.shortLabel ?? item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
