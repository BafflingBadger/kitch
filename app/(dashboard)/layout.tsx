import { Suspense } from "react";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { CookbookSidebar } from "@/components/cookbooks/cookbook-sidebar";
import { CookbookTopbar } from "@/components/cookbooks/cookbook-topbar";
import { getEntitlement } from "@/lib/subscription/entitlement";
import { PLANS } from "@/lib/subscription/plans";

async function SidebarUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  const userId = data.claims.sub;
  const email = data.claims.email as string | undefined;

  const [{ data: profile }, entitlement] = await Promise.all([
    supabase
      .from("users")
      .select("display_name, profile_pic_url")
      .eq("id", userId)
      .maybeSingle(),
    getEntitlement(),
  ]);

  const displayName = profile?.display_name ?? email?.split("@")[0] ?? "there";

  return (
    <CookbookSidebar
      displayName={displayName}
      planLabel={planLabelFor(entitlement.plan, entitlement.isPremium)}
      avatarUrl={profile?.profile_pic_url ?? null}
    />
  );
}

/** e.g. "Premium · Annual", or "Free Plan" for everyone else. */
function planLabelFor(plan: string | null, isPremium: boolean): string {
  if (!isPremium) return "Free Plan";
  if (plan && plan in PLANS) {
    return `Premium · ${PLANS[plan as keyof typeof PLANS].name}`;
  }
  return "Premium";
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-kitch-cream">
      <Suspense fallback={<div className="w-72 shrink-0 bg-kitch-cream-dark" />}>
        <SidebarUser />
      </Suspense>
      <div className="flex-1 overflow-y-auto">
        <div className="px-8 py-4">
          {/* The topbar reads import quota, so it suspends; reserve its height
              to keep the page from jumping as it resolves. */}
          <Suspense fallback={<div className="h-[42px]" />}>
            <CookbookTopbar />
          </Suspense>
        </div>
        <div className="border-b border-kitch-charcoal/10" />
        <div className="px-8 pb-8 pt-8">{children}</div>
      </div>
    </div>
  );
}
