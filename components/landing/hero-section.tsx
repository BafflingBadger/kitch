"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

import { joinAndroidWaitlist } from "@/app/(landing)/actions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const navLink = "text-lg font-bold text-kitch-grey transition-colors hover:text-kitch-charcoal";

export function HeroSection() {
  const [email, setEmail] = useState("");
  const [waitlistStatus, setWaitlistStatus] = useState<"idle" | "success" | "error">("idle");
  const [waitlistError, setWaitlistError] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open);

    if (open) {
      setEmail("");
      setWaitlistError("");
      setWaitlistStatus("idle");
    }
  };

  const handleEmailSubmit = () => {
    startTransition(async () => {
      const result = await joinAndroidWaitlist(email);
      if (!result.ok) {
        setWaitlistError(result.error);
        setWaitlistStatus("error");
        return;
      }
      setEmail("");
      setWaitlistError("");
      setWaitlistStatus("success");
    });
  };

  return (
    <section className="relative min-h-screen overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_hsl(var(--kitch-orange-from)/0.20),_transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_hsl(var(--kitch-orange-from)/0.20),_transparent_35%),radial-gradient(circle_at_right,_hsl(var(--kitch-orange-from)/0.08),_transparent_40%)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-white via-transparent to-transparent" />

      <div className="relative z-10 mx-auto px-6 py-10 sm:px-10 lg:pb-20 lg:pt-10">
        {/* Navigation */}
        <motion.nav
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          // Three columns with equal outer tracks, so the section links sit at
          // the true centre of the page whatever the logo and buttons measure.
          className="mb-20 flex items-center justify-between gap-4 lg:grid lg:grid-cols-[1fr_auto_1fr]"
        >
          {/* Same lockup as the dashboard sidebar, scaled up: the hat is 1.2x
              the wordmark's line height, and its 1847x1474 source sets the width. */}
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="Kitch"
              width={72}
              height={58}
              className="h-11 w-auto object-contain sm:h-[58px]"
              priority
            />
            <span className="font-literata text-4xl font-semibold leading-tight text-kitch-charcoal sm:text-5xl">
              Kitch
            </span>
          </Link>
          <div className="hidden items-center gap-10 lg:flex">
            <a href="#features" className={navLink}>Features</a>
            <a href="#pricing" className={navLink}>Pricing</a>
            <a href="#faq" className={navLink}>FAQ</a>
          </div>
          <div className="flex items-center gap-3 justify-self-end">
            <Link
              href="/auth/login"
              className="flex h-12 items-center rounded-full border border-kitch-charcoal/10 bg-white px-5 text-base font-bold text-kitch-charcoal transition-colors hover:bg-kitch-cream sm:px-6 sm:text-lg"
            >
              Login
            </Link>
            <Link
              href="/auth/sign-up"
              className="hidden h-12 items-center rounded-full bg-gradient-to-r from-kitch-orange-from to-kitch-orange-to px-6 text-lg font-bold text-white transition-opacity hover:opacity-90 sm:flex"
            >
              Try now for free
            </Link>
          </div>
        </motion.nav>

        {/* Hero Content */}
        <div className="flex min-h-[calc(100vh-10rem)] flex-col items-center justify-center gap-16 pt-8 text-center lg:gap-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="w-full max-w-3xl"
          >
            <div className="mb-6 inline-flex items-center justify-center gap-2 rounded-full bg-kitch-peach px-4 py-2">
              <span className="h-2 w-2 rounded-full bg-gradient-to-r from-kitch-orange-from to-kitch-orange-to" />
              <span className="text-sm font-medium text-kitch-charcoal">Now available on iPad</span>
            </div>

            <h1 className="mb-6 text-balance font-literata text-5xl font-bold leading-tight text-kitch-charcoal lg:text-6xl xl:text-7xl">
              Cooking.{" "}
              <span className="bg-gradient-to-r from-kitch-orange-from to-kitch-orange-to bg-clip-text text-transparent">
                Simplified.
              </span>
            </h1>

            <p className="mx-auto mb-8 max-w-2xl text-pretty text-lg font-medium leading-relaxed text-kitch-grey">
              Import recipes from any social media, website, or photo. Create cookbooks, plan meals, and generate grocery lists. Share and discover with friends.
            </p>

            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <button
                type="button"
                className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-kitch-orange-from to-kitch-orange-to px-8 text-base font-bold text-white transition-opacity hover:opacity-90"
              >
                <svg className="size-6" viewBox="0 0 384 512" fill="currentColor" aria-hidden>
                  <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
                </svg>
                Download for iOS
              </button>
              <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
                <DialogTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex h-14 items-center justify-center gap-2 rounded-full border border-kitch-charcoal/10 bg-white px-8 text-base font-semibold text-kitch-charcoal transition-colors hover:bg-kitch-cream"
                  >
                    <svg className="size-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                      <path d="M3 20.5V3.5C3 2.91 3.34 2.39 3.84 2.15L13.69 12L3.84 21.85C3.34 21.61 3 21.09 3 20.5Z" />
                      <path d="M16.81 15.12L6.05 21.34L14.54 12.85L16.81 15.12Z" />
                      <path d="M20.16 10.81C20.5 11.08 20.75 11.53 20.75 12C20.75 12.47 20.5 12.92 20.16 13.19L17.89 14.5L15.39 12L17.89 9.5L20.16 10.81Z" />
                      <path d="M6.05 2.66L16.81 8.88L14.54 11.15L6.05 2.66Z" />
                    </svg>
                    Join waitlist for Android
                  </button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Join the Android waitlist</DialogTitle>
                    <DialogDescription>
                      Enter your email and we&apos;ll notify you as soon as Android is available.
                    </DialogDescription>
                  </DialogHeader>
                  <form
                    className="grid gap-4"
                    onSubmit={(event) => {
                      event.preventDefault();
                      handleEmailSubmit();
                    }}
                  >
                    <label className="text-sm font-medium text-kitch-charcoal" htmlFor="waitlist-email">
                      Email address
                    </label>
                    <input
                      id="waitlist-email"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="you@example.com"
                      className="w-full rounded-2xl border border-kitch-charcoal/10 bg-white px-4 py-3 text-sm text-kitch-charcoal outline-none transition focus:border-kitch-orange-from focus:ring-2 focus:ring-kitch-orange-from/20"
                    />
                    {waitlistStatus === "success" && (
                      <p className="text-sm text-emerald-600">Thanks! We&apos;ll let you know when Android is ready.</p>
                    )}
                    {waitlistStatus === "error" && <p className="text-sm text-kitch-red">{waitlistError}</p>}
                    <DialogFooter>
                      <button
                        type="submit"
                        disabled={isPending}
                        className="h-12 w-full rounded-full bg-gradient-to-r from-kitch-orange-from to-kitch-orange-to px-8 text-base font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                      >
                        Submit
                      </button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="relative flex w-full justify-center"
          >
            <div className="relative w-full max-w-[960px]">
              <Image
                src="/images/kitch-app-preview-landscape.png"
                alt="Kitch app showing a horizontal preview image"
                width={960}
                height={768}
                sizes="(max-width: 1024px) 100vw, 960px"
                className="h-auto w-full rounded-[2rem] shadow-2xl"
                priority
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
