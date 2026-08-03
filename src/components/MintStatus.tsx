"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, ExternalLink, Loader2 } from "lucide-react";
import type { MintResult } from "@/lib/adapters/types";
import { explorerAddress, type SupportedChain } from "@/lib/chains";

type Props = {
  status:
    | "idle"
    | "uploading"
    | "estimating"
    | "switch_network"
    | "deploy_contract"
    | "mint_tokens"
    | "minting"
    | "done"
    | "error";
  error?: string | null;
  result?: MintResult | null;
  chain: SupportedChain;
  mintAmount?: number;
  kind?: "nft" | "multi";
};

const fade = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0 },
  transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] as const },
};

export function MintStatus({
  status,
  error,
  result,
  chain,
  mintAmount = 1,
  kind = "nft",
}: Props) {
  return (
    <AnimatePresence mode="wait">
      {status === "uploading" && (
        <motion.div key="uploading" {...fade} className="flex items-center gap-3 border-2 border-[var(--ink)] bg-[var(--lime)] px-4 py-3 text-sm text-[var(--ink)]">
          <Loader2 className="animate-spin" size={18} />
          메타데이터 업로드 중… (지갑 요청 없음)
        </motion.div>
      )}
      {status === "estimating" && (
        <motion.div key="estimating" {...fade} className="flex items-center gap-3 border-2 border-[var(--ink)] bg-[var(--lime)] px-4 py-3 text-sm text-[var(--ink)]">
          <Loader2 className="animate-spin" size={18} />
          수수료 추정 중… (지갑 요청 없음)
        </motion.div>
      )}
      {status === "switch_network" && (
        <motion.div key="switch" {...fade} className="flex items-center gap-3 border-2 border-[var(--ink)] bg-[var(--lime)] px-4 py-3 text-sm text-[var(--ink)]">
          <Loader2 className="animate-spin" size={18} />
          지갑: 네트워크를 {chain.name}(으)로 전환해 주세요
        </motion.div>
      )}
      {status === "deploy_contract" && (
        <motion.div key="deploy" {...fade} className="border-2 border-[var(--ink)] bg-[var(--lime)] px-4 py-3 text-sm text-[var(--ink)]">
          <div className="flex items-center gap-3">
            <Loader2 className="animate-spin" size={18} />
            <span className="font-bold">
              지갑 승인 — 공유 STAMP{" "}
              {kind === "multi" ? "ERC-1155" : "ERC-721"} 컬렉션 배포 (체인 최초)
            </span>
          </div>
          <p className="mt-1.5 pl-8 text-xs text-[var(--ink)]/70">
            이 체인에 STAMP 컬렉션이 아직 없어 한 번 배포합니다. 이후 민트는 같은
            주소로만 갑니다.{" "}
            <span className="font-bold">클립/지갑 앱을 열어 승인해 주세요.</span>
          </p>
        </motion.div>
      )}
      {(status === "mint_tokens" || status === "minting") && (
        <motion.div key="mint" {...fade} className="border-2 border-[var(--ink)] bg-[var(--lime)] px-4 py-3 text-sm text-[var(--ink)]">
          <div className="flex items-center gap-3">
            <Loader2 className="animate-spin" size={18} />
            <span className="font-bold">
              지갑 승인 —{" "}
              {kind === "multi"
                ? `멀티토큰 ${mintAmount.toLocaleString()}개 민트`
                : "NFT 1개 민트"}
            </span>
          </div>
          <p className="mt-1.5 pl-8 text-xs text-[var(--ink)]/70">
            {kind === "multi"
              ? "공유 컬렉션에 수량 일괄 민트 1건입니다."
              : "공유 STAMP 컬렉션에 토큰 1개 민트입니다."}
          </p>
        </motion.div>
      )}
      {error && (status === "error" || status === "idle") && (
        <motion.div
          key="error"
          {...fade}
          className="border-2 border-[var(--ink)] bg-[var(--pink)] px-4 py-3 text-sm font-medium text-[var(--ink)]"
        >
          {error}
        </motion.div>
      )}
      {status === "done" && result && (
        <motion.div
          key="done"
          {...fade}
          className="border-2 border-[var(--ink)] bg-[var(--cream)] p-4 text-[var(--ink)]"
        >
          <div className="mb-3 flex items-center gap-2 text-[var(--pink)]">
            <CheckCircle2 size={20} />
            <span className="font-bold text-[var(--ink)]">민팅 완료</span>
          </div>
          {(result.imageUrl || result.tokenURI) && (
            <div className="mb-4 space-y-2">
              {result.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={result.imageUrl}
                  alt="민팅된 이미지"
                  className="max-h-48 w-auto border-2 border-[var(--ink)] object-contain"
                />
              )}
              {result.tokenURI && (
                <p className="break-all text-xs text-[var(--ink)]/65">
                  메타데이터:{" "}
                  <a
                    href={result.tokenURI}
                    target="_blank"
                    rel="noreferrer"
                    className="font-bold text-[var(--pink)] underline"
                  >
                    {result.tokenURI}
                  </a>
                </p>
              )}
              {result.imageUrl && (
                <p className="break-all text-xs text-[var(--ink)]/65">
                  이미지:{" "}
                  <a
                    href={result.imageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-bold text-[var(--pink)] underline"
                  >
                    {result.imageUrl}
                  </a>
                </p>
              )}
            </div>
          )}
          <dl className="space-y-2 text-sm">
            {result.kind && (
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--ink)]/55">유형</dt>
                <dd className="font-bold">
                  {result.kind === "multi"
                    ? "멀티토큰 · ERC-1155"
                    : "NFT · ERC-721"}
                </dd>
              </div>
            )}
            {result.tokenId && (
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--ink)]/55">Token ID</dt>
                <dd className="font-mono">{result.tokenId}</dd>
              </div>
            )}
            {result.amount && (
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--ink)]/55">수량</dt>
                <dd className="font-mono">{result.amount}</dd>
              </div>
            )}
            {result.contractAddress && (
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--ink)]/55">컨트랙트</dt>
                <dd>
                  <a
                    href={explorerAddress(chain, result.contractAddress)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-mono text-[var(--pink)] hover:underline"
                  >
                    {result.contractAddress.slice(0, 8)}…
                    <ExternalLink size={12} />
                  </a>
                </dd>
              </div>
            )}
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--ink)]/55">트랜잭션</dt>
              <dd>
                <a
                  href={result.explorerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-mono text-[var(--pink)] hover:underline"
                >
                  {result.txHash.slice(0, 10)}…
                  <ExternalLink size={12} />
                </a>
              </dd>
            </div>
          </dl>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
