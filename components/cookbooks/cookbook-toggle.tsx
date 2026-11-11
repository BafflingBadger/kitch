"use client";

import { useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

export function CookbookToggle({
  greeting,
  subtext,
  children,
  followingContent,
}: {
  greeting: string;
  subtext: string;
  children: ReactNode;
  followingContent: ReactNode;
}) {
  const [tab, setTab] = useState<"personal" | "following">("personal");

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-literata text-2xl sm:text-3xl font-semibold text-kitch-charcoal">
            {greeting}
          </h1>
          <p className="mt-2 text-sm text-kitch-grey">{subtext}</p>
        </div>
        <div className="inline-flex w-fit shrink-0 items-center rounded-full border border-kitch-charcoal/10 bg-kitch-cream-dark p-1">
          {(["personal", "following"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              className={cn(
                "rounded-full border px-4 py-1.5 text-sm font-medium capitalize transition-colors",
                tab === value
                  ? "border-kitch-charcoal/10 bg-white text-kitch-charcoal shadow-[0_1px_2px_rgba(0,0,0,0.08)]"
                  : "border-transparent text-kitch-grey hover:text-kitch-charcoal",
              )}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 sm:mt-8">{tab === "personal" ? children : followingContent}</div>
    </div>
  );
}
