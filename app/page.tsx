import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { DEFAULT_AUTH_REDIRECT } from "@/lib/auth/redirect";

/**
 * The app has no marketing page of its own -- that lives on the main site -- so
 * "/" just routes people to wherever they should actually be.
 *
 * The proxy lets "/" through without a session precisely so this can decide.
 */
export default async function Home() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  redirect(data?.claims ? DEFAULT_AUTH_REDIRECT : "/auth/login");
}
