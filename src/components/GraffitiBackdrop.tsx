"use client";

import Image from "next/image";
import { useReducedMotion } from "framer-motion";

/** Four corner murals — faded into brick, not framed posters */
const MURALS: {
  src: string;
  alt: string;
  x: string;
  y: string;
  w: string;
  o: number;
}[] = [
  {
    src: "/wall/wall-graffiti-mask.png",
    alt: "Spray mask mural",
    x: "-10%",
    y: "0%",
    w: "46%",
    o: 0.48,
  },
  {
    src: "/wall/wall-wildstyle.png",
    alt: "Wildstyle wash",
    x: "64%",
    y: "-8%",
    w: "44%",
    o: 0.42,
  },
  {
    src: "/wall/wall-stencil-cat.png",
    alt: "Stencil cat on wall",
    x: "66%",
    y: "48%",
    w: "40%",
    o: 0.45,
  },
  {
    src: "/wall/wall-nft-kid.png",
    alt: "Portrait wash",
    x: "-8%",
    y: "48%",
    w: "38%",
    o: 0.4,
  },
];

export function GraffitiBackdrop() {
  const reduce = useReducedMotion();

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 h-[100dvh] overflow-hidden"
    >
      <div className="graffiti-brick absolute inset-0" />
      <div className="wall-spray absolute inset-0" />

      {MURALS.map((m, i) => (
        <div
          key={`${m.src}-${i}`}
          className="mural-wash absolute"
          style={{
            left: m.x,
            top: m.y,
            width: m.w,
            opacity: reduce ? m.o * 0.85 : m.o,
            aspectRatio: "1 / 1",
          }}
        >
          <Image
            src={m.src}
            alt={m.alt}
            fill
            sizes="(max-width: 768px) 55vw, 42vw"
            className="object-cover"
            priority={i < 2}
          />
        </div>
      ))}

      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 48% 44% at 38% 40%, color-mix(in srgb, var(--ink) 36%, transparent) 0%, transparent 72%)",
        }}
      />
    </div>
  );
}
