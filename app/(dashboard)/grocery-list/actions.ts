"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export async function addGroceryItem(name: string) {
  const trimmed = name.trim();
  if (!trimmed) {
    return { ok: false as const, error: "Item name is required" };
  }

  const supabase = await createClient();
  const { data: claimsData, error: authError } = await supabase.auth.getClaims();
  if (authError || !claimsData?.claims) {
    return { ok: false as const, error: "Not authenticated" };
  }
  const userId = claimsData.claims.sub;

  const { data, error } = await supabase
    .from("grocery_list")
    .insert({ name: trimmed, user_id: userId })
    .select("id, name, checked, checked_at")
    .single();

  if (error || !data) {
    return { ok: false as const, error: error?.message ?? "Failed to add item" };
  }

  revalidatePath("/grocery-list");

  return { ok: true as const, item: data };
}

export async function setGroceryItemChecked(itemId: number, checked: boolean) {
  if (!Number.isInteger(itemId) || itemId <= 0) {
    return { ok: false as const, error: "Invalid item id" };
  }

  const supabase = await createClient();
  const { data: claimsData, error: authError } = await supabase.auth.getClaims();
  if (authError || !claimsData?.claims) {
    return { ok: false as const, error: "Not authenticated" };
  }
  const userId = claimsData.claims.sub;

  const { error } = await supabase
    .from("grocery_list")
    .update({ checked, checked_at: checked ? new Date().toISOString() : null })
    .eq("id", itemId)
    .eq("user_id", userId);

  if (error) {
    return { ok: false as const, error: error.message };
  }

  revalidatePath("/grocery-list");

  return { ok: true as const };
}

export async function deleteGroceryItem(itemId: number) {
  if (!Number.isInteger(itemId) || itemId <= 0) {
    return { ok: false as const, error: "Invalid item id" };
  }

  const supabase = await createClient();
  const { data: claimsData, error: authError } = await supabase.auth.getClaims();
  if (authError || !claimsData?.claims) {
    return { ok: false as const, error: "Not authenticated" };
  }
  const userId = claimsData.claims.sub;

  const { error } = await supabase
    .from("grocery_list")
    .delete()
    .eq("id", itemId)
    .eq("user_id", userId);

  if (error) {
    return { ok: false as const, error: error.message };
  }

  revalidatePath("/grocery-list");

  return { ok: true as const };
}

export async function clearCheckedGroceryItems() {
  const supabase = await createClient();
  const { data: claimsData, error: authError } = await supabase.auth.getClaims();
  if (authError || !claimsData?.claims) {
    return { ok: false as const, error: "Not authenticated" };
  }
  const userId = claimsData.claims.sub;

  const { error } = await supabase
    .from("grocery_list")
    .delete()
    .eq("user_id", userId)
    .eq("checked", true);

  if (error) {
    return { ok: false as const, error: error.message };
  }

  revalidatePath("/grocery-list");

  return { ok: true as const };
}

export async function clearActiveGroceryItems() {
  const supabase = await createClient();
  const { data: claimsData, error: authError } = await supabase.auth.getClaims();
  if (authError || !claimsData?.claims) {
    return { ok: false as const, error: "Not authenticated" };
  }
  const userId = claimsData.claims.sub;

  const { error } = await supabase
    .from("grocery_list")
    .delete()
    .eq("user_id", userId)
    .eq("checked", false);

  if (error) {
    return { ok: false as const, error: error.message };
  }

  revalidatePath("/grocery-list");

  return { ok: true as const };
}
