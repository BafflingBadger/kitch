import { Suspense } from "react";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import {
  addDays,
  formatDayHeader,
  formatWeekRangeLabel,
  fromISODate,
  getWeekDates,
  isSameLocalDate,
  startOfWeekMonday,
  toISODate,
} from "@/lib/meal-plan/date-utils";
import type { MealPlanType } from "@/lib/meal-plan/constants";
import { WeekNavigator } from "@/components/meal-plan/week-navigator";
import { WeekGrid, type MealPlanDay, type MealPlanEntryItem } from "@/components/meal-plan/week-grid";

function recipeThumbnailUrl(path: string | null | undefined) {
  if (!path) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/recipes/${path}`;
}

type MealPlanRow = {
  id: number;
  date: string;
  type: MealPlanType;
  recipe_id: number;
  recipes: { id: number; name: string; thumbnail: string | null } | null;
};

async function MealPrepContent({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week } = await searchParams;

  const supabase = await createClient();
  const { data: claimsData, error: authError } = await supabase.auth.getClaims();
  if (authError || !claimsData?.claims) {
    redirect("/auth/login");
  }
  const userId = claimsData.claims.sub;

  const requested = week ? fromISODate(week) : new Date();
  const monday = startOfWeekMonday(Number.isNaN(requested.getTime()) ? new Date() : requested);
  const weekDates = getWeekDates(monday);
  const startDateStr = toISODate(weekDates[0]);
  const endDateStr = toISODate(weekDates[6]);
  const today = new Date();

  const { data: rows } = await supabase
    .from("mealplan_recipe_mapping")
    .select("id, date, type, recipe_id, recipes(id, name, thumbnail)")
    .eq("user_id", userId)
    .gte("date", startDateStr)
    .lte("date", endDateStr)
    .order("date", { ascending: true })
    .order("type", { ascending: true });

  const entriesByDate = new Map<string, MealPlanEntryItem[]>();
  for (const row of (rows ?? []) as MealPlanRow[]) {
    if (!row.recipes) continue;
    const list = entriesByDate.get(row.date) ?? [];
    list.push({
      id: row.id,
      recipeId: row.recipes.id,
      recipeName: row.recipes.name,
      imageUrl: recipeThumbnailUrl(row.recipes.thumbnail),
      type: row.type,
    });
    entriesByDate.set(row.date, list);
  }

  const days: MealPlanDay[] = weekDates.map((date) => {
    const dateStr = toISODate(date);
    const { weekday, day, month } = formatDayHeader(date);
    return {
      dateStr,
      weekday,
      dayNumber: day,
      monthLabel: month,
      isToday: isSameLocalDate(date, today),
      entries: entriesByDate.get(dateStr) ?? [],
    };
  });

  const prevHref = `/meal-prep?week=${toISODate(addDays(monday, -7))}`;
  const nextHref = `/meal-prep?week=${toISODate(addDays(monday, 7))}`;

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-literata text-4xl font-semibold text-kitch-charcoal">Meal Plan</h1>
          <p className="mt-2 text-sm text-kitch-grey">
            Plan out your breakfasts, lunches, dinners, and snacks for the week.
          </p>
        </div>
        <WeekNavigator
          weekLabel={formatWeekRangeLabel(weekDates[0], weekDates[6])}
          prevHref={prevHref}
          nextHref={nextHref}
        />
      </div>
      <div className="mt-6">
        <WeekGrid days={days} />
      </div>
    </div>
  );
}

export default function MealPrepPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  return (
    <Suspense fallback={<div className="text-sm text-kitch-grey">Loading…</div>}>
      <MealPrepContent searchParams={searchParams} />
    </Suspense>
  );
}
