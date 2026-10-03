import type { Metadata } from "next";

import { FaqSection } from "@/components/landing/faq-section";
import { FeaturesSection } from "@/components/landing/features-section";
import { Footer } from "@/components/landing/footer";
import { HeroSection } from "@/components/landing/hero-section";
import { PricingSection } from "@/components/landing/pricing-section";

export const metadata: Metadata = {
  title: "Kitch - Your Recipes. All in One Place.",
  description:
    "Import recipes from Instagram, TikTok, and blogs. Create cookbooks, plan meals, and generate grocery lists. The ultimate recipe app for home cooks.",
};

/**
 * The public landing page. Signed-in visitors never see it -- the proxy
 * (lib/supabase/proxy.ts) sends them to the dashboard -- so it must not read the
 * session itself: request data at the top level of a page fails the Cache
 * Components prerender.
 */
export default function LandingPage() {
  // The page is always light, but next-themes sets `color-scheme: dark` on
  // <html> for dark-mode devices, which makes Chrome paint autofilled fields
  // gray with white text. Pin the scheme back to light for the whole page.
  return (
    <main className="min-h-screen bg-kitch-cream text-kitch-charcoal [color-scheme:light]">
      <HeroSection />
      <FeaturesSection />
      <PricingSection />
      <FaqSection />
      <Footer />
    </main>
  );
}
