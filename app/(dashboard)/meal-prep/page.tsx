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
import { MEAL_TYPES, type MealPlanType } from "@/lib/meal-plan/constants";
import { scaleMacros, sumMacros } from "@/lib/meal-plan/macros";
import { getEntitlement } from "@/lib/subscription/entitlement";
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
  servings: number;
  recipes: {
    id: number;
    name: string;
    thumbnail: string | null;
    calories: number;
    protein_g: number;
    fat_g: number;
    carbs_g: number;
  } | null;
};

/** Breakfast, lunch, dinner, snack; then oldest first within a meal. */
function compareEntries(
  a: { entry: MealPlanEntryItem; createdAt: string },
  b: { entry: MealPlanEntryItem; createdAt: string },
) {
  return (
    MEAL_TYPES.indexOf(a.entry.type) - MEAL_TYPES.indexOf(b.entry.type) ||
    a.createdAt.localeCompare(b.createdAt)
  );
}

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

  const [{ data: rows }, { data: foodRows }, entitlement] = await Promise.all([
    supabase
      .from("mealplan_recipe_mapping")
      .select(
        "id, date, type, recipe_id, servings, created_at, recipes(id, name, thumbnail, calories, protein_g, fat_g, carbs_g)",
      )
      .eq("user_id", userId)
      .gte("date", startDateStr)
      .lte("date", endDateStr),
    supabase
      .from("mealplan_food_entries")
      .select("id, date, type, name, serving, calories, protein_g, fat_g, carbs_g, created_at")
      .eq("user_id", userId)
      .gte("date", startDateStr)
      .lte("date", endDateStr),
    getEntitlement(),
  ]);

  const entriesByDate = new Map<string, { entry: MealPlanEntryItem; createdAt: string }[]>();
  const pushEntry = (date: string, entry: MealPlanEntryItem, createdAt: string) => {
    const list = entriesByDate.get(date) ?? [];
    list.push({ entry, createdAt });
    entriesByDate.set(date, list);
  };
  for (const row of (rows ?? []) as (MealPlanRow & { created_at: string })[]) {
    if (!row.recipes) continue;
    pushEntry(
      row.date,
      {
        kind: "recipe",
        id: row.id,
        recipeId: row.recipes.id,
        recipeName: row.recipes.name,
        imageUrl: recipeThumbnailUrl(row.recipes.thumbnail),
        type: row.type,
        servings: Number(row.servings),
        perServing: {
          calories: row.recipes.calories,
          proteinG: Number(row.recipes.protein_g),
          fatG: Number(row.recipes.fat_g),
          carbsG: Number(row.recipes.carbs_g),
        },
      },
      row.created_at,
    );
  }
  for (const row of foodRows ?? []) {
    pushEntry(
      row.date,
      {
        kind: "food",
        id: row.id,
        type: row.type,
        name: row.name,
        serving: row.serving,
        calories: row.calories,
        proteinG: Number(row.protein_g),
        fatG: Number(row.fat_g),
        carbsG: Number(row.carbs_g),
      },
      row.created_at,
    );
  }

  const days: MealPlanDay[] = weekDates.map((date) => {
    const dateStr = toISODate(date);
    const { weekday, day, month } = formatDayHeader(date);
    const entries = (entriesByDate.get(dateStr) ?? []).sort(compareEntries).map((e) => e.entry);
    const macros = entries.map((entry) =>
      entry.kind === "food" ? entry : scaleMacros(entry.perServing, entry.servings),
    );
    return {
      dateStr,
      weekday,
      dayNumber: day,
      monthLabel: month,
      isToday: isSameLocalDate(date, today),
      entries,
      totals: sumMacros(macros),
    };
  });

  const prevHref = `/meal-prep?week=${toISODate(addDays(monday, -7))}`;
  const nextHref = `/meal-prep?week=${toISODate(addDays(monday, 7))}`;

  return (
    // Fills the screen below the topbar so each day scrolls its own meals; the
    // min height keeps days usable on short windows, where the page scrolls.
    <div data-fill-screen className="flex h-full min-h-[560px] flex-col">
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
      <div className="mt-6 min-h-0 flex-1">
        <WeekGrid days={days} isPremium={entitlement.isPremium} />
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
