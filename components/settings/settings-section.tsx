import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Card shell shared by every block on the settings page: coral icon tile,
 * heading, description, then the section's own content.
 */
export function SettingsSection({
  id,
  icon: Icon,
  title,
  description,
  tone = "default",
  divided = true,
  children,
}: {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  tone?: "default" | "danger";
  /** Profile runs its content straight under the header; the rest rule it off. */
  divided?: boolean;
  children: React.ReactNode;
}) {
  const danger = tone === "danger";

  return (
    <section
      id={id}
      // The dashboard's scroll container, not the window, is what scrolls here --
      // scroll-margin keeps a jumped-to heading clear of the top edge.
      className={cn(
        "scroll-mt-6 rounded-3xl border bg-white p-6 sm:p-7",
        danger ? "border-kitch-red/25" : "border-kitch-charcoal/10",
      )}
    >
      <div className="flex items-start gap-4">
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            danger
              ? "bg-kitch-peach text-kitch-red"
              : "bg-gradient-to-br from-kitch-orange-from to-kitch-orange-to text-white",
          )}
        >
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h2
            className={cn(
              "font-literata text-2xl font-semibold",
              danger ? "text-kitch-red" : "text-kitch-charcoal",
            )}
          >
            {title}
          </h2>
          <p className="mt-1 text-sm text-kitch-grey">{description}</p>
        </div>
      </div>

      <div
        className={cn(
          "mt-6",
          divided && "border-t border-kitch-charcoal/10 pt-6",
        )}
      >
        {children}
      </div>
    </section>
  );
}

/** Uppercase field label used throughout the page. */
export function SettingsLabel({
  htmlFor,
  children,
  className,
}: {
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn(
        "text-xs font-semibold uppercase tracking-wide text-kitch-grey",
        className,
      )}
    >
      {children}
    </label>
  );
}
