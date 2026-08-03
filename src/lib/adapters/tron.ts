import type { SupportedChain } from "@/lib/chains";
import { explorerTx } from "@/lib/chains";
import type { MintInput, MintOutcome } from "./types";

type TronWindow = {
  tronWeb?: {
    defaultAddress?: { base58?: string };
    ready?: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  };
  tronLink?: {
    request: (args: { method: string }) => Promise<unknown>;
  };
};

function tronWin(): TronWindow {
  return window as unknown as TronWindow;
}

export async function connectTronWallet(): Promise<string> {
  const w = tronWin();
  if (!w.tronLink) {
    throw new Error("TronLink를 설치하거나 WalletConnect로 연결해 주세요.");
  }
  await w.tronLink.request({ method: "tron_requestAccounts" });
  await new Promise((r) => setTimeout(r, 400));
  const addr = w.tronWeb?.defaultAddress?.base58;
  if (!addr) throw new Error("Tron 지갑 주소를 가져오지 못했습니다.");
  return addr;
}

export async function mintOnTron(
  chain: SupportedChain,
  input: MintInput,
  ownerAddress: string,
): Promise<MintOutcome> {
  try {
    const tronWeb = tronWin().tronWeb;
    if (!tronWeb?.defaultAddress?.base58) {
      return {
        success: false,
        error: "TRON 지갑 연결이 필요합니다. WalletConnect로 연결해 주세요.",
      };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tw = tronWeb as any;
    const amount = Math.max(1, Math.floor(input.amount || 1));
    const isMulti = input.kind === "multi";

    const memo = JSON.stringify({
      type: isMulti ? "stamp-trc1155" : "stamp-trc721",
      standard: isMulti ? "TRC-1155" : "TRC-721",
      name: input.name,
      symbol: input.symbol,
      uri: input.tokenURI,
      amount: isMulti ? amount : 1,
      owner: ownerAddress,
    });

    const tx = await tw.transactionBuilder.sendTrx(
      ownerAddress,
      0,
      ownerAddress,
    );
    const memoHex = Array.from(new TextEncoder().encode(memo))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const withMemo = await tw.transactionBuilder.addUpdateData(tx, memoHex);
    const signed = await tw.trx.sign(withMemo);
    const result = await tw.trx.sendRawTransaction(signed);

    if (!result?.result && !result?.txid) {
      return {
        success: false,
        error: result?.message || "TRON 트랜잭션 전송 실패",
      };
    }

    const txHash = result.txid as string;
    return {
      success: true,
      txHash,
      explorerUrl: explorerTx(chain, txHash),
      tokenURI: input.tokenURI,
      imageUrl: input.imagePreview,
      amount: isMulti ? String(amount) : "1",
      kind: input.kind,
    };
  } catch (e: unknown) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "TRON 민팅 실패",
    };
  }
}
