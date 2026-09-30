"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Calendar,
  Compass,
  Settings,
  ShoppingCart,
} from "lucide-react";

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

// Sits apart from the others, pinned to the bottom of the sidebar.
const settingsItem = { href: "/settings", label: "Settings", icon: Settings };

type NavItem = {
  href: string;
  label: string;
  icon: typeof BookOpen;
  activePrefixes?: string[];
};

export function CookbookSidebar() {
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
          // Gap is ~1/3 of the 36px wordmark.
          className="flex items-center gap-3"
        >
          {/* Sized off the wordmark: `text-4xl` is 36px, so the hat is 43px
              tall (1.2x). Its 1847x1474 source makes that 54px wide -- height
              is what's fixed, width follows. */}
          <Image
            src="/logo.png"
            alt="Kitch"
            width={54}
            height={43}
            className="h-[43px] w-auto object-contain"
          />
          <span className="font-literata text-4xl font-semibold leading-tight text-kitch-charcoal">
            Kitch
          </span>
        </Link>

        <nav className="mt-20 flex flex-col gap-1">
          {navItems.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} />
          ))}
        </nav>
      </div>

      <div className="border-t border-kitch-charcoal/10 pt-4">
        <nav className="flex flex-col gap-1">
          <NavLink item={settingsItem} pathname={pathname} />
        </nav>
      </div>
    </aside>
  );
}

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const isActive =
    pathname === item.href ||
    pathname.startsWith(`${item.href}/`) ||
    item.activePrefixes?.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    );
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 rounded-2xl border px-3 py-2 text-[15px] transition-colors",
        isActive
          ? "border-black/10 border-b-black/15 bg-white bg-clip-padding text-kitch-charcoal shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
          : "border-transparent text-kitch-grey hover:bg-white/60",
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
}
