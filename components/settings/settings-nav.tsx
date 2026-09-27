"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, FileText, ShieldCheck, Sparkles, User } from "lucide-react";

import { cn } from "@/lib/utils";

const SECTIONS = [
  { id: "profile", label: "Profile", icon: User, danger: false },
  { id: "premium", label: "Kitch Premium", icon: Sparkles, danger: false },
  { id: "account", label: "Account & Security", icon: ShieldCheck, danger: false },
  { id: "legal", label: "Legal & Support", icon: FileText, danger: false },
  { id: "danger", label: "Danger Zone", icon: AlertTriangle, danger: true },
] as const;

/** How far below the top of the viewport a heading counts as "current", in px. */
const ACTIVATION_LINE = 140;

/**
 * The dashboard scrolls an inner container rather than the window, and which
 * element that is should not be hard-coded to a layout class.
 */
function getScrollParent(element: HTMLElement): HTMLElement | null {
  let node = element.parentElement;
  while (node) {
    const { overflowY } = getComputedStyle(node);
    if (
      (overflowY === "auto" || overflowY === "scroll") &&
      node.scrollHeight > node.clientHeight
    ) {
      return node;
    }
    node = node.parentElement;
  }
  return null;
}

export function SettingsNav() {
  const [activeId, setActiveId] = useState<string>(SECTIONS[0].id);

  useEffect(() => {
    const entries = SECTIONS.map((section) => ({
      id: section.id as string,
      element: document.getElementById(section.id),
    })).filter(
      (entry): entry is { id: string; element: HTMLElement } =>
        entry.element !== null,
    );

    if (!entries.length) return;

    const scroller = getScrollParent(entries[0].element);
    const target: HTMLElement | Window = scroller ?? window;

    const update = () => {
      // The last section is short and sits at the bottom, so its top never
      // reaches the line above -- without this it could never become current.
      if (
        scroller &&
        scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 4
      ) {
        setActiveId(entries[entries.length - 1].id);
        return;
      }

      // Current section = the last one whose top has crossed the line.
      let current = entries[0].id;
      for (const entry of entries) {
        if (entry.element.getBoundingClientRect().top <= ACTIVATION_LINE) {
          current = entry.id;
        }
      }
      setActiveId(current);
    };

    update();
    target.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);

    return () => {
      target.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <nav className="flex flex-col gap-1" aria-label="Settings sections">
      {SECTIONS.map(({ id, label, icon: Icon, danger }) => {
        const isActive = activeId === id;

        return (
          <a
            key={id}
            href={`#${id}`}
            onClick={(event) => {
              // Let the anchor stay in the URL bar, but scroll smoothly rather
              // than jumping.
              event.preventDefault();
              document
                .getElementById(id)
                ?.scrollIntoView({ behavior: "smooth", block: "start" });
              setActiveId(id);
            }}
            aria-current={isActive ? "true" : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors",
              danger ? "text-kitch-red" : "text-kitch-charcoal",
              isActive
                ? danger
                  ? "bg-kitch-peach"
                  : "border border-kitch-charcoal/10 bg-white shadow-sm"
                : "hover:bg-kitch-cream-dark",
              // Keep the inactive rows the same height as the bordered active one.
              isActive && !danger ? "" : "border border-transparent",
            )}
          >
            <Icon
              className={cn(
                "h-4 w-4 shrink-0",
                danger ? "text-kitch-red" : "text-kitch-grey",
              )}
            />
            {label}
          </a>
        );
      })}
    </nav>
  );
}
