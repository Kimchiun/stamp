"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { SupportedChain } from "@/lib/chains";
import { CHAINS } from "@/lib/chains";
import { ChainIcon } from "./ChainIcon";

const FAMILIES: { key: string; label: string }[] = [
  { key: "evm", label: "EVM" },
  { key: "solana", label: "Solana" },
  { key: "tron", label: "TRON" },
  { key: "xrpl", label: "XRPL" },
];

type Props = {
  selected: SupportedChain;
  onSelect: (chain: SupportedChain) => void;
};

export function ChainPicker({ selected, onSelect }: Props) {
  const reduce = useReducedMotion();

  return (
    <div className="space-y-6">
      {FAMILIES.map((fam) => {
        const items = CHAINS.filter((c) => c.family === fam.key);
        if (!items.length) return null;
        return (
          <div key={fam.key}>
            <div className="mb-3 flex items-center gap-3">
              <span className="xerox-label text-[var(--ink)]/60">{fam.label}</span>
              <span className="h-px flex-1 bg-[var(--ink)]/25" />
            </div>
            <div className="flex flex-wrap gap-2">
              {items.map((chain, i) => {
                const active = selected.id === chain.id;
                return (
                  <motion.button
                    key={chain.id}
                    type="button"
                    layout
                    initial={reduce ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      delay: reduce ? 0 : Math.min(i * 0.03, 0.24),
                      duration: 0.25,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    whileHover={
                      reduce || active
                        ? undefined
                        : {
                            y: -3,
                            rotate: -1.5,
                            boxShadow: "3px 4px 0 var(--ink)",
                          }
                    }
                    whileTap={
                      reduce
                        ? undefined
                        : {
                            y: 2,
                            scale: 0.96,
                            boxShadow: "0px 0px 0 var(--ink)",
                          }
                    }
                    onClick={() => onSelect(chain)}
                    title={chain.note || chain.name}
                    className={`relative inline-flex items-center gap-2 border-2 border-[var(--ink)] px-2.5 py-1.5 pr-3 ${
                      active
                        ? "bg-[var(--ink)] text-[var(--lime)]"
                        : "bg-[var(--cream)] text-[var(--ink)]"
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="chain-stamp"
                        className="pointer-events-none absolute -right-1 -top-1 border border-[var(--ink)] bg-[var(--pink)] px-1 font-mono text-xs font-bold text-[var(--ink)]"
                        initial={reduce ? false : { scale: 1.4, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                      >
                        OK
                      </motion.span>
                    )}
                    <ChainIcon id={chain.id} className="h-6 w-6 shrink-0" />
                    <span className="flex min-w-0 flex-col items-start leading-tight">
                      <span className="text-sm font-bold tracking-tight">
                        {chain.name}
                      </span>
                      <span
                        className={`font-mono text-xs tracking-wide ${
                          active
                            ? "text-[var(--lime)]/70"
                            : "text-[var(--ink)]/55"
                        }`}
                      >
                        {chain.nativeCurrency.symbol}
                        {chain.note ? " · ARB" : ""}
                      </span>
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
