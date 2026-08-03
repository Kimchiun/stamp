"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ExternalLink, Send, Inbox } from "lucide-react";
import type { SupportedChain } from "@/lib/chains";
import {
  acceptXrplNftOffer,
  createXrplNftTransferOffer,
  listOwnedXrplNfts,
  type XrplOwnedNft,
  type XrplTransferOfferResult,
} from "@/lib/adapters/xrpl";
import { formatWalletError } from "@/lib/wallet/errors";
import { useBusyLock } from "@/hooks/useBusyLock";

type Mode = "send" | "accept";

type Props = {
  chain: SupportedChain;
  connected: boolean;
  busy?: boolean;
  /** 민트 직후 Token ID를 미리 채움 */
  initialTokenId?: string | null;
  onConnect: () => void;
};

export function XrplTransferPanel({
  chain,
  connected,
  busy = false,
  initialTokenId,
  onConnect,
}: Props) {
  const lock = useBusyLock();
  const [mode, setMode] = useState<Mode>("send");
  const [tokenId, setTokenId] = useState(initialTokenId ?? "");
  const [destination, setDestination] = useState("");
  const [offerId, setOfferId] = useState("");
  const [owned, setOwned] = useState<XrplOwnedNft[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [offerResult, setOfferResult] =
    useState<XrplTransferOfferResult | null>(null);
  const [acceptHash, setAcceptHash] = useState<string | null>(null);
  const [acceptExplorer, setAcceptExplorer] = useState<string | null>(null);

  useEffect(() => {
    if (initialTokenId) setTokenId(initialTokenId);
  }, [initialTokenId]);

  useEffect(() => {
    if (!connected) {
      setOwned([]);
      return;
    }
    let cancelled = false;
    void listOwnedXrplNfts()
      .then((nfts) => {
        if (!cancelled) setOwned(nfts);
      })
      .catch(() => {
        if (!cancelled) setOwned([]);
      });
    return () => {
      cancelled = true;
    };
  }, [connected, offerResult, acceptHash]);

  const flowBusy = busy || lock.busy;

  async function handleCreateOffer() {
    if (flowBusy) return;
    setError(null);
    setOfferResult(null);
    await lock.run(async () => {
      try {
        const result = await createXrplNftTransferOffer(chain, {
          nftTokenId: tokenId,
          destination,
        });
        setOfferResult(result);
        if (result.offerId) setOfferId(result.offerId);
      } catch (e: unknown) {
        setError(
          formatWalletError(e, "전송 오퍼 생성 실패") || "전송 오퍼 생성 실패",
        );
      }
    });
  }

  async function handleAccept() {
    if (flowBusy) return;
    setError(null);
    setAcceptHash(null);
    setAcceptExplorer(null);
    await lock.run(async () => {
      try {
        const result = await acceptXrplNftOffer(chain, offerId);
        setAcceptHash(result.txHash);
        setAcceptExplorer(result.explorerUrl);
      } catch (e: unknown) {
        setError(
          formatWalletError(e, "오퍼 수락 실패") || "오퍼 수락 실패",
        );
      }
    });
  }

  return (
    <section className="sheet sheet-bleached sheet-torn relative space-y-4 px-5 py-7 md:px-8 md:py-9">
      <span className="staple absolute left-4 top-3" aria-hidden />
      <p className="xerox-label text-[var(--ink)]/55">Layer 05 · XRPL</p>
      <h2 className="display-stamp text-3xl text-[var(--ink)] md:text-5xl">
        5. 전송
      </h2>
      <p className="max-w-2xl text-sm leading-relaxed text-[var(--ink)]/75">
        GemWallet 상세 화면에는 Send가 없습니다. XRPL은{" "}
        <span className="font-bold text-[var(--ink)]">
          0 XRP Sell Offer + Destination
        </span>
        을 만들고, 수신자가 Offer를 수락해야 소유권이 이전됩니다. 보내기·받기
        모두 GemWallet 서명이 필요합니다.
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={flowBusy}
          onClick={() => setMode("send")}
          className={`btn-stamp ${
            mode === "send" ? "btn-ink" : "btn-ghost"
          }`}
        >
          <Send size={14} />
          보내기 (오퍼 생성)
        </button>
        <button
          type="button"
          disabled={flowBusy}
          onClick={() => setMode("accept")}
          className={`btn-stamp ${
            mode === "accept" ? "btn-ink" : "btn-ghost"
          }`}
        >
          <Inbox size={14} />
          받기 (오퍼 수락)
        </button>
      </div>

      {!connected ? (
        <motion.button
          type="button"
          whileTap={{ scale: 0.98 }}
          onClick={onConnect}
          disabled={flowBusy}
          className="btn-stamp btn-ink"
        >
          먼저 GemWallet 연결
        </motion.button>
      ) : mode === "send" ? (
        <div className="space-y-3">
          {owned.length > 0 && (
            <label className="block">
              <span className="xerox-label mb-1.5 block text-[var(--ink)]/55">
                내 NFT 선택
              </span>
              <select
                value={
                  owned.some((n) => n.NFTokenID === tokenId) ? tokenId : ""
                }
                disabled={flowBusy}
                onChange={(e) => setTokenId(e.target.value)}
                className="input-flyer"
              >
                <option value="">직접 입력 / 선택</option>
                {owned.map((n) => (
                  <option key={n.NFTokenID} value={n.NFTokenID}>
                    {n.NFTokenID.slice(0, 12)}…{n.NFTokenID.slice(-8)}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="block">
            <span className="xerox-label mb-1.5 block text-[var(--ink)]/55">
              NFToken ID
            </span>
            <input
              value={tokenId}
              disabled={flowBusy}
              onChange={(e) => setTokenId(e.target.value.trim())}
              placeholder="64자 hex Token ID"
              className="input-flyer font-mono"
            />
          </label>

          <label className="block">
            <span className="xerox-label mb-1.5 block text-[var(--ink)]/55">
              수신 주소 (GemWallet XRPL)
            </span>
            <input
              value={destination}
              disabled={flowBusy}
              onChange={(e) => setDestination(e.target.value.trim())}
              placeholder="r…"
              className="input-flyer font-mono"
            />
          </label>

          <motion.button
            type="button"
            whileTap={flowBusy ? undefined : { scale: 0.98 }}
            disabled={flowBusy || !tokenId || !destination}
            onClick={() => void handleCreateOffer()}
            className="btn-stamp btn-pink"
          >
            {lock.busy ? "서명 대기…" : "전송 오퍼 생성 (GemWallet)"}
          </motion.button>

          {offerResult && (
            <div className="border-2 border-[var(--ink)] bg-[var(--cream)] px-4 py-3 text-sm text-[var(--ink)]">
              <p className="font-bold">오퍼 생성됨</p>
              <p className="mt-1 text-xs text-[var(--ink)]/70">{offerResult.note}</p>
              {offerResult.offerId && (
                <p className="mt-2 break-all font-mono text-xs text-[var(--pink)]">
                  Offer ID: {offerResult.offerId}
                </p>
              )}
              <a
                href={offerResult.explorerUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-[var(--pink)] underline"
              >
                트랜잭션 보기 <ExternalLink size={12} />
              </a>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <label className="block">
            <span className="xerox-label mb-1.5 block text-[var(--ink)]/55">
              Sell Offer ID
            </span>
            <input
              value={offerId}
              disabled={flowBusy}
              onChange={(e) => setOfferId(e.target.value.trim())}
              placeholder="보낸 사람이 알려준 64자 Offer ID"
              className="input-flyer font-mono"
            />
          </label>

          <motion.button
            type="button"
            whileTap={flowBusy ? undefined : { scale: 0.98 }}
            disabled={flowBusy || !offerId}
            onClick={() => void handleAccept()}
            className="btn-stamp btn-pink"
          >
            {lock.busy ? "서명 대기…" : "오퍼 수락 (GemWallet)"}
          </motion.button>

          {acceptHash && acceptExplorer && (
            <div className="border-2 border-[var(--ink)] bg-[var(--cream)] px-4 py-3 text-sm text-[var(--ink)]">
              <p className="font-bold">수락 완료 · 소유권 이전됨</p>
              <a
                href={acceptExplorer}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1 font-mono text-xs text-[var(--pink)] underline"
              >
                {acceptHash.slice(0, 12)}… <ExternalLink size={12} />
              </a>
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="border-2 border-[var(--ink)] bg-[var(--pink)] px-4 py-3 text-sm font-medium text-[var(--ink)]">
          {error}
        </p>
      )}
    </section>
  );
}
