"use client";

import { useRef, type ReactNode } from "react";
import {
  motion,
  useInView,
  useReducedMotion,
  type HTMLMotionProps,
} from "framer-motion";

type Props = HTMLMotionProps<"section"> & {
  tone: "lime" | "pink" | "cream" | "bleached";
  layer: string;
  title: string;
  children: ReactNode;
};

const toneClass = {
  lime: "sheet-lime",
  pink: "sheet-pink",
  cream: "sheet-cream",
  bleached: "sheet-bleached",
} as const;

export function FlyerSheet({
  tone,
  layer,
  title,
  children,
  className = "",
  ...rest
}: Props) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.25 });
  const reduce = useReducedMotion();

  return (
    <motion.section
      ref={ref}
      className={`sheet sheet-torn-deep relative px-5 py-7 md:px-8 md:py-9 ${toneClass[tone]} ${className}`}
      initial={reduce ? false : { opacity: 0.2, y: 36, rotate: tone === "lime" ? -1.5 : 1.2 }}
      animate={
        inView || reduce
          ? { opacity: 1, y: 0, rotate: 0 }
          : undefined
      }
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      whileHover={
        reduce
          ? undefined
          : { y: -4, boxShadow: "6px 10px 0 color-mix(in srgb, var(--ink) 50%, transparent)" }
      }
      {...rest}
    >
      <motion.span
        className="staple absolute left-4 top-3"
        whileHover={reduce ? undefined : { rotate: -18, scale: 1.1 }}
        aria-hidden
      />
      <motion.span
        className="staple absolute right-4 top-3"
        whileHover={reduce ? undefined : { rotate: 12, scale: 1.1 }}
        aria-hidden
      />
      <p className="xerox-label text-[var(--ink)]/55">{layer}</p>
      <h2 className="display-stamp mt-1 text-3xl text-[var(--ink)] md:text-5xl">
        {title}
      </h2>
      <div className="mt-5">{children}</div>
    </motion.section>
  );
}
