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
  return (
    <main className="min-h-screen bg-kitch-cream text-kitch-charcoal">
      <HeroSection />
      <FeaturesSection />
      <PricingSection />
      <FaqSection />
      <Footer />
    </main>
  );
}
