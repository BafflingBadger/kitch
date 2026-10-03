"use client";

import { motion } from "framer-motion";
import { BookOpen, Calendar, Download, ShoppingCart, Users } from "lucide-react";

import { IPhoneMockup } from "./iphone-mockup";

const features = [
  {
    icon: Download,
    title: "Import From Anywhere",
    description: "Save recipes from Instagram, TikTok, Facebook, or any website with a single tap.",
    screen: "recipes" as const,
  },
  {
    icon: Users,
    title: "Follow Friends",
    description:
      "Connect with friends and family. See what they're saving from social media and share your favorite recipes.",
    screen: "social" as const,
  },
  {
    icon: BookOpen,
    title: "Create Cookbooks",
    description: "Organize your recipes into beautiful digital cookbooks. Create collections for any occasion.",
    screen: "cookbook" as const,
  },
  {
    icon: Calendar,
    title: "Plan Your Meals",
    description:
      "Create your weekly meal plan. Share it with family and friends. Never wonder what's for dinner again.",
    screen: "mealplan" as const,
  },
  {
    icon: ShoppingCart,
    title: "Smart Grocery Lists",
    description: "Automatically generate shopping lists from your meal plans. Organized by store aisle.",
    screen: "grocery" as const,
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="bg-white py-8">
      <div className="mx-auto max-w-7xl px-6">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="mb-20 text-center"
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-kitch-peach px-4 py-2">
            <span className="text-sm font-medium text-kitch-charcoal">Features</span>
          </div>
          <h2 className="mb-6 text-balance font-literata text-4xl font-bold text-kitch-charcoal lg:text-5xl">
            Every home cook&apos;s{" "}
            <span className="bg-gradient-to-r from-kitch-orange-from to-kitch-orange-to bg-clip-text text-transparent">
              favourite{" "}
            </span>
            app
          </h2>
          <p className="mx-auto max-w-2xl text-pretty text-lg font-medium text-kitch-grey">
            From saving recipes to meal planning, Kitch makes cooking at home easier and more enjoyable than ever.
          </p>
        </motion.div>

        {/* Features List */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true, margin: "-100px" }}
              className="overflow-visible rounded-3xl border border-kitch-charcoal/10 bg-gradient-to-br from-kitch-peach/70 via-kitch-cream to-white p-6 lg:p-8"
            >
              <div className="space-y-8">
                <div className="text-center lg:text-left">
                  <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-kitch-orange-from to-kitch-orange-to lg:mx-0">
                    <feature.icon className="h-7 w-7 text-white" />
                  </div>
                  <h3 className="mb-4 font-literata text-3xl font-bold text-kitch-charcoal lg:text-4xl">
                    {feature.title}
                  </h3>
                  <p className="text-lg leading-relaxed text-kitch-grey">{feature.description}</p>
                </div>

                <div className="mx-auto w-full max-w-[280px]">
                  <IPhoneMockup
                    screen={feature.screen}
                    className="mx-auto scale-[0.92] lg:scale-95"
                    crop={feature.screen === "recipes" ? "bottom" : "top"}
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
