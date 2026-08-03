"use client";

import { useRef, useState } from "react";
import {
  motion,
  AnimatePresence,
  useReducedMotion,
} from "framer-motion";
import { Scissors, X } from "lucide-react";

type Props = {
  preview: string | null;
  onFile: (file: File | null) => void;
};

export function ImagePasteZone({ preview, onFile }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [hover, setHover] = useState(false);
  const reduce = useReducedMotion();

  function openPicker() {
    inputRef.current?.click();
  }

  return (
    <motion.div
      className="relative"
      onHoverStart={() => setHover(true)}
      onHoverEnd={() => setHover(false)}
      animate={
        reduce
          ? undefined
          : hover && !preview
            ? { rotate: -0.6, y: -2 }
            : { rotate: 0, y: 0 }
      }
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Under paste sheet */}
      <div
        aria-hidden
        className="sheet sheet-pink absolute inset-2 -z-10 translate-x-2 translate-y-2 rotate-1"
      />

      <button
        type="button"
        onClick={openPicker}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          const f = e.dataTransfer.files?.[0];
          if (f?.type.startsWith("image/")) onFile(f);
        }}
        className={`sheet sheet-torn relative flex min-h-[300px] w-full flex-col items-center justify-center overflow-hidden text-left ${
          drag ? "sheet-lime" : "sheet-cream"
        }`}
      >
        {/* Crop / cut marks */}
        <span className="cut-mark cut-mark-tl" aria-hidden />
        <span className="cut-mark cut-mark-tr" aria-hidden />
        <span className="cut-mark cut-mark-bl" aria-hidden />
        <span className="cut-mark cut-mark-br" aria-hidden />

        <span className="staple absolute left-3 top-3" aria-hidden />
        <span className="staple absolute right-3 top-3" aria-hidden />

        <AnimatePresence mode="wait">
          {preview ? (
            <motion.div
              key="preview"
              className="absolute inset-3 overflow-hidden border-2 border-[var(--ink)] bg-[var(--ink)]"
              initial={reduce ? false : { clipPath: "inset(0 0 100% 0)" }}
              animate={{ clipPath: "inset(0 0 0% 0)" }}
              exit={reduce ? undefined : { opacity: 0, rotate: -4, y: 20 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt="토큰 미리보기"
                className="h-full w-full object-cover"
              />
              <span
                className="pointer-events-none absolute inset-0 mix-blend-multiply opacity-20"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(0deg, transparent, transparent 2px, var(--ink) 2px, var(--ink) 3px)",
                }}
              />
              <span className="xerox-label absolute bottom-2 left-2 bg-[var(--lime)] px-1.5 py-0.5 text-[var(--ink)]">
                PASTED · READY TO STAMP
              </span>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              className="relative z-10 flex flex-col items-center px-6 py-10 text-center"
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <motion.span
                className="mb-4 inline-flex items-center gap-2 border-2 border-[var(--ink)] bg-[var(--pink)] px-3 py-1.5 text-[var(--ink)] shadow-[3px_3px_0_var(--ink)]"
                animate={
                  reduce
                    ? undefined
                    : drag
                      ? { rotate: [-2, 2, -2], scale: 1.05 }
                      : { rotate: 0, scale: 1 }
                }
                transition={{ duration: 0.35, repeat: drag ? Infinity : 0 }}
              >
                <Scissors size={16} strokeWidth={2.5} />
                <span className="xerox-label">Cut & paste</span>
              </motion.span>

              <p className="display-stamp text-3xl text-[var(--ink)] md:text-4xl">
                {drag ? "DROP IT" : "PASTE ART"}
              </p>
              <p className="mt-3 max-w-[16rem] text-sm font-medium leading-snug text-[var(--ink)]/75">
                {drag
                  ? "여기에 놓으면 전단에 붙습니다."
                  : "클릭하거나 이미지를 끌어다 붙이세요. PNG · JPG · GIF · 최대 4MB"}
              </p>

              {/* Fake torn strip hint */}
              <div className="mt-6 flex w-full max-w-xs items-center gap-2">
                <span className="h-px flex-1 border-t-2 border-dashed border-[var(--ink)]/40" />
                <span className="xerox-label text-[var(--ink)]/45">tear to attach</span>
                <span className="h-px flex-1 border-t-2 border-dashed border-[var(--ink)]/40" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Drag peel overlay */}
        <AnimatePresence>
          {drag && !preview && (
            <motion.div
              className="pointer-events-none absolute inset-0 z-20 bg-[var(--pink)]"
              initial={{ clipPath: "polygon(100% 0, 100% 0, 100% 100%, 100% 100%)" }}
              animate={{
                clipPath: "polygon(35% 0, 100% 0, 100% 100%, 20% 100%)",
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              <p className="display-stamp absolute right-6 top-1/2 -translate-y-1/2 rotate-6 text-4xl text-[var(--ink)]">
                PASTE!
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0] || null)}
        />
      </button>

      {preview && (
        <motion.button
          type="button"
          aria-label="이미지 제거"
          className="absolute -right-2 -top-2 z-30 flex items-center gap-1 border-2 border-[var(--ink)] bg-[var(--pink)] px-2 py-1 text-[var(--ink)] shadow-[3px_3px_0_var(--ink)]"
          whileHover={reduce ? undefined : { rotate: -6, scale: 1.05 }}
          whileTap={reduce ? undefined : { y: 2, boxShadow: "0px 0px 0 var(--ink)" }}
          onClick={(e) => {
            e.stopPropagation();
            onFile(null);
          }}
        >
          <X size={14} strokeWidth={2.5} />
          <span className="xerox-label">retear</span>
        </motion.button>
      )}
    </motion.div>
  );
}
