"use client";

import Image from "next/image";
import { motion } from "framer-motion";

type Screen = "recipes" | "social" | "cookbook" | "mealplan" | "grocery";

const screenImages: Record<Screen, string> = {
  recipes: "/images/features-import.png",
  social: "/images/features-social.png",
  cookbook: "/images/features-cookbooks.png",
  mealplan: "/images/features-meal-plan.png",
  grocery: "/images/features-grocery-list.png",
};

interface IPhoneMockupProps {
  screen: Screen;
  className?: string;
  crop?: "top" | "bottom";
}

export function IPhoneMockup({ screen, className = "", crop }: IPhoneMockupProps) {
  const isCropped = crop === "top" || crop === "bottom";
  const frameOffset = crop === "bottom" ? "-top-[190px]" : "top-0";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      viewport={{ once: true }}
      className={`relative ${className}`}
    >
      <div className={isCropped ? "relative h-[380px] overflow-hidden" : "relative"}>
        {/* iPhone Frame */}
        <div
          className={`h-[570px] w-[280px] rounded-[3rem] bg-kitch-charcoal p-3 ${
            isCropped ? `absolute left-1/2 -translate-x-1/2 ${frameOffset}` : "relative mx-auto"
          }`}
        >
          {/* Screen */}
          <div className="relative h-full w-full overflow-hidden rounded-[2.4rem] bg-white">
            {/* Dynamic Island */}
            <div className="absolute left-1/2 top-2 z-10 h-5 w-20 -translate-x-1/2 rounded-full bg-black" />
            <Image
              src={screenImages[screen]}
              alt="Kitch app showing import feature"
              fill
              sizes="256px"
              className="object-cover"
            />
            {/* Home Indicator */}
            <div className="absolute bottom-2 left-1/2 h-1 w-32 -translate-x-1/2 rounded-full bg-black" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
