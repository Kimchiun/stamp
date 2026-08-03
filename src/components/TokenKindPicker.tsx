"use client";

import { motion } from "framer-motion";
import type { TokenKind } from "@/lib/adapters/types";
import type { ChainFamily } from "@/lib/chains";

type Props = {
  kind: TokenKind;
  onChange: (kind: TokenKind) => void;
  family: ChainFamily;
};

function badges(family: ChainFamily) {
  switch (family) {
    case "evm":
      return { nft: "ERC-721", multi: "Edition × ERC-721" };
    case "solana":
      return { nft: "Metaplex", multi: "SPL Edition" };
    case "tron":
      return { nft: "TRC-721", multi: "TRC-1155" };
    case "xrpl":
      return { nft: "NFToken", multi: "Edition" };
  }
}

function descriptions(family: ChainFamily) {
  switch (family) {
    case "evm":
      return {
        nft: "고유한 1개 토큰. 수집품·아트·증명서에 적합합니다.",
        multi:
          "같은 작품 에디션을 여러 개(ERC-721·동일 컬렉션). 클립이 ERC-1155 멀티를 막는 경우가 있어 NFT와 같은 형태로 발행합니다.",
      };
    case "solana":
      return {
        nft: "고유 NFT 메타데이터를 온체인에 기록합니다.",
        multi: "동일 에셋의 수량(에디션)을 지정해 발행합니다.",
      };
    case "tron":
      return {
        nft: "TRC-721 스타일 단일 NFT를 기록합니다.",
        multi: "TRC-1155 스타일로 수량을 지정해 발행합니다.",
      };
    case "xrpl":
      return {
        nft: "XRPL NFToken 1개를 민트합니다.",
        multi:
          "동일 메타데이터의 NFToken을 수량만큼 발행합니다. (GemWallet은 MPT 미지원)",
      };
  }
}

export function TokenKindPicker({ kind, onChange, family }: Props) {
  const b = badges(family);
  const d = descriptions(family);

  const OPTIONS: {
    id: TokenKind;
    title: string;
    badge: string;
    desc: string;
  }[] = [
    { id: "nft", title: "NFT", badge: b.nft, desc: d.nft },
    { id: "multi", title: "멀티토큰", badge: b.multi, desc: d.multi },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {OPTIONS.map((opt) => {
        const active = kind === opt.id;
        return (
          <motion.button
            key={opt.id}
            type="button"
            whileTap={{ scale: 0.98, y: 2 }}
            whileHover={{ y: -3, boxShadow: "4px 5px 0 var(--ink)" }}
            onClick={() => onChange(opt.id)}
            className={`border-2 border-[var(--ink)] px-4 py-4 text-left transition-colors duration-150 ${
              active
                ? "bg-[var(--ink)] text-[var(--cream)] shadow-[2px_2px_0_var(--lime)]"
                : "bg-[var(--cream)] text-[var(--ink)]"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold tracking-tight">{opt.title}</span>
              <span
                className={`border border-current px-1.5 py-0.5 font-mono text-xs tracking-wide ${
                  active ? "text-[var(--lime)]" : "text-[var(--ink)]/60"
                }`}
              >
                {opt.badge}
              </span>
            </div>
            <p
              className={`mt-2 text-xs leading-relaxed ${
                active ? "text-[var(--cream)]/70" : "text-[var(--ink)]/70"
              }`}
            >
              {opt.desc}
            </p>
          </motion.button>
        );
      })}
    </div>
  );
}
