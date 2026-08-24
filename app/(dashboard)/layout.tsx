import { Suspense } from "react";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { CookbookSidebar } from "@/components/cookbooks/cookbook-sidebar";
import { CookbookTopbar } from "@/components/cookbooks/cookbook-topbar";

async function SidebarUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  const userId = data.claims.sub;
  const email = data.claims.email as string | undefined;

  const { data: profile } = await supabase
    .from("users")
    .select("display_name, profile_pic_url")
    .eq("id", userId)
    .maybeSingle();

  const displayName = profile?.display_name ?? email?.split("@")[0] ?? "there";

  return (
    <CookbookSidebar
      displayName={displayName}
      planLabel="Free Plan"
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
      <Suspense fallback={<div className="w-72 shrink-0 bg-kitch-cream-dark" />}>
        <SidebarUser />
      </Suspense>
      <div className="flex-1 overflow-y-auto">
        <div className="px-8 py-4">
          <CookbookTopbar />
        </div>
        <div className="border-b border-kitch-charcoal/10" />
        <div className="px-8 pb-8 pt-8">{children}</div>
      </div>
    </div>
  );
}
