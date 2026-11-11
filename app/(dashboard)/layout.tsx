import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { CookbookSidebar } from "@/components/cookbooks/cookbook-sidebar";
import { NewRecipeButton } from "@/components/cookbooks/cookbook-topbar";
import { DashboardSearch } from "@/components/cookbooks/dashboard-search";
import { MobileTabBar } from "@/components/cookbooks/mobile-tab-bar";
import { ProfileMenu } from "@/components/cookbooks/profile-menu";
import { getEntitlement } from "@/lib/subscription/entitlement";

async function SidebarProfile({
  variant = "full",
}: {
  variant?: "full" | "compact";
}) {
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
      variant={variant}
    />
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-dvh overflow-hidden bg-kitch-cream">
      {/* usePathname on a dynamic route counts as request data under Cache
          Components, so the sidebar still needs a boundary. */}
      <Suspense fallback={<div className="hidden w-72 shrink-0 bg-kitch-cream-dark lg:block" />}>
        <CookbookSidebar
          profile={
            // The profile reads the user row, so it suspends on its own;
            // reserve its height so the sidebar doesn't jump.
            <Suspense fallback={<div className="h-10" />}>
              <SidebarProfile />
            </Suspense>
          }
        />
      </Suspense>
      {/* A column so the page area below the topbar has a definite height. A
          page whose root has data-fill-screen (Meal Plan) gets exactly the
          remaining screen and scrolls inside itself; others grow as usual. */}
      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        {/* Below lg the sidebar is hidden, so the bar carries the logo and the
            avatar too. From lg, equal side columns keep the search centred in
            the bar whatever the right-hand controls' width. */}
        <div className="flex items-center gap-3 px-4 py-3 sm:px-6 lg:grid lg:grid-cols-[1fr_minmax(0,28rem)_1fr] lg:gap-4 lg:px-8 lg:py-4">
          <div className="shrink-0 lg:hidden">
            <Link href="/cookbooks" aria-label="Kitch home">
              <Image
                src="/logo.png"
                alt="Kitch"
                width={45}
                height={36}
                className="h-9 w-auto object-contain"
              />
            </Link>
          </div>
          <div className="hidden lg:block" />
          <div className="min-w-0 flex-1">
            <DashboardSearch />
          </div>
          <div className="flex shrink-0 items-center justify-end gap-3 lg:gap-4">
            {/* New Recipe reads import quota, so it suspends; reserve its
                size to keep the page from jumping as it resolves. */}
            <Suspense fallback={<div className="h-10 w-10 sm:w-[132px]" />}>
              <NewRecipeButton />
            </Suspense>
            <div className="flex lg:hidden">
              <Suspense fallback={<div className="h-10 w-10" />}>
                <SidebarProfile variant="compact" />
              </Suspense>
            </div>
          </div>
        </div>
        <div className="border-b border-kitch-charcoal/10" />
        {/* The bottom padding clears the phone tab bar. */}
        <div className="flex-1 px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-6 sm:px-6 lg:px-8 lg:pb-8 lg:pt-8 has-[>[data-fill-screen]]:min-h-0">
          {children}
        </div>
      </div>
      <Suspense fallback={null}>
        <MobileTabBar />
      </Suspense>
    </div>
  );
}
