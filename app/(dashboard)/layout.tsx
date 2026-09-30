import { Suspense } from "react";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { CookbookSidebar } from "@/components/cookbooks/cookbook-sidebar";
import { CookbookTopbar } from "@/components/cookbooks/cookbook-topbar";
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
      <div className="flex-1 overflow-y-auto">
        <div className="flex items-center justify-between gap-4 px-8 py-4">
          {/* The topbar reads import quota and the profile reads the user row,
              so both suspend; reserve their size to keep the page from jumping
              as they resolve. */}
          <Suspense fallback={<div className="h-[50px] flex-1" />}>
            <CookbookTopbar />
          </Suspense>
          <Suspense fallback={<div className="h-[50px] w-48" />}>
            <TopbarProfile />
          </Suspense>
        </div>
        <div className="border-b border-kitch-charcoal/10" />
        <div className="px-8 pb-8 pt-8">{children}</div>
      </div>
    </div>
  );
}
