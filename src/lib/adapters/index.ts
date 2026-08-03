import type { SupportedChain } from "@/lib/chains";
import type { MintInput, MintOutcome } from "./types";
import { connectEvmWallet, mintOnEvm } from "./evm";
import {
  connectSolanaWallet,
  mintOnSolana,
  type SolanaSigner,
} from "./solana";
import { connectTronWallet, mintOnTron } from "./tron";
import { connectXrplWallet, mintOnXrpl } from "./xrpl";
import { validateKlipFields } from "@/lib/klipFilters";

export type MintOptions = {
  solanaProvider?: SolanaSigner | null;
  evmProvider?: {
    request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  } | null;
  onEvmStep?: (step: import("./evm").EvmMintStep) => void;
};

export async function connectWallet(chain: SupportedChain): Promise<string> {
  switch (chain.family) {
    case "evm":
      return connectEvmWallet();
    case "solana":
      return connectSolanaWallet();
    case "tron":
      return connectTronWallet();
    case "xrpl":
      return connectXrplWallet();
  }
}

export async function mintNft(
  chain: SupportedChain,
  input: MintInput,
  address: string,
  options?: MintOptions,
): Promise<MintOutcome> {
  const hits = validateKlipFields({
    name: input.name,
    symbol: input.symbol,
    // EVM collection identity is fixed STAMP; only metadata name is user-controlled
    platformSymbol: chain.family === "evm",
  });
  if (hits.length > 0) {
    return { success: false, error: hits.map((h) => h.reason).join(" ") };
  }

  switch (chain.family) {
    case "evm":
      return mintOnEvm(chain, input, address, {
        eip1193: options?.evmProvider,
        onStep: options?.onEvmStep,
      });
    case "solana":
      return mintOnSolana(chain, input, address, options?.solanaProvider);
    case "tron":
      return mintOnTron(chain, input, address);
    case "xrpl":
      return mintOnXrpl(chain, input, address);
  }
}

export { connectEvmWallet, mintOnEvm, estimateEvmMintFee, MAX_EVM_EDITIONS } from "./evm";
export type { FeeEstimate, EvmMintStep } from "./evm";
export { connectSolanaWallet, mintOnSolana } from "./solana";
export { connectTronWallet, mintOnTron } from "./tron";
export {
  connectXrplWallet,
  mintOnXrpl,
  MAX_XRPL_EDITIONS,
  listOwnedXrplNfts,
  createXrplNftTransferOffer,
  acceptXrplNftOffer,
} from "./xrpl";
export type {
  XrplOwnedNft,
  XrplTransferOfferResult,
  XrplAcceptOfferResult,
} from "./xrpl";
