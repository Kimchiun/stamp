"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Unplug, Wallet } from "lucide-react";
import { CHAINS, type SupportedChain } from "@/lib/chains";
import { mintNft, estimateEvmMintFee, type FeeEstimate, MAX_XRPL_EDITIONS, MAX_EVM_EDITIONS } from "@/lib/adapters";
import { uploadMetadata, checkPublicUploads, type UploadStatus } from "@/lib/ipfs";
import type { MintResult, TokenKind } from "@/lib/adapters/types";
import { validateKlipFields } from "@/lib/klipFilters";
import { useStampWallet } from "@/hooks/useStampWallet";
import { useBusyLock } from "@/hooks/useBusyLock";
import { formatWalletError } from "@/lib/wallet/errors";
import { ChainPicker } from "./ChainPicker";
import { ChainIcon } from "./ChainIcon";
import { TokenKindPicker } from "./TokenKindPicker";
import { MintForm } from "./MintForm";
import { MintStatus } from "./MintStatus";
import { XrplTransferPanel } from "./XrplTransferPanel";
import { FlyerSheet } from "./FlyerSheet";

export function MintWizard() {
  const [chain, setChain] = useState<SupportedChain>(CHAINS[0]);
  const [kind, setKind] = useState<TokenKind>("nft");
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("STAMP");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState(100);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus | null>(null);
  const [status, setStatus] = useState<
    | "idle"
    | "uploading"
    | "estimating"
    | "switch_network"
    | "deploy_contract"
    | "mint_tokens"
    | "minting"
    | "done"
    | "error"
  >("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MintResult | null>(null);
  const [fee, setFee] = useState<FeeEstimate | null>(null);

  const wallet = useStampWallet(chain);
  const mintLock = useBusyLock();
  const address = wallet.address;

  const flowBusy = mintLock.busy || wallet.busy;

  useEffect(() => {
    void checkPublicUploads()
      .then((s) => setUploadStatus(s))
      .catch(() =>
        setUploadStatus({
          publicUploads: false,
          klipReady: false,
          mode: "",
          gateway: "",
          publicBase: "",
          hint: "업로드 상태를 확인할 수 없습니다.",
        }),
      );
  }, []);

  const lockSymbol = chain.family === "evm";
  const effectiveSymbol = lockSymbol ? "STAMP" : symbol;

  const filterHits = useMemo(
    () =>
      validateKlipFields({
        name,
        symbol: effectiveSymbol,
        platformSymbol: lockSymbol,
      }),
    [name, effectiveSymbol, lockSymbol],
  );

  const canMint = useMemo(() => {
    if (!address || !name || !effectiveSymbol || !file || flowBusy) return false;
    if (kind === "multi" && amount < 1) return false;
    if (uploadStatus && !uploadStatus.publicUploads) return false;
    if (filterHits.length > 0) return false;
    return true;
  }, [
    address,
    name,
    effectiveSymbol,
    file,
    flowBusy,
    kind,
    amount,
    uploadStatus,
    filterHits.length,
  ]);

  const walletLabel = useMemo(() => {
    if (!address) return null;
    return `${address.slice(0, 6)}…${address.slice(-4)}`;
  }, [address]);

  function handleFile(f: File | null) {
    if (flowBusy) return;
    setFile(f);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  async function handleConnect() {
    if (flowBusy) return;
    setError(null);
    try {
      await wallet.connect();
    } catch (e: unknown) {
      setStatus("error");
      setError(formatWalletError(e, "지갑 연결 실패") || "지갑 연결 실패");
    }
  }

  async function handleDisconnect() {
    if (mintLock.busy) return;
    setError(null);
    await wallet.disconnect();
    setStatus("idle");
    setResult(null);
    setFee(null);
  }

  function handleChainSelect(next: SupportedChain) {
    if (flowBusy) return;
    setChain(next);
    if (next.family === "xrpl" && kind === "multi" && amount > MAX_XRPL_EDITIONS) {
      setAmount(MAX_XRPL_EDITIONS);
    }
    if (next.family === "evm" && kind === "multi" && amount > MAX_EVM_EDITIONS) {
      setAmount(MAX_EVM_EDITIONS);
    }
    setStatus("idle");
    setResult(null);
    setError(null);
    setFee(null);
  }

  function handleKindChange(next: TokenKind) {
    if (flowBusy) return;
    setKind(next);
    if (chain.family === "xrpl" && next === "multi" && amount > MAX_XRPL_EDITIONS) {
      setAmount(MAX_XRPL_EDITIONS);
    }
    if (chain.family === "evm" && next === "multi" && amount > MAX_EVM_EDITIONS) {
      setAmount(MAX_EVM_EDITIONS);
    }
    setStatus("idle");
    setResult(null);
    setError(null);
    setFee(null);
  }

  function handleMint() {
    if (!file || !address || !canMint) return;

    void mintLock.run(async () => {
      setError(null);
      setResult(null);
      setFee(null);
      try {
        setStatus("uploading");
        const uploaded = await uploadMetadata({
          file,
          name: name.trim(),
          description: description.trim(),
        });

        const mintInput = {
          kind,
          name: name.trim(),
          symbol: (lockSymbol ? "STAMP" : symbol.trim()) || "STAMP",
          description: description.trim(),
          tokenURI: uploaded.tokenURI,
          imagePreview: uploaded.imagePreview,
          amount: kind === "multi" ? amount : 1,
        };

        // EVM: AppKit 네트워크 맞춘 뒤 수수료 추정 → 배포 → 민트
        if (chain.family === "evm") {
          try {
            await wallet.ensureNetwork();
          } catch {
            /* ensureCorrectChain in adapter is the hard check */
          }
          setStatus("estimating");
          try {
            const est = await estimateEvmMintFee(chain, mintInput, address);
            setFee(est);
          } catch {
            /* best-effort */
          }
        }

        setStatus("minting");
        const outcome = await mintNft(chain, mintInput, address, {
          solanaProvider: wallet.solanaProvider,
          evmProvider: wallet.evmProvider,
          onEvmStep: (step) => setStatus(step),
        });

        if (!outcome.success) {
          setStatus("error");
          if (outcome.error === "CANCELLED") {
            setError(
              "지갑에서 요청을 취소했습니다. 클립에서 거절한 경우입니다. 다시 시도해 주세요.",
            );
            return;
          }
          setError(
            outcome.error ||
              "민팅 실패. WalletConnect를 끊고 다시 연결한 뒤 시도해 보세요.",
          );
          return;
        }

        setResult(outcome);
        setStatus("done");
      } catch (e: unknown) {
        setStatus("error");
        setError(
          formatWalletError(
            e,
            "민팅 실패. WalletConnect를 끊고 다시 연결해 보세요.",
          ) || "민팅 실패",
        );
      }
    });
  }

  const mintLabel =
    kind === "multi"
      ? `${chain.name}에서 ${amount.toLocaleString()}개 민트`
      : `${chain.name}에서 NFT 민트`;

  const connectLabel =
    chain.family === "xrpl"
      ? walletLabel
        ? `GemWallet · ${walletLabel}`
        : "GemWallet 연결"
      : walletLabel
        ? `WalletConnect · ${walletLabel}`
        : "WalletConnect 연결";

  const statusHint =
    status === "uploading"
      ? "업로드 중 — 추가 요청을 받지 않습니다"
      : status === "estimating"
        ? "수수료 추정 중 — 지갑 팝업 없음"
        : status === "switch_network"
          ? "네트워크 전환 승인 대기"
          : status === "deploy_contract"
            ? "공유 STAMP 컬렉션 배포 승인 대기 (체인 최초 1회)"
            : status === "mint_tokens" || status === "minting"
              ? "민트 승인 대기"
              : null;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8">
      {uploadStatus && !uploadStatus.publicUploads && (
        <div className="sheet sheet-pink sheet-torn px-5 py-4 text-sm text-[var(--ink)]">
          <p className="font-bold uppercase tracking-wide">미디어 업로드 설정이 필요합니다</p>
          <p className="mt-2 text-xs leading-relaxed text-[var(--ink)]/75">
            {uploadStatus.hint} S3/R2 사용 시{" "}
            <span className="font-mono">S3_*</span> 와{" "}
            <span className="font-mono">MEDIA_PUBLIC_BASE_URL</span> 을 .env 에
            넣고 서버를 재시작하세요.
          </p>
        </div>
      )}
      {uploadStatus?.publicUploads && !uploadStatus.klipReady && (
        <div className="sheet sheet-pink sheet-torn px-5 py-4 text-sm text-[var(--ink)]">
          <p className="font-bold uppercase tracking-wide">
            공개 HTTPS 미디어 설정 (클립용)
          </p>
          <p className="mt-2 text-xs leading-relaxed text-[var(--ink)]/75">
            {uploadStatus.hint}
            <br />
            현재 base:{" "}
            <span className="font-mono">{uploadStatus.publicBase || "(none)"}</span>
          </p>
          <ol className="mt-3 list-decimal space-y-1 pl-4 text-xs leading-relaxed text-[var(--ink)]/80">
            <li>
              Cloudflare → R2 → 버킷 생성 (예: <span className="font-mono">stamp-media</span>)
            </li>
            <li>
              R2 API Token 발급 →{" "}
              <span className="font-mono">S3_ACCESS_KEY_ID</span> /{" "}
              <span className="font-mono">S3_SECRET_ACCESS_KEY</span>
            </li>
            <li>
              <span className="font-mono">
                S3_ENDPOINT=https://&lt;ACCOUNT_ID&gt;.r2.cloudflarestorage.com
              </span>
            </li>
            <li>
              버킷 Public access 또는 Custom Domain →{" "}
              <span className="font-mono">MEDIA_PUBLIC_BASE_URL</span>
            </li>
            <li>
              터미널:{" "}
              <span className="font-mono">npm run media:check -- --probe</span>
            </li>
          </ol>
          {uploadStatus.checklist && uploadStatus.checklist.length > 0 && (
            <ul className="mt-3 space-y-1 text-xs">
              {uploadStatus.checklist.map((c) => (
                <li key={c.id} className="font-mono text-[var(--ink)]/70">
                  {c.done ? "[x]" : "[ ]"} {c.title}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {uploadStatus?.klipReady && (
        <p className="xerox-label text-[var(--lime)]">
          {uploadStatus.hint}
          {uploadStatus.usage && (
            <>
              {" · "}
              오늘 미디어{" "}
              {(uploadStatus.usage.usedBytes / (1024 * 1024)).toFixed(1)}/
              {uploadStatus.usage.limitMb}MB
            </>
          )}
        </p>
      )}
      {uploadStatus?.usage &&
        uploadStatus.usage.remainingBytes < 2 * 1024 * 1024 && (
          <div className="sheet sheet-pink sheet-torn px-5 py-4 text-sm text-[var(--ink)]">
            <p className="font-bold uppercase tracking-wide">
              일일 미디어 한도 임박
            </p>
            <p className="mt-2 text-xs leading-relaxed text-[var(--ink)]/75">
              한국 시간 기준 하루 {uploadStatus.usage.limitMb}MB까지 업로드할 수
              있습니다. 남은 용량 약{" "}
              {(uploadStatus.usage.remainingBytes / (1024 * 1024)).toFixed(1)}
              MB · 자정(KST)에 리셋됩니다.
            </p>
          </div>
        )}

      <FlyerSheet tone="lime" layer="Layer 01" title="1. 체인">
        <div className="mb-5 flex justify-end">
          <motion.div
            key={chain.id}
            initial={{ scale: 0.9, opacity: 0.5 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-flex items-center gap-2 border-2 border-[var(--ink)] bg-[var(--ink)] px-2.5 py-1.5 text-[var(--lime)]"
          >
            <ChainIcon id={chain.id} className="h-5 w-5" />
            <span className="text-sm font-bold">{chain.name}</span>
            <span className="font-mono text-xs opacity-70">
              {chain.nativeCurrency.symbol}
            </span>
          </motion.div>
        </div>
        <div className={flowBusy ? "pointer-events-none opacity-50" : undefined}>
          <ChainPicker selected={chain} onSelect={handleChainSelect} />
        </div>
        {chain.note && (
          <p className="mt-4 text-xs font-medium text-[var(--ink)]/70">{chain.note}</p>
        )}
      </FlyerSheet>

      <FlyerSheet tone="pink" layer="Layer 02" title="2. 유형">
        <div className={flowBusy ? "pointer-events-none opacity-50" : undefined}>
          <TokenKindPicker
            kind={kind}
            onChange={handleKindChange}
            family={chain.family}
          />
        </div>
      </FlyerSheet>

      <FlyerSheet
        tone="cream"
        layer="Layer 03"
        title={`3. ${kind === "multi" ? "에디션" : "작품"}`}
      >
        <div className={flowBusy ? "pointer-events-none opacity-50" : undefined}>
          <MintForm
            kind={kind}
            name={name}
            symbol={symbol}
            description={description}
            amount={amount}
            lockSymbol={lockSymbol}
            maxAmount={
              chain.family === "xrpl" && kind === "multi"
                ? MAX_XRPL_EDITIONS
                : chain.family === "evm" && kind === "multi"
                  ? MAX_EVM_EDITIONS
                  : undefined
            }
            preview={preview}
            onChange={(field, value) => {
              if (flowBusy) return;
              if (field === "name") setName(value);
              if (field === "symbol") setSymbol(value);
              if (field === "description") setDescription(value);
              if (field === "amount") {
                const n = Number(value);
                let next = Number.isFinite(n) ? Math.max(1, Math.floor(n)) : 1;
                if (chain.family === "xrpl" && kind === "multi") {
                  next = Math.min(next, MAX_XRPL_EDITIONS);
                }
                if (chain.family === "evm" && kind === "multi") {
                  next = Math.min(next, MAX_EVM_EDITIONS);
                }
                setAmount(next);
              }
            }}
            onFile={handleFile}
          />
        </div>
      </FlyerSheet>

      <FlyerSheet tone="cream" layer="Layer 04 · Press" title="4. 민팅">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <motion.button
            type="button"
            whileHover={flowBusy ? undefined : { y: -2 }}
            whileTap={flowBusy ? undefined : { y: 3, boxShadow: "0px 0px 0 var(--pink)" }}
            onClick={handleConnect}
            disabled={flowBusy}
            className="btn-stamp btn-ink"
          >
            <Wallet size={16} />
            {wallet.busy && !mintLock.busy ? "연결 처리 중…" : connectLabel}
          </motion.button>

          {wallet.isConnected && (
            <motion.button
              type="button"
              whileHover={flowBusy ? undefined : { y: -2 }}
              whileTap={flowBusy ? undefined : { y: 3, boxShadow: "0px 0px 0 var(--ink)" }}
              onClick={handleDisconnect}
              disabled={flowBusy}
              className="btn-stamp btn-ghost"
            >
              <Unplug size={16} />
              연결 해제
            </motion.button>
          )}

          <motion.button
            type="button"
            whileHover={!canMint ? undefined : { y: -2, rotate: -0.5 }}
            whileTap={
              !canMint
                ? undefined
                : { y: 4, scale: 0.97, boxShadow: "0px 0px 0 var(--ink)" }
            }
            disabled={!canMint}
            onClick={handleMint}
            className="btn-stamp btn-pink relative overflow-hidden"
          >
            {mintLock.busy ? "처리 중…" : mintLabel}
            {mintLock.busy && (
              <motion.span
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-[var(--ink)]/10"
                animate={{ x: ["-100%", "100%"] }}
                transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
              />
            )}
          </motion.button>
        </div>

        {chain.family === "xrpl" && !wallet.isConnected && (
          <p className="mt-4 text-xs text-[var(--ink)]/70">
            XRPL은 WalletConnect 대신{" "}
            <a
              href="https://gemwallet.app"
              target="_blank"
              rel="noreferrer"
              className="font-bold text-[var(--pink)] underline"
            >
              GemWallet
            </a>{" "}
            브라우저 확장이 필요합니다.
          </p>
        )}

        {statusHint && (
          <motion.p
            key={statusHint}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            className="mt-4 text-xs font-bold uppercase tracking-wide text-[var(--pink)]"
          >
            {statusHint}
          </motion.p>
        )}

        <div className="mt-5">
          <MintStatus
            status={status}
            error={error || wallet.error}
            result={result}
            chain={chain}
            kind={kind}
            mintAmount={amount}
          />
        </div>

        {fee && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 border-2 border-[var(--ink)] bg-[var(--lime)] px-4 py-3 text-sm text-[var(--ink)]"
          >
            <p className="font-bold uppercase tracking-wide">예상 네트워크 수수료</p>
            <p className="mt-1 font-mono text-sm">
              ≈ {Number(fee.totalFee).toFixed(6)} {fee.nativeSymbol}
            </p>
            <p className="mt-1 text-xs text-[var(--ink)]/70">
              가스 ≈ {Number(fee.totalGas).toLocaleString()} · {fee.gasPriceGwei}{" "}
              gwei · {fee.note}
            </p>
          </motion.div>
        )}

        {chain.family === "evm" && (
          <div className="mt-4 border-2 border-dashed border-[var(--ink)] px-4 py-3 text-xs leading-relaxed text-[var(--ink)]/75">
            <p className="font-bold text-[var(--ink)]">
              EVM · 공유 STAMP 컬렉션
            </p>
            <ol className="mt-2 list-decimal space-y-1 pl-4">
              <li>네트워크 전환 (이미 맞으면 생략)</li>
              <li>
                (체인당 최초) STAMP 컬렉션 배포
                {kind === "multi" ? " + 에디션 민터 배포" : ""}
              </li>
              <li>
                민트 1회
                {kind === "multi"
                  ? ` — ERC-721 에디션 ${amount.toLocaleString()}개 (동일 컬렉션·한 트랜잭션)`
                  : " — NFT 1개"}
              </li>
            </ol>
            <p className="mt-2">
              멀티토큰도 클립 호환을 위해 ERC-1155가 아니라 공유 STAMP ERC-721
              컬렉션에 수량만큼 찍습니다(지갑에 NFT 여러 장으로 표시). 온체인
              name/symbol은 STAMP. 작품 이름·이미지는 앱 도메인 메타 URL에
              들어갑니다. 이름·심볼 스캠 문구는 막습니다.
            </p>
            <p className="mt-2 text-[var(--ink)]">
              클립 갤러리 노출은 해당 컬렉션 주소를 클립에 등록해야 할 수 있습니다.
              등록 전에도 구조상 “민트마다 새 컨트랙트” 문제는 없습니다. 지갑
              네트워크가 {chain.name}인지 확인하세요.
              {chain.id === "chainbounty" && (
                <>
                  {" "}
                  ChainBounty는 chainId 51828 L3이며 가스는 BOUNTY입니다. 클립은
                  이 커스텀 체인을 지원하지 않을 수 있으니 MetaMask 등으로
                  연결·추가한 뒤 민트하세요.
                </>
              )}
            </p>
          </div>
        )}
        {chain.family !== "evm" && (
          <p className="mt-4 text-xs text-[var(--ink)]/70">
            처리가 끝날 때까지 추가 요청은 무시됩니다.
          </p>
        )}
      </FlyerSheet>

      {chain.family === "xrpl" && (
        <XrplTransferPanel
          chain={chain}
          connected={wallet.isConnected}
          busy={flowBusy}
          initialTokenId={result?.tokenId}
          onConnect={() => void handleConnect()}
        />
      )}
    </div>
  );
}
