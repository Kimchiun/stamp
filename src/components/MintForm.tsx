"use client";

import type { TokenKind } from "@/lib/adapters/types";
import { ImagePasteZone } from "./ImagePasteZone";
import {
  validateKlipFields,
  type FilterHit,
} from "@/lib/klipFilters";

type Props = {
  kind: TokenKind;
  name: string;
  symbol: string;
  description: string;
  amount: number;
  maxAmount?: number;
  preview: string | null;
  /** EVM uses shared STAMP collection — symbol is locked */
  lockSymbol?: boolean;
  onChange: (
    field: "name" | "symbol" | "description" | "amount",
    value: string,
  ) => void;
  onFile: (file: File | null) => void;
};

export function MintForm({
  kind,
  name,
  symbol,
  description,
  amount,
  maxAmount = 1_000_000,
  preview,
  lockSymbol = false,
  onChange,
  onFile,
}: Props) {
  const isMulti = kind === "multi";
  const hits: FilterHit[] = validateKlipFields({
    name,
    symbol: lockSymbol ? "STAMP" : symbol,
    platformSymbol: lockSymbol,
  });
  const nameHit = hits.find((h) => h.field === "name");
  const symbolHit = hits.find((h) => h.field === "symbol");

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_1.05fr]">
      <ImagePasteZone preview={preview} onFile={onFile} />

      <div className="flex flex-col gap-4">
        <label className="block">
          <span className="xerox-label mb-1.5 block text-[var(--ink)]/55">이름</span>
          <input
            value={name}
            onChange={(e) => onChange("name", e.target.value)}
            placeholder={isMulti ? "Summer Edition" : "My First NFT"}
            className="input-flyer"
          />
          {nameHit && (
            <span className="mt-1.5 block text-xs font-medium text-[var(--pink)]">
              {nameHit.reason}
            </span>
          )}
        </label>

        <div className={`grid gap-4 ${isMulti ? "grid-cols-2" : ""}`}>
          <label className="block">
            <span className="xerox-label mb-1.5 block text-[var(--ink)]/55">심볼</span>
            <input
              value={lockSymbol ? "STAMP" : symbol}
              disabled={lockSymbol}
              onChange={(e) =>
                onChange("symbol", e.target.value.toUpperCase().slice(0, 10))
              }
              placeholder="STAMP"
              className="input-flyer disabled:cursor-not-allowed disabled:opacity-70"
            />
            {lockSymbol ? (
              <span className="mt-1.5 block text-xs text-[var(--ink)]/60">
                EVM 공유 컬렉션 심볼은 STAMP로 고정됩니다. 작품 이름은 위 필드·메타데이터에만
                들어갑니다.
              </span>
            ) : (
              symbolHit && (
                <span className="mt-1.5 block text-xs font-medium text-[var(--pink)]">
                  {symbolHit.reason}
                </span>
              )
            )}
          </label>

          {isMulti && (
            <label className="block">
              <span className="xerox-label mb-1.5 block text-[var(--ink)]/55">
                발행 수량
              </span>
              <input
                type="number"
                min={1}
                max={maxAmount}
                value={amount}
                onChange={(e) => onChange("amount", e.target.value)}
                className="input-flyer"
              />
              {maxAmount < 1_000_000 && (
                <span className="mt-1 block text-xs text-[var(--ink)]/60">
                  최대 {maxAmount.toLocaleString()}개
                </span>
              )}
            </label>
          )}
        </div>

        <label className="block flex-1">
          <span className="xerox-label mb-1.5 block text-[var(--ink)]/55">설명</span>
          <textarea
            value={description}
            onChange={(e) => onChange("description", e.target.value)}
            placeholder={
              isMulti
                ? "이 에디션에 대한 짧은 설명"
                : "이 NFT에 대한 짧은 설명"
            }
            rows={4}
            className="input-flyer h-full min-h-[7rem] resize-none"
          />
        </label>
      </div>
    </div>
  );
}
