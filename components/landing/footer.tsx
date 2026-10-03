"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Instagram, Twitter, Youtube } from "lucide-react";

import { SUPPORT_EMAIL } from "@/lib/support";

const footerLink = "text-sm text-white/60 transition-colors hover:text-white";
const socialLink =
  "flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20";

export function Footer() {
  return (
    <footer className="bg-kitch-charcoal py-20 text-white">
      <div className="mx-auto max-w-7xl px-6">
        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="mb-16 text-center"
        >
          <h2 className="mb-4 text-balance font-literata text-3xl font-bold lg:text-4xl">
            Ready to transform your kitchen?
          </h2>
          <p className="mx-auto mb-8 max-w-lg text-pretty text-white/70">
            Join 50,000+ home cooks who are saving recipes, planning meals, and cooking more than ever.
          </p>
          <button type="button" className="inline-block">
            <Image
              src="/download-on-app-store-white.svg"
              alt="Download on the App Store"
              width={180}
              height={60}
              className="block"
            />
          </button>
        </motion.div>

        {/* Footer Links */}
        <div className="mb-6 flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
          <div className="flex flex-wrap items-center gap-6">
            <Link href="/legal/privacy" className={footerLink}>Privacy Policy</Link>
            <Link href="/legal/terms" className={footerLink}>Terms of Service</Link>
            <a href={`mailto:${SUPPORT_EMAIL}`} className={footerLink}>Contact</a>
          </div>

          {/* Social Media Icons */}
          <div className="flex gap-4">
            <a href="#" aria-label="Twitter" className={socialLink}>
              <Twitter className="h-5 w-5" />
            </a>
            <a href="#" aria-label="Instagram" className={socialLink}>
              <Instagram className="h-5 w-5" />
            </a>
            <a href="#" aria-label="YouTube" className={socialLink}>
              <Youtube className="h-5 w-5" />
            </a>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 md:flex-row">
          <p className="text-sm text-white/60">&copy; 2026 Kitch. All rights reserved.</p>
          <p className="text-sm text-white/60">Made with love for home cooks everywhere.</p>
        </div>
      </div>
    </footer>
  );
}
