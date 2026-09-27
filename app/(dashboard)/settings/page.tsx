import { Suspense } from "react";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { SettingsNav } from "@/components/settings/settings-nav";
import { ProfileSection } from "@/components/settings/profile-section";
import { PremiumSection } from "@/components/settings/premium-section";
import { AccountSecuritySection } from "@/components/settings/account-security-section";
import { LegalSupportSection } from "@/components/settings/legal-support-section";
import { DangerZoneSection } from "@/components/settings/danger-zone-section";
import { getEntitlement, getImportUsage } from "@/lib/subscription/entitlement";
import { fetchBillingDetails } from "@/lib/subscription/billing";

async function SettingsContent() {
  const supabase = await createClient();
  const { data: claimsData, error: authError } = await supabase.auth.getClaims();
  if (authError || !claimsData?.claims) {
    redirect("/auth/login");
  }
  const userId = claimsData.claims.sub;

  // `getUser()` in addition to the claims above: claims carry no `identities`,
  // and the password block needs to know whether this account has a password at
  // all. It changes the wording only -- the write path is the same either way.
  const [{ data: profile }, { data: userData }, entitlement, usage, billing] =
    await Promise.all([
      supabase
        .from("users")
        .select("display_name, username, profile_pic_url, email")
        .eq("id", userId)
        .maybeSingle(),
      supabase.auth.getUser(),
      getEntitlement(),
      getImportUsage(),
      fetchBillingDetails(),
    ]);

  const claimEmail = claimsData.claims.email as string | undefined;
  const email = userData.user?.email ?? profile?.email ?? claimEmail ?? "";

  // Asks the database directly rather than inferring from identities: unlinking
  // an `email` identity leaves the password in place, and setting a password
  // does not create one, so identities say nothing reliable about this.
  const { data: hasPasswordResult } = await supabase.rpc(
    "current_user_has_password",
  );
  const hasPassword = hasPasswordResult ?? true;

  return (
    <div>
      <h1 className="font-literata text-4xl font-semibold text-kitch-charcoal">
        Settings
      </h1>
      <p className="mt-2 text-sm text-kitch-grey">
        Manage your profile, account, and preferences.
      </p>

      <div className="mt-8 flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="lg:sticky lg:top-6 lg:w-56 lg:shrink-0">
          <SettingsNav />
        </div>

        {/* Capped so the cards stay readable on a wide display -- a form field
            or a row of billing facts stretched across 1200px is hard to scan. */}
        <div className="flex min-w-0 max-w-[800px] flex-1 flex-col gap-6">
          <ProfileSection
            initialDisplayName={profile?.display_name ?? ""}
            initialUsername={profile?.username ?? ""}
            initialAvatarUrl={profile?.profile_pic_url ?? null}
          />
          <PremiumSection
            entitlement={entitlement}
            usage={{ used: usage.used, limit: usage.limit }}
            billing={billing}
          />
          <AccountSecuritySection email={email} hasPassword={hasPassword} />
          <LegalSupportSection />
          <DangerZoneSection username={profile?.username ?? ""} email={email} />
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="text-sm text-kitch-grey">Loading…</div>}>
      <SettingsContent />
    </Suspense>
  );
}
