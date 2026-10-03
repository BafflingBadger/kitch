"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "/month",
    description: "Perfect for getting started with Kitch.",
    features: [
      "Import up to 10 recipes from any website or social media",
      "Unlimited cookbooks",
      "Meal planning",
      "Grocery lists",
      "Follow friends",
    ],
    cta: "Get Started",
    popular: false,
  },
  {
    name: "Premium",
    price: "$3.99",
    period: "/month, billed annually",
    description: "For home cooks who want the full experience.",
    features: [
      "Everything in Free plan",
      "Unlimited recipe imports from any social media or website",
      "Import recipes from photos",
      "Grocery lists with Amazon Alexa",
      "Nutritional info",
      "Automatic recipe scaling",
      "Priority support",
    ],
    cta: "Start Free Trial",
    popular: true,
  },
  {
    name: "Family",
    price: "$11.99",
    period: "/month, billed annually",
    description: "Share the love of cooking with your whole family.",
    features: [
      "Everything in Premium",
      "Up to 6 family members",
      "Shared cookbooks",
      "Family meal planning",
      "Synced grocery lists",
    ],
    cta: "Start Free Trial",
    popular: false,
  },
];

export function PricingSection() {
  return (
    <section id="pricing" className="bg-gradient-to-b from-white to-kitch-cream py-8">
      <div className="mx-auto max-w-7xl px-6">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="mb-16 text-center"
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-kitch-peach px-4 py-2">
            <span className="text-sm font-medium text-kitch-charcoal">Pricing</span>
          </div>
          <h2 className="mb-6 text-balance font-literata text-4xl font-bold text-kitch-charcoal lg:text-5xl">
            Affordable for{" "}
            <span className="bg-gradient-to-r from-kitch-orange-from to-kitch-orange-to bg-clip-text text-transparent">
              everyone
            </span>
          </h2>
          <p className="mx-auto max-w-2xl text-pretty text-lg text-kitch-grey">
            Start free and upgrade when you need more. All plans include a 14-day free trial.
          </p>
        </motion.div>

        {/* Pricing Cards */}
        <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-3">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <div
                className={cn(
                  "relative flex h-full flex-col rounded-3xl bg-white p-6",
                  plan.popular
                    ? "border-2 border-kitch-orange-from shadow-xl"
                    : "border border-kitch-charcoal/10",
                )}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <div className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-gradient-to-r from-kitch-orange-from to-kitch-orange-to px-4 py-1.5">
                      <Sparkles className="h-4 w-4 text-white" />
                      <span className="text-sm font-medium text-white">Most Popular</span>
                    </div>
                  </div>
                )}
                <div className="pt-2">
                  <h3 className="font-literata text-xl font-bold text-kitch-charcoal">{plan.name}</h3>
                  <div className="mt-4">
                    <span className="font-literata text-4xl font-bold text-kitch-charcoal">{plan.price}</span>
                    <span className="text-kitch-grey">{plan.period}</span>
                  </div>
                  <p className="mt-2 text-sm text-kitch-grey">{plan.description}</p>
                </div>
                <ul className="mb-8 mt-6 flex-1 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-kitch-peach">
                        <Check className="h-3 w-3 text-kitch-red" />
                      </div>
                      <span className="text-sm text-kitch-charcoal">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/auth/sign-up"
                  className={cn(
                    "flex h-12 w-full items-center justify-center rounded-full text-sm font-semibold transition-opacity",
                    plan.popular
                      ? "bg-gradient-to-r from-kitch-orange-from to-kitch-orange-to text-white hover:opacity-90"
                      : "bg-kitch-cream-dark text-kitch-charcoal hover:opacity-80",
                  )}
                >
                  {plan.cta}
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
