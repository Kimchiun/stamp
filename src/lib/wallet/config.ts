import { EthersAdapter } from "@reown/appkit-adapter-ethers";
import { SolanaAdapter } from "@reown/appkit-adapter-solana/react";
import { TronAdapter } from "@reown/appkit-adapter-tron";
import { TronLinkAdapter } from "@tronweb3/tronwallet-adapter-tronlink";
import {
  mainnet,
  bsc,
  polygon,
  arbitrum,
  avalanche,
  scroll,
  kaia,
  silicon,
  solana as solanaBase,
  tronMainnet,
  type AppKitNetwork,
} from "@reown/appkit/networks";
import { preferredSolanaRpc } from "@/lib/solanaRpc";

/** Public Reown demo ID works for localhost; replace in production */
export const projectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ||
  "b56e18d47c72ab683b10814fe9495694";

export const metadata = {
  name: "STAMP",
  description: "멀티체인 NFT · 멀티토큰 민팅",
  url:
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  icons: ["https://avatars.githubusercontent.com/u/37784886"],
};

const solanaRpc = preferredSolanaRpc();

/** Override WalletConnect default Solana RPC (often 403 without project auth) */
export const solana = {
  ...solanaBase,
  rpcUrls: {
    ...solanaBase.rpcUrls,
    default: {
      http: [solanaRpc],
    },
  },
} as AppKitNetwork;

/** ChainBounty Orbit L3 (parent: Arbitrum One) */
export const chainbounty = {
  id: 51828,
  name: "ChainBounty",
  network: "chainbounty",
  nativeCurrency: { name: "ChainBounty", symbol: "BOUNTY", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.chainbounty.io"] },
  },
  blockExplorers: {
    default: {
      name: "ChainBounty Explorer",
      url: "https://scan.chainbounty.io",
    },
  },
  testnet: false,
  chainNamespace: "eip155",
  caipNetworkId: "eip155:51828",
} as unknown as AppKitNetwork;

export const networks = [
  mainnet,
  bsc,
  polygon,
  arbitrum,
  avalanche,
  scroll,
  kaia,
  silicon,
  chainbounty,
  solana,
  tronMainnet,
] as [AppKitNetwork, ...AppKitNetwork[]];

export const ethersAdapter = new EthersAdapter();
export const solanaAdapter = new SolanaAdapter({
  connectionSettings: {
    commitment: "confirmed",
    wsEndpoint: undefined,
  },
});
export const tronAdapter = new TronAdapter({
  walletAdapters: [
    new TronLinkAdapter({
      openUrlWhenWalletNotFound: false,
      checkTimeout: 3000,
    }),
  ],
});

export const CHAIN_TO_APPKIT_ID: Record<string, number | string> = {
  ethereum: mainnet.id,
  bnb: bsc.id,
  polygon: polygon.id,
  arbitrum: arbitrum.id,
  avalanche: avalanche.id,
  scroll: scroll.id,
  kaia: kaia.id,
  silicon: silicon.id,
  chainbounty: chainbounty.id,
  solana: solana.id,
  tron: tronMainnet.id,
};
