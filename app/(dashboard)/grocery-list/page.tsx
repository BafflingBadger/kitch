import { Suspense } from "react";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { GroceryList, type GroceryItem } from "@/components/grocery-list/grocery-list";

async function GroceryListContent() {
  const supabase = await createClient();
  const { data: claimsData, error: authError } = await supabase.auth.getClaims();
  if (authError || !claimsData?.claims) {
    redirect("/auth/login");
  }
  const userId = claimsData.claims.sub;

  const { data: rows } = await supabase
    .from("grocery_list")
    .select("id, name, checked, checked_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  const items: GroceryItem[] = (rows ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    checked: row.checked,
    checkedAt: row.checked_at,
  }));

  return (
    <div>
      <h1 className="font-literata text-4xl font-semibold text-kitch-charcoal">
        Grocery List
      </h1>
      <p className="mt-2 text-sm text-kitch-grey">
        Keep track of everything you need for your next grocery run.
      </p>
      <div className="mt-8">
        <GroceryList initialItems={items} />
      </div>
    </div>
  );
}

export default function GroceryListPage() {
  return (
    <Suspense fallback={<div className="text-sm text-kitch-grey">Loading…</div>}>
      <GroceryListContent />
    </Suspense>
  );
}
