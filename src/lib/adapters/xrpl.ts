import {
  acceptNFTOffer,
  createNFTOffer,
  getAddress,
  getNFT,
  isInstalled,
  mintNFT,
  submitBulkTransactions,
} from "@gemwallet/api";
import { Client } from "xrpl";
import type { SupportedChain } from "@/lib/chains";
import { explorerTx } from "@/lib/chains";
import type { MintInput, MintOutcome } from "./types";

const GEM_INSTALL_HINT =
  "GemWallet 브라우저 확장이 필요합니다. https://gemwallet.app 에서 설치한 뒤 이 페이지를 새로고침해 주세요.";

/** GemWallet이 MPT를 아직 검증하지 않아, 멀티는 NFToken 에디션으로 발행 */
export const MAX_XRPL_EDITIONS = 25;

export type XrplOwnedNft = {
  NFTokenID: string;
  URI?: string;
  Issuer?: string;
  NFTokenTaxon?: number;
};

export type XrplTransferOfferResult = {
  success: true;
  txHash: string;
  offerId?: string;
  nftTokenId: string;
  destination: string;
  explorerUrl: string;
  note: string;
};

export type XrplAcceptOfferResult = {
  success: true;
  txHash: string;
  explorerUrl: string;
};

function toHexUtf8(text: string) {
  return Array.from(new TextEncoder().encode(text))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

async function ensureGemWalletInstalled() {
  const installed = await isInstalled();
  if (!installed.result?.isInstalled) {
    throw new Error(GEM_INSTALL_HINT);
  }
}

export async function connectXrplWallet(): Promise<string> {
  await ensureGemWalletInstalled();

  const response = await getAddress();
  const address = response.result?.address;
  if (!address) {
    throw new Error("GemWallet에서 주소 공유를 승인해 주세요.");
  }
  return address;
}

async function withClient<T>(
  chain: SupportedChain,
  fn: (client: Client) => Promise<T>,
): Promise<T> {
  const client = new Client(chain.rpcUrls[0]);
  try {
    await client.connect();
    return await fn(client);
  } finally {
    await client.disconnect().catch(() => undefined);
  }
}

async function confirmTx(chain: SupportedChain, hash: string) {
  await withClient(chain, async (client) => {
    try {
      await client.request({ command: "tx", transaction: hash });
    } catch {
      /* ok */
    }
  });
}

export async function listOwnedXrplNfts(): Promise<XrplOwnedNft[]> {
  await ensureGemWalletInstalled();
  const response = await getNFT({ limit: 200 });
  const nfts = response.result?.account_nfts ?? [];
  return nfts.map((n) => ({
    NFTokenID: n.NFTokenID,
    URI: n.URI,
    Issuer: n.Issuer,
    NFTokenTaxon: n.NFTokenTaxon,
  }));
}

/**
 * GemWallet UI에 Send가 없으므로, Destination 지정 0-XRP Sell Offer를 만들어
 * 수신자가 Accept하도록 합니다. (XRPL NFToken 전송의 표준 경로)
 */
export async function createXrplNftTransferOffer(
  chain: SupportedChain,
  params: { nftTokenId: string; destination: string },
): Promise<XrplTransferOfferResult> {
  await ensureGemWalletInstalled();

  const nftTokenId = params.nftTokenId.trim();
  const destination = params.destination.trim();
  if (!/^[0-9A-Fa-f]{64}$/.test(nftTokenId)) {
    throw new Error("NFToken ID는 64자 hex여야 합니다.");
  }
  if (!/^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(destination)) {
    throw new Error("수신 XRPL 주소 형식이 올바르지 않습니다. (r…)");
  }

  const created = await createNFTOffer({
    NFTokenID: nftTokenId.toUpperCase(),
    amount: "0",
    destination,
    flags: {
      tfSellNFToken: true,
    },
  });

  const hash = created.result?.hash;
  if (!hash) {
    throw new Error("GemWallet에서 전송 오퍼 생성을 취소했거나 실패했습니다.");
  }

  await confirmTx(chain, hash);

  let offerId: string | undefined;
  try {
    offerId = await withClient(chain, async (client) => {
      await new Promise((r) => setTimeout(r, 1500));
      const offers = await client.request({
        command: "nft_sell_offers",
        nft_id: nftTokenId.toUpperCase(),
      });
      const match = offers.result.offers.find(
        (o) => o.destination === destination,
      );
      return match?.nft_offer_index;
    });
  } catch {
    /* offerId best-effort */
  }

  return {
    success: true,
    txHash: hash,
    offerId,
    nftTokenId: nftTokenId.toUpperCase(),
    destination,
    explorerUrl: explorerTx(chain, hash),
    note: offerId
      ? "전송 오퍼가 생성되었습니다. 수신자가 아래 Offer ID로 수락하면 소유권이 이전됩니다."
      : "전송 오퍼 트랜잭션은 제출되었습니다. Offer ID는 익스플로러/원장에서 확인하거나, 수신자가 nft_sell_offers로 찾아 수락해야 합니다.",
  };
}

export async function acceptXrplNftOffer(
  chain: SupportedChain,
  offerId: string,
): Promise<XrplAcceptOfferResult> {
  await ensureGemWalletInstalled();

  const id = offerId.trim();
  if (!/^[0-9A-Fa-f]{64}$/.test(id)) {
    throw new Error("Offer ID는 64자 hex여야 합니다.");
  }

  const accepted = await acceptNFTOffer({
    NFTokenSellOffer: id.toUpperCase(),
  });

  const hash = accepted.result?.hash;
  if (!hash) {
    throw new Error("GemWallet에서 오퍼 수락을 취소했거나 실패했습니다.");
  }

  await confirmTx(chain, hash);

  return {
    success: true,
    txHash: hash,
    explorerUrl: explorerTx(chain, hash),
  };
}

async function mintSingleNft(
  chain: SupportedChain,
  input: MintInput,
): Promise<MintOutcome> {
  const uriHex = toHexUtf8(input.tokenURI);
  const minted = await mintNFT({
    URI: uriHex,
    NFTokenTaxon: 0,
    flags: {
      tfTransferable: true,
    },
  });

  const hash = minted.result?.hash;
  const tokenId = minted.result?.NFTokenID;
  if (!hash) {
    return {
      success: false,
      error: "GemWallet에서 민트를 취소했거나 제출에 실패했습니다.",
    };
  }

  await confirmTx(chain, hash);

  return {
    success: true,
    txHash: hash,
    tokenId: tokenId || undefined,
    amount: "1",
    kind: input.kind,
    explorerUrl: explorerTx(chain, hash),
    tokenURI: input.tokenURI,
    imageUrl: input.imagePreview,
  };
}

export async function mintOnXrpl(
  chain: SupportedChain,
  input: MintInput,
  ownerAddress: string,
): Promise<MintOutcome> {
  try {
    await ensureGemWalletInstalled();

    const amount = Math.max(1, Math.floor(input.amount || 1));
    const isMulti = input.kind === "multi";

    if (!isMulti || amount === 1) {
      return mintSingleNft(chain, input);
    }

    if (amount > MAX_XRPL_EDITIONS) {
      return {
        success: false,
        error: `XRPL 에디션은 한 번에 최대 ${MAX_XRPL_EDITIONS}개까지입니다. GemWallet이 MPT(MPTokenIssuanceCreate)를 아직 지원하지 않아 NFToken으로 발행합니다.`,
      };
    }

    const uriHex = toHexUtf8(input.tokenURI);
    const bulk = await submitBulkTransactions({
      waitForHashes: true,
      transactions: Array.from({ length: amount }, (_, i) => ({
        ID: String(i + 1),
        TransactionType: "NFTokenMint" as const,
        Account: ownerAddress,
        URI: uriHex,
        NFTokenTaxon: 0,
        Flags: 8, // tfTransferable
      })),
    });

    const results = bulk.result?.transactions ?? [];
    const hashes = results
      .map((tx) => tx.hash)
      .filter((h): h is string => Boolean(h));
    const failed = results.find((tx) => tx.error || !tx.hash);

    if (hashes.length === 0) {
      return {
        success: false,
        error:
          failed?.error ||
          "GemWallet에서 에디션 민트를 취소했거나 제출에 실패했습니다.",
      };
    }

    const primaryHash = hashes[0];
    await confirmTx(chain, primaryHash);

    return {
      success: true,
      txHash: primaryHash,
      amount: String(hashes.length),
      kind: "multi",
      explorerUrl: explorerTx(chain, primaryHash),
      tokenURI: input.tokenURI,
      imageUrl: input.imagePreview,
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "XRP Ledger 민팅 실패";
    if (/MPTokenIssuanceCreate|Invalid field TransactionType/i.test(msg)) {
      return {
        success: false,
        error:
          "GemWallet이 MPT를 지원하지 않습니다. 멀티토큰은 NFToken 에디션으로 다시 시도해 주세요.",
      };
    }
    return { success: false, error: msg };
  }
}
