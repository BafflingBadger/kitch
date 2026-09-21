"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, Download, FileText } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { SettingsSection } from "@/components/settings/settings-section";
import { SUPPORT_EMAIL } from "@/lib/support";

const ROWS: {
  label: string;
  icon?: LucideIcon;
  href?: string;
  /** Rendered where "Coming soon" would otherwise go. */
  detail?: string;
  /** Copies `detail` to the clipboard instead of navigating. */
  copy?: boolean;
}[] = [
  { label: "Terms of Service", icon: ChevronRight, href: "/legal/terms" },
  { label: "Privacy Policy", icon: ChevronRight, href: "/legal/privacy" },
  { label: "Download my data", icon: Download },
  { label: "Contact support", detail: SUPPORT_EMAIL, copy: true },
];

/**
 * Terms and Privacy link to the public legal pages, and Contact support copies
 * the address. Download my data has no destination yet and renders as plainly
 * inert -- looking clickable and doing nothing would be worse than saying so.
 */
export function LegalSupportSection() {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const handleCopy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      // Clipboard access can be refused outright (insecure origin, permissions).
      // The address is on screen either way, so there is nothing to recover --
      // just don't claim it was copied.
    }
  };

  return (
    <SettingsSection
      id="legal"
      icon={FileText}
      title="Legal & Support"
      description="Review our policies or reach out for help."
    >
      <ul className="flex flex-col">
        {ROWS.map(({ label, icon: Icon, href, detail, copy }, index) => {
          const rowClassName =
            index === 0
              ? "flex items-center justify-between gap-3 py-3.5"
              : "flex items-center justify-between gap-3 border-t border-kitch-charcoal/10 py-3.5";
          // These rows bleed 8px each side so the hover highlight extends past
          // the text, then pad the content back to the list's edge. The width
          // has to grow by both margins: `w-full` would pin it to 100% and let
          // the negative margins shift it left instead, and a <button> will not
          // stretch on its own the way the <a> rows do.
          const interactiveClassName = `${rowClassName} w-[calc(100%+1rem)] -mx-2 rounded-lg px-2 text-left transition-colors hover:bg-kitch-cream-dark`;

          if (copy && detail) {
            return (
              <li key={label}>
                <button
                  type="button"
                  onClick={() => handleCopy(detail)}
                  className={interactiveClassName}
                >
                  <span className="text-sm text-kitch-charcoal">{label}</span>
                  <span className="truncate text-sm text-kitch-grey">
                    {copied ? "Copied" : detail}
                  </span>
                </button>
              </li>
            );
          }

          if (href) {
            return (
              <li key={label}>
                <Link href={href} className={interactiveClassName}>
                  <span className="text-sm text-kitch-charcoal">{label}</span>
                  <span className="flex min-w-0 items-center gap-2">
                    {detail ? (
                      <span className="truncate text-sm text-kitch-grey">
                        {detail}
                      </span>
                    ) : null}
                    {Icon ? (
                      <Icon className="h-4 w-4 shrink-0 text-kitch-grey" />
                    ) : null}
                  </span>
                </Link>
              </li>
            );
          }

          return (
            <li key={label} className={rowClassName}>
              <span className="text-sm text-kitch-charcoal/50">{label}</span>
              <span className="flex items-center gap-2">
                <span className="text-xs font-medium uppercase tracking-wide text-kitch-grey/60">
                  Coming soon
                </span>
                {Icon ? <Icon className="h-4 w-4 text-kitch-grey/40" /> : null}
              </span>
            </li>
          );
        })}
      </ul>
    </SettingsSection>
  );
}
