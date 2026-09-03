"use client";

import { useState } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  addMonths,
  formatLongDateLabel,
  formatMonthYearLabel,
  fromISODate,
  getCalendarGridDates,
  isSameLocalDate,
  toISODate,
} from "@/lib/meal-plan/date-utils";
import { cn } from "@/lib/utils";

const WEEKDAY_INITIALS = ["M", "T", "W", "T", "F", "S", "S"];

export function DatePickerDropdown({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const selectedDate = fromISODate(value);
  const [viewMonth, setViewMonth] = useState(
    () => new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1),
  );

  const today = new Date();
  const gridDates = getCalendarGridDates(viewMonth);

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (open) {
          setViewMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
        }
      }}
    >
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex h-9 w-full items-center justify-between rounded-md border border-kitch-charcoal/15 bg-white px-3 text-sm text-kitch-charcoal shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          {formatLongDateLabel(selectedDate)}
          <Calendar className="h-4 w-4 shrink-0 text-kitch-grey" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-64 rounded-xl border border-kitch-charcoal/10 bg-white p-3 text-kitch-charcoal shadow-lg"
      >
        <div className="mb-2 flex items-center justify-between">
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              setViewMonth((m) => addMonths(m, -1));
            }}
            aria-label="Previous month"
            className="flex h-7 w-7 items-center justify-center rounded-full text-kitch-charcoal transition-colors hover:bg-kitch-cream-dark"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-semibold text-kitch-charcoal">
            {formatMonthYearLabel(viewMonth)}
          </span>
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              setViewMonth((m) => addMonths(m, 1));
            }}
            aria-label="Next month"
            className="flex h-7 w-7 items-center justify-center rounded-full text-kitch-charcoal transition-colors hover:bg-kitch-cream-dark"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {WEEKDAY_INITIALS.map((label, i) => (
            <span
              key={i}
              className="flex h-7 items-center justify-center text-[11px] font-medium text-kitch-grey"
            >
              {label}
            </span>
          ))}
          {gridDates.map((date) => {
            const inMonth = date.getMonth() === viewMonth.getMonth();
            const isSelected = isSameLocalDate(date, selectedDate);
            const isToday = isSameLocalDate(date, today);
            return (
              <DropdownMenuItem
                key={toISODate(date)}
                onSelect={() => onChange(toISODate(date))}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full p-0 text-sm focus:bg-kitch-cream-dark",
                  !inMonth && "text-kitch-charcoal/30",
                  inMonth && !isSelected && "text-kitch-charcoal",
                  isToday && !isSelected && "font-semibold text-kitch-red",
                  isSelected &&
                    "bg-gradient-to-r from-kitch-orange-from to-kitch-orange-to font-semibold text-white focus:bg-kitch-orange-to",
                )}
              >
                {date.getDate()}
              </DropdownMenuItem>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
