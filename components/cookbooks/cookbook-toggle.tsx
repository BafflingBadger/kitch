"use client";

import { useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

export function CookbookToggle({
  greeting,
  subtext,
  children,
}: {
  greeting: string;
  subtext: string;
  children: ReactNode;
}) {
  const [tab, setTab] = useState<"personal" | "following">("personal");

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-literata text-3xl font-semibold text-kitch-charcoal">
            {greeting}
          </h1>
          <p className="mt-2 text-sm text-kitch-grey">{subtext}</p>
        </div>
        <div className="inline-flex items-center rounded-full border border-kitch-charcoal/10 bg-kitch-cream-dark p-1">
          {(["personal", "following"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-medium capitalize transition-colors",
                tab === value
                  ? "bg-gradient-to-r from-kitch-orange-from to-kitch-orange-to text-white shadow-sm"
                  : "text-kitch-charcoal/70",
              )}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8">
        {tab === "personal" ? (
          children
        ) : (
          <p className="text-sm text-kitch-grey">
            Cookbooks from people you follow will show up here soon.
          </p>
        )}
      </div>
    </div>
  );
}
