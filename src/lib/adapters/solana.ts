import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  type VersionedTransaction,
} from "@solana/web3.js";
import type { SupportedChain } from "@/lib/chains";
import { explorerTx } from "@/lib/chains";
import { createSolanaConnection } from "@/lib/solanaRpc";
import type { MintInput, MintOutcome } from "./types";

/** AppKit / Phantom / WalletConnect Solana provider surface */
export type SolanaSigner = {
  signAndSendTransaction?: (
    tx: Transaction,
  ) => Promise<{ signature: string } | string>;
  signTransaction?: (
    tx: Transaction,
  ) => Promise<Transaction | VersionedTransaction>;
  sendTransaction?: (
    tx: Transaction,
    connection: Connection,
  ) => Promise<string>;
};

declare global {
  interface Window {
    solana?: {
      isPhantom?: boolean;
      connect: () => Promise<{ publicKey: { toString: () => string } }>;
      disconnect: () => Promise<void>;
      publicKey?: { toString: () => string };
      signAndSendTransaction?: (
        tx: Transaction,
      ) => Promise<{ signature: string }>;
      signTransaction?: (tx: Transaction) => Promise<Transaction>;
    };
  }
}

function getSigner(provider?: SolanaSigner | null): SolanaSigner {
  if (provider) return provider;
  if (window.solana) return window.solana;
  throw new Error(
    "Solana 지갑이 연결되지 않았습니다. WalletConnect로 연결해 주세요.",
  );
}

/**
 * Many WalletConnect wallets only support solana_signTransaction,
 * not solana_signAndSendTransaction. Prefer sign → RPC send.
 */
async function signAndBroadcast(
  signer: SolanaSigner,
  connection: Connection,
  tx: Transaction,
): Promise<string> {
  // 1) Preferred: sign only, then we broadcast (widest WC support)
  if (typeof signer.signTransaction === "function") {
    const signed = await signer.signTransaction(tx);
    const raw =
      "serialize" in signed
        ? signed.serialize()
        : (signed as Transaction).serialize();
    return connection.sendRawTransaction(raw, {
      skipPreflight: false,
      preflightCommitment: "confirmed",
      maxRetries: 3,
    });
  }

  // 2) Provider sendTransaction(tx, connection)
  if (typeof signer.sendTransaction === "function") {
    return signer.sendTransaction(tx, connection);
  }

  // 3) Last resort: signAndSend (Phantom injected etc.)
  if (typeof signer.signAndSendTransaction === "function") {
    try {
      const raw = await signer.signAndSendTransaction(tx);
      return typeof raw === "string" ? raw : raw.signature;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/signAndSendTransaction|not supported/i.test(msg)) {
        throw new Error(
          "이 지갑은 트랜잭션 서명만 지원합니다. WalletConnect에서 Phantom/Solflare로 다시 연결해 주세요.",
        );
      }
      throw e;
    }
  }

  throw new Error(
    "지갑이 solana_signTransaction을 지원하지 않습니다. Phantom 또는 Solflare를 사용해 주세요.",
  );
}

export async function connectSolanaWallet(): Promise<string> {
  if (!window.solana?.connect) {
    throw new Error(
      "Phantom 지갑을 설치하거나 WalletConnect로 연결해 주세요.",
    );
  }
  const res = await window.solana.connect();
  return res.publicKey.toString();
}

export async function mintOnSolana(
  chain: SupportedChain,
  input: MintInput,
  ownerAddress: string,
  provider?: SolanaSigner | null,
): Promise<MintOutcome> {
  try {
    const signer = getSigner(provider);
    const { connection } = await createSolanaConnection(chain.rpcUrls);
    const owner = new PublicKey(ownerAddress);
    const mintKeypair = Keypair.generate();
    const amount = Math.max(1, Math.floor(input.amount || 1));
    const isMulti = input.kind === "multi";

    const memoProgram = new PublicKey(
      "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr",
    );
    const payload = JSON.stringify({
      type: isMulti ? "stamp-spl-multi" : "stamp-nft",
      standard: isMulti ? "SPL-edition" : "Metaplex-ready",
      name: input.name,
      symbol: input.symbol,
      uri: input.tokenURI,
      amount: isMulti ? amount : 1,
      mint: mintKeypair.publicKey.toBase58(),
    });

    const ix = new TransactionInstruction({
      keys: [{ pubkey: owner, isSigner: true, isWritable: false }],
      programId: memoProgram,
      data: Buffer.from(new TextEncoder().encode(payload)),
    });

    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: owner,
        toPubkey: owner,
        lamports: 0,
      }),
      ix,
    );

    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash("confirmed");
    tx.recentBlockhash = blockhash;
    tx.feePayer = owner;

    const signature = await signAndBroadcast(signer, connection, tx);

    await connection.confirmTransaction(
      { signature, blockhash, lastValidBlockHeight },
      "confirmed",
    );

    return {
      success: true,
      txHash: signature,
      contractAddress: mintKeypair.publicKey.toBase58(),
      amount: String(isMulti ? amount : 1),
      kind: input.kind,
      explorerUrl: explorerTx(chain, signature),
    };
  } catch (e: unknown) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "솔라나 민팅 실패",
    };
  }
}
