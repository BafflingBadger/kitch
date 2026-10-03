"use client";

import { motion } from "framer-motion";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "How do I import recipes from Instagram and TikTok?",
    answer:
      "Simply go onto Instagram or TikTok and share the post to Kitch, or copy the link and paste it in the app. Kitch will automatically extract the recipe details, ingredients, and instructions. It works with Instagram, TikTok, Facebook, Pinterest, and any website with recipes.",
  },
  {
    question: "Do my recipes disappear when I cancel my subscription?",
    answer:
      "No. Your recipes are yours forever. If you cancel, you keep access to all recipes you've saved. You'll just be limited to the features available in the free plan. You can always export your recipes as well.",
  },
  {
    question: "Is my data synced across all my devices?",
    answer:
      "Absolutely. All your recipes, cookbooks, meal plans, and grocery lists sync automatically across all your devices. Sign in with the same account on your iPhone and iPad to access everything, everywhere.",
  },
  {
    question: "How does the Family plan work?",
    answer:
      "The Family plan allows up to 6 family members to have their own profiles under one subscription. After you subscribe, simply go to your settings page to invite each member to your plan.",
  },
  {
    question: "Is there an Android version?",
    answer:
      "We're currently focused on delivering the best possible iOS experience. Android is on our roadmap and we'll announce it when it's ready. Join our waitlist to be notified when Android launches.",
  },
  {
    question: "Can I use Google Home to update my grocery list?",
    answer:
      "No. Kitch currently only supports Amazon Alexa for voice commands. We plan to support Google Home and Apple HomeKit in the future based on user demand.",
  },
];

export function FaqSection() {
  return (
    <section id="faq" className="bg-kitch-cream py-8 pb-20">
      <div className="mx-auto max-w-4xl px-6">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="mb-16 text-center"
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-kitch-peach px-4 py-2">
            <span className="text-sm font-medium text-kitch-charcoal">FAQ</span>
          </div>
          <h2 className="mb-6 text-balance font-literata text-4xl font-bold text-kitch-charcoal lg:text-5xl">
            Frequently Asked{" "}
            <span className="bg-gradient-to-r from-kitch-orange-from to-kitch-orange-to bg-clip-text text-transparent">
              Questions
            </span>
          </h2>
          <p className="mx-auto max-w-2xl text-pretty text-lg text-kitch-grey">
            Everything you need to know about Kitch. Can&apos;t find what you&apos;re looking for? Contact our support team.
          </p>
        </motion.div>

        {/* FAQ Accordion */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          viewport={{ once: true }}
        >
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="rounded-3xl border border-kitch-charcoal/10 bg-white px-6"
              >
                <AccordionTrigger className="py-6 text-left text-kitch-charcoal hover:no-underline">
                  <span className="pr-4 text-base font-semibold">{faq.question}</span>
                </AccordionTrigger>
                <AccordionContent className="pb-6 text-base leading-relaxed text-kitch-grey">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
}
