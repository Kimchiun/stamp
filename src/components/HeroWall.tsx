"use client";

import {
  useCallback,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import { Scissors } from "lucide-react";

const EASE = [0.22, 1, 0.36, 1] as const;

const SHREDS = [
  { left: "12%", delay: 0, h: 28, rot: -18 },
  { left: "28%", delay: 0.04, h: 40, rot: 12 },
  { left: "44%", delay: 0.08, h: 22, rot: -8 },
  { left: "58%", delay: 0.02, h: 36, rot: 22 },
  { left: "72%", delay: 0.06, h: 30, rot: -14 },
  { left: "86%", delay: 0.1, h: 24, rot: 9 },
];

export function HeroWall() {
  const reduce = useReducedMotion();
  const stageRef = useRef<HTMLDivElement>(null);
  const [peeling, setPeeling] = useState(false);
  const [torn, setTorn] = useState(false);
  const peelingRef = useRef(false);

  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const peel = useMotionValue(0);

  const sx = useSpring(mx, { stiffness: 120, damping: 22, mass: 0.4 });
  const sy = useSpring(my, { stiffness: 120, damping: 22, mass: 0.4 });
  const peelSpring = useSpring(peel, {
    stiffness: 160,
    damping: 22,
    mass: 0.4,
  });

  const rotX = useTransform(sy, [-0.5, 0.5], [6, -6]);
  const rotY = useTransform(sx, [-0.5, 0.5], [-9, 9]);
  const bleachedRot = useTransform(sx, [-0.5, 0.5], [-3.5, 0.5]);
  const limeRot = useTransform(sx, [-0.5, 0.5], [0.5, 4.5]);
  const bleachedX = useTransform(sx, [-0.5, 0.5], [-8, 10]);
  const limeX = useTransform(sx, [-0.5, 0.5], [-4, 14]);
  const peelRotate = useTransform(peelSpring, [0, 1], [0, -32]);
  const peelY = useTransform(peelSpring, [0, 1], [0, 72]);
  const peelX = useTransform(peelSpring, [0, 1], [0, 56]);
  const peelScale = useTransform(peelSpring, [0, 1], [1, 0.92]);
  const peelOpacity = useTransform(peelSpring, [0, 0.75, 1], [1, 1, 0.15]);
  const revealOpacity = useTransform(peelSpring, [0, 0.25, 1], [0.4, 0.85, 1]);
  const peelShadowY = useTransform(peelSpring, [0, 1], [6, 40]);
  const shadow = useMotionTemplate`8px ${peelShadowY}px 0 color-mix(in srgb, var(--ink) 55%, transparent)`;
  const ripEdge = useTransform(
    peelSpring,
    [0, 1],
    [
      "polygon(100% 0%, 100% 0%, 100% 100%, 100% 100%)",
      "polygon(55% 0%, 100% 0%, 100% 100%, 40% 100%)",
    ],
  );

  const onMove = useCallback(
    (e: ReactPointerEvent) => {
      if (reduce || peelingRef.current || !stageRef.current) return;
      const r = stageRef.current.getBoundingClientRect();
      mx.set((e.clientX - r.left) / r.width - 0.5);
      my.set((e.clientY - r.top) / r.height - 0.5);
    },
    [mx, my, reduce],
  );

  const onLeave = useCallback(() => {
    if (peelingRef.current) return;
    mx.set(0);
    my.set(0);
  }, [mx, my]);

  const finishTear = useCallback(() => {
    setTorn(true);
    peel.set(1);
    peelingRef.current = true;
    window.setTimeout(() => {
      document.getElementById("mint")?.scrollIntoView({ behavior: "smooth" });
    }, 280);
    window.setTimeout(() => {
      peel.set(0);
      setTorn(false);
      setPeeling(false);
      peelingRef.current = false;
    }, 950);
  }, [peel]);

  const onPeelPointerDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (reduce) {
      document.getElementById("mint")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    peelingRef.current = true;
    setPeeling(true);
  };

  const onPeelPointerMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (!peelingRef.current || !stageRef.current) return;
    const r = stageRef.current.getBoundingClientRect();
    const dx = (e.clientX - (r.left + r.width * 0.82)) / (r.width * 0.32);
    const dy = (e.clientY - (r.top + r.height * 0.1)) / (r.height * 0.45);
    peel.set(Math.max(0, Math.min(1, Math.max(dx, dy) * 1.2)));
  };

  const onPeelPointerUp = () => {
    if (!peelingRef.current) return;
    if (peel.get() > 0.38) {
      finishTear();
    } else {
      peel.set(0);
      setPeeling(false);
      peelingRef.current = false;
    }
  };

  return (
    <section
      ref={stageRef}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className="relative mx-auto flex min-h-[88vh] w-full max-w-6xl flex-col justify-center px-4 py-10 md:px-8 md:py-14"
      style={{ perspective: 1400 }}
    >
      <motion.div
        aria-hidden
        className="sheet sheet-bleached sheet-torn-deep absolute left-6 top-16 hidden h-[70%] w-[88%] md:block"
        style={reduce ? { rotate: -2.5 } : { rotate: bleachedRot, x: bleachedX }}
      />
      <motion.div
        aria-hidden
        className="sheet sheet-lime sheet-torn-deep absolute left-10 top-20 hidden h-[72%] w-[86%] md:block"
        style={
          reduce
            ? { rotate: 1.8 }
            : { rotate: limeRot, x: limeX, opacity: revealOpacity }
        }
      >
        <p className="xerox-label absolute bottom-8 left-8 opacity-70">
          Ethereum · Solana · TRON · XRPL · Kaia · …
        </p>
        <p className="display-stamp absolute left-8 top-10 text-5xl text-[var(--ink)]/25">
          UNDER
        </p>
        <p className="xerox-label absolute right-8 top-10 rotate-3 bg-[var(--ink)] px-2 py-1 text-[var(--lime)]">
          layer exposed
        </p>
      </motion.div>

      <motion.div
        className="sheet sheet-graffiti sheet-torn-deep relative z-10 w-full max-w-4xl origin-top-right overflow-hidden px-6 py-10 md:px-12 md:py-14"
        style={
          reduce
            ? { rotate: -0.6 }
            : {
                rotateX: rotX,
                rotateY: rotY,
                rotate: peelRotate,
                x: peelX,
                y: peelY,
                scale: peelScale,
                opacity: peelOpacity,
                boxShadow: shadow,
                transformStyle: "preserve-3d",
              }
        }
      >
        <span className="spray-noise" aria-hidden />

        {/* Ghost wash under the throw-up — one layer only */}
        <span
          aria-hidden
          className="tag-ghost left-8 top-16 -rotate-6 text-6xl md:text-8xl"
          style={{ textDecoration: "line-through" }}
        >
          MINT
        </span>

        {/* Paint drips — sparse */}
        <span className="paint-drip left-[18%] top-0 h-14 bg-[var(--ink)]" aria-hidden />
        <span className="paint-drip left-[58%] top-0 h-18 bg-[var(--lime)]" aria-hidden />
        <span className="paint-drip right-[22%] top-0 h-10 bg-[var(--ink)]" aria-hidden />

        {/* One sticker slap */}
        <span
          aria-hidden
          className="sticker-slap left-4 top-20 rotate-[-14deg] bg-[var(--lime)] px-2 py-1 md:left-6"
        >
          <span className="marker-scribble text-sm text-[var(--ink)]">12x</span>
        </span>

        {/* Live rip edge while peeling */}
        {!reduce && (
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-10 bg-[var(--lime)] mix-blend-multiply"
            style={{ clipPath: ripEdge, opacity: 0.35 }}
          />
        )}

        <motion.span
          className="staple absolute left-4 top-3 z-10 md:left-6 md:top-5"
          whileHover={reduce ? undefined : { rotate: -12, y: -2 }}
          aria-hidden
        />
        <motion.span
          className="staple absolute left-10 top-3 z-10 md:left-12 md:top-5"
          whileHover={reduce ? undefined : { rotate: 8, y: -1 }}
          aria-hidden
        />
        <motion.span
          className="staple absolute right-14 top-3 z-10 md:right-16 md:top-5"
          whileHover={reduce ? undefined : { rotate: 14, y: -2 }}
          aria-hidden
        />

        <p className="stencil-label relative z-[1] mb-5 inline-block text-xs text-[var(--ink)]">
          S-01 · SEOUL · TONIGHT
        </p>

        <div className="relative z-[1]">
          <p
            aria-hidden
            className="tag-stamp pointer-events-none absolute inset-0 translate-x-1 translate-y-1 text-[clamp(4.5rem,18vw,10rem)] text-[var(--lime)] opacity-40"
            style={{ textShadow: "none", WebkitTextStroke: "0" }}
          >
            STAMP
          </p>
          <p className="tag-stamp relative text-[clamp(4.5rem,18vw,10rem)]">
            STAMP
          </p>
        </div>

        <h1 className="relative z-[1] mt-6 max-w-md text-xl font-bold leading-snug tracking-tight text-[var(--ink)] md:text-2xl">
          체인 고르고, 올리고, 찍는다.
        </h1>
        <p className="relative z-[1] mt-3 max-w-sm leading-relaxed text-[var(--ink)]/80">
          Kaia · Ethereum · Solana · TRON · XRPL — 한 장 흐름으로 NFT 민팅.
        </p>

        <div className="relative z-[1] mt-9 flex flex-wrap items-center gap-3">
          <motion.a
            href="#mint"
            className="btn-stamp btn-ink"
            whileHover={reduce ? undefined : { y: -2, rotate: -1 }}
            whileTap={
              reduce
                ? undefined
                : { y: 2, boxShadow: "0px 0px 0 var(--pink)" }
            }
            onClick={(e) => {
              if (reduce) return;
              e.preventDefault();
              finishTear();
            }}
          >
            민팅 시작 →
          </motion.a>
          <p className="marker-scribble hidden text-base text-[var(--ink)]/70 sm:block">
            {peeling ? "keep ripping…" : "grab the corner ↓"}
          </p>
        </div>

        <motion.button
          type="button"
          aria-label="전단 모서리를 찢어 민팅으로 이동"
          className="cursor-scissors absolute -right-2 -top-2 z-20 flex touch-none flex-col items-end gap-1 active:cursor-grabbing"
          style={{ touchAction: "none" }}
          onPointerDown={onPeelPointerDown}
          onPointerMove={onPeelPointerMove}
          onPointerUp={onPeelPointerUp}
          onPointerCancel={onPeelPointerUp}
          whileHover={reduce ? undefined : { scale: 1.08, rotate: -4 }}
        >
          <span className="flex items-center gap-1.5 border-2 border-[var(--ink)] bg-[var(--lime)] px-2.5 py-1.5 text-[var(--ink)] shadow-[4px_4px_0_var(--ink)]">
            <Scissors size={14} strokeWidth={2.5} />
            <span className="marker-scribble text-sm leading-none">TEAR</span>
          </span>
          <motion.span
            className="h-8 w-0.5 origin-top bg-[var(--ink)]"
            animate={
              reduce || peeling
                ? { scaleY: peeling ? 1.4 : 1 }
                : { scaleY: [0.6, 1.2, 0.6] }
            }
            transition={{
              duration: 1.1,
              repeat: peeling ? 0 : Infinity,
              ease: EASE,
            }}
            aria-hidden
          />
        </motion.button>
      </motion.div>

      {/* Flying shreds on tear complete */}
      {torn &&
        !reduce &&
        SHREDS.map((s, i) => (
          <motion.span
            key={i}
            aria-hidden
            className="shred z-40"
            style={{
              left: s.left,
              top: "38%",
              height: s.h,
              rotate: s.rot,
            }}
            initial={{ opacity: 1, y: 0, scaleY: 1 }}
            animate={{ opacity: 0, y: 80 + i * 12, x: (i - 3) * 18, scaleY: 0.4 }}
            transition={{ duration: 0.55, delay: s.delay, ease: EASE }}
          />
        ))}

      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-[36%] z-30 mx-auto h-2 max-w-4xl origin-left"
        style={{
          background:
            "repeating-linear-gradient(90deg, var(--lime) 0 8px, transparent 8px 14px)",
        }}
        initial={{ scaleX: 0, opacity: 0 }}
        animate={
          torn ? { scaleX: 1, opacity: [0, 1, 0] } : { scaleX: 0, opacity: 0 }
        }
        transition={{ duration: 0.5, ease: EASE }}
      />
    </section>
  );
}
