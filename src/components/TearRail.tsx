"use client";

import {
  useCallback,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import { Scissors } from "lucide-react";

const EASE = [0.22, 1, 0.36, 1] as const;

/** Drag the scissors along the perforation to rip into mint */
export function TearRail() {
  const reduce = useReducedMotion();
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const [busy, setBusy] = useState(false);
  const progress = useMotionValue(0);
  const spring = useSpring(progress, { stiffness: 200, damping: 28, mass: 0.35 });
  const x = useTransform(spring, [0, 1], ["0%", "calc(100% - 40px)"]);
  const ripWidth = useTransform(spring, [0, 1], ["0%", "100%"]);
  const tipRotate = useTransform(spring, [0, 1], [0, -25]);

  const goMint = useCallback(() => {
    setBusy(true);
    progress.set(1);
    window.setTimeout(() => {
      document.getElementById("mint")?.scrollIntoView({ behavior: "smooth" });
    }, 180);
    window.setTimeout(() => {
      progress.set(0);
      setBusy(false);
      dragging.current = false;
    }, 700);
  }, [progress]);

  const onDown = (e: ReactPointerEvent) => {
    if (reduce) {
      goMint();
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    dragging.current = true;
    setBusy(true);
  };

  const onMove = (e: ReactPointerEvent) => {
    if (!dragging.current || !trackRef.current) return;
    const r = trackRef.current.getBoundingClientRect();
    const p = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    progress.set(p);
  };

  const onUp = () => {
    if (!dragging.current) return;
    if (progress.get() > 0.55) {
      goMint();
    } else {
      progress.set(0);
      setBusy(false);
      dragging.current = false;
    }
  };

  return (
    <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col items-stretch px-4 py-2 md:px-8">
      <p className="xerox-label mb-3 text-center text-[var(--lime)]">
        {busy ? "ripping…" : "drag scissors across the cut line"}
      </p>

      <div
        ref={trackRef}
        className="relative mx-auto h-16 w-full max-w-3xl touch-none select-none"
        style={{ touchAction: "none" }}
      >
        {/* Jagged paper edges above/below cut */}
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-5 origin-bottom bg-[var(--cream)]"
          style={{
            clipPath:
              "polygon(0 100%, 4% 40%, 8% 90%, 12% 30%, 16% 85%, 20% 35%, 24% 95%, 28% 25%, 32% 80%, 36% 40%, 40% 100%, 44% 30%, 48% 90%, 52% 20%, 56% 85%, 60% 35%, 64% 95%, 68% 25%, 72% 80%, 76% 40%, 80% 100%, 84% 30%, 88% 90%, 92% 35%, 96% 85%, 100% 40%, 100% 100%)",
          }}
        />
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-5 origin-top bg-[var(--pink)]"
          style={{
            clipPath:
              "polygon(0 0, 0 60%, 4% 10%, 8% 70%, 12% 5%, 16% 65%, 20% 15%, 24% 75%, 28% 0, 32% 70%, 36% 20%, 40% 0, 44% 65%, 48% 10%, 52% 80%, 56% 15%, 60% 70%, 64% 5%, 68% 75%, 72% 20%, 76% 0, 80% 65%, 84% 10%, 88% 70%, 92% 15%, 96% 60%, 100% 20%, 100% 0)",
          }}
        />

        {/* Perforation */}
        <div className="absolute inset-x-0 top-1/2 h-0 -translate-y-1/2 border-t-2 border-dashed border-[var(--lime)]" />

        {/* Rip reveal lime fill */}
        <motion.div
          aria-hidden
          className="absolute left-0 top-1/2 h-1 -translate-y-1/2 bg-[var(--lime)]"
          style={{ width: ripWidth }}
        />

        {/* Scissors handle */}
        <motion.button
          type="button"
          aria-label="점선을 따라 드래그해 민팅으로 찢기"
          className="cursor-scissors absolute top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center border-2 border-[var(--ink)] bg-[var(--lime)] text-[var(--ink)] shadow-[3px_3px_0_var(--ink)]"
          style={{ left: x, rotate: tipRotate }}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          whileHover={reduce ? undefined : { scale: 1.08 }}
          whileTap={reduce ? undefined : { scale: 0.95 }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              goMint();
            }
          }}
        >
          <Scissors size={18} strokeWidth={2.5} />
        </motion.button>
      </div>

      <motion.p
        className="tag-stamp mt-3 text-center text-3xl text-[var(--cream)] md:text-5xl"
        style={{ textShadow: "3px 3px 0 var(--pink)", WebkitTextStroke: "0" }}
        animate={
          reduce
            ? undefined
            : busy
              ? { x: [0, -4, 4, -2, 0], opacity: 1 }
              : { opacity: [0.55, 1, 0.55] }
        }
        transition={
          busy
            ? { duration: 0.35, ease: EASE }
            : { duration: 1.8, repeat: Infinity, ease: "easeInOut" }
        }
      >
        TEAR HERE
      </motion.p>
    </div>
  );
}
