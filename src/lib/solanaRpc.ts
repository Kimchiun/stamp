import { Connection } from "@solana/web3.js";

/** Working free public endpoints (mainnet-beta.solana.com often 403s in browsers) */
export const SOLANA_RPC_FALLBACKS = [
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL,
  "https://solana-rpc.publicnode.com",
  "https://api.mainnet-beta.solana.com",
].filter(Boolean) as string[];

export function preferredSolanaRpc(): string {
  return SOLANA_RPC_FALLBACKS[0];
}

/**
 * Official / WalletConnect RPC often returns 403 from browsers.
 * Probe endpoints until getLatestBlockhash succeeds.
 */
export async function createSolanaConnection(
  preferredUrls: string[] = [],
): Promise<{ connection: Connection; rpcUrl: string }> {
  const urls = Array.from(
    new Set([...preferredUrls, ...SOLANA_RPC_FALLBACKS]),
  );

  let lastError: unknown;

  for (const rpcUrl of urls) {
    try {
      const connection = new Connection(rpcUrl, {
        commitment: "confirmed",
        confirmTransactionInitialTimeout: 60_000,
      });
      await connection.getLatestBlockhash("confirmed");
      return { connection, rpcUrl };
    } catch (e) {
      lastError = e;
      const detail =
        e instanceof Error
          ? e.message
          : typeof e === "object" && e && "message" in e
            ? String((e as { message: unknown }).message)
            : String(e);
      if (detail && detail !== "[object Object]") {
        console.warn(`[solana-rpc] failed: ${rpcUrl} — ${detail}`);
      }
    }
  }

  const detail =
    lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(
    `Solana RPC 연결 실패. .env.local에 NEXT_PUBLIC_SOLANA_RPC_URL(Helius/Alchemy)을 넣어 주세요. (${detail})`,
  );
}
