export type TokenKind = "nft" | "multi";

export type MintInput = {
  kind: TokenKind;
  name: string;
  symbol: string;
  description: string;
  /** IPFS or HTTPS metadata URI */
  tokenURI: string;
  /** Optional image preview URL for UI */
  imagePreview?: string;
  /** ERC-1155 mint amount (ignored for NFT) */
  amount?: number;
};

export type MintResult = {
  success: true;
  txHash: string;
  contractAddress?: string;
  tokenId?: string;
  amount?: string;
  kind?: TokenKind;
  explorerUrl: string;
  /** On-chain metadata URI (public HTTPS / ipfs) */
  tokenURI?: string;
  /** Public image URL from metadata */
  imageUrl?: string;
};

export type MintError = {
  success: false;
  error: string;
};

export type MintOutcome = MintResult | MintError;

export type WalletSession = {
  address: string;
  family: "evm" | "solana" | "tron" | "xrpl";
};
