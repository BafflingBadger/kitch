import { Suspense } from "react";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { CookbookSidebar } from "@/components/cookbooks/cookbook-sidebar";
import { NewRecipeButton } from "@/components/cookbooks/cookbook-topbar";
import { DashboardSearch } from "@/components/cookbooks/dashboard-search";
import { ProfileMenu } from "@/components/cookbooks/profile-menu";
import { getEntitlement } from "@/lib/subscription/entitlement";

async function TopbarProfile() {
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
    <ProfileMenu
      displayName={displayName}
      planLabel={entitlement.isPremium ? "Premium Plan" : "Free Plan"}
      avatarUrl={profile?.profile_pic_url ?? null}
    />
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-kitch-cream">
      {/* usePathname on a dynamic route counts as request data under Cache
          Components, so the sidebar still needs a boundary. */}
      <Suspense fallback={<div className="w-72 shrink-0 bg-kitch-cream-dark" />}>
        <CookbookSidebar />
      </Suspense>
      {/* A column so the page area below the topbar has a definite height. A
          page whose root has data-fill-screen (Meal Plan) gets exactly the
          remaining screen and scrolls inside itself; others grow as usual. */}
      <div className="flex flex-1 flex-col overflow-y-auto">
        {/* Equal side columns keep the search centred in the bar whatever
            the right-hand controls' width. */}
        <div className="grid grid-cols-[1fr_minmax(0,28rem)_1fr] items-center gap-4 px-8 py-4">
          <div />
          <DashboardSearch />
          <div className="flex items-center justify-end gap-4">
            {/* The profile reads the user row and New Recipe reads import
                quota, so both suspend; reserve their size to keep the page
                from jumping as they resolve. */}
            <Suspense fallback={<div className="h-[50px] w-[50px]" />}>
              <TopbarProfile />
            </Suspense>
            <Suspense fallback={<div className="h-10 w-[132px]" />}>
              <NewRecipeButton />
            </Suspense>
          </div>
        </div>
        <div className="border-b border-kitch-charcoal/10" />
        <div className="flex-1 px-8 pb-8 pt-8 has-[>[data-fill-screen]]:min-h-0">{children}</div>
      </div>
    </div>
  );
}
