import { redirect } from "next/navigation";

/**
 * The app has no marketing page of its own -- that lives on the main site -- so
 * "/" just routes people to wherever they should actually be.
 *
 * The real decision is made in the proxy (lib/supabase/proxy.ts), which sends
 * signed-in users to the dashboard. This page only runs if the proxy is skipped
 * (no Supabase env configured), and it must not read the session itself:
 * request data at the top level of a page fails the Cache Components prerender.
 */
export default function Home() {
  redirect("/auth/login");
}
