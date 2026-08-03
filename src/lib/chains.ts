export type ChainFamily = "evm" | "solana" | "tron" | "xrpl";

export type SupportedChain = {
  id: string;
  name: string;
  family: ChainFamily;
  /** EVM chain id; undefined for non-EVM */
  chainId?: number;
  nativeCurrency: { name: string; symbol: string; decimals: number };
  rpcUrls: string[];
  explorerUrl: string;
  explorerTxPath: string;
  explorerAddressPath: string;
  color: string;
  note?: string;
};

export const CHAINS: SupportedChain[] = [
  {
    id: "ethereum",
    name: "Ethereum",
    family: "evm",
    chainId: 1,
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: [
      "https://ethereum.publicnode.com",
      "https://cloudflare-eth.com",
      "https://eth.llamarpc.com",
      "https://1rpc.io/eth",
      "https://rpc.mevblocker.io",
    ],
    explorerUrl: "https://etherscan.io",
    explorerTxPath: "/tx/",
    explorerAddressPath: "/address/",
    color: "#0e0e0e",
  },
  {
    id: "bnb",
    name: "BNB Chain",
    family: "evm",
    chainId: 56,
    nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
    rpcUrls: ["https://bsc-dataseed.binance.org", "https://bsc-dataseed1.defibit.io"],
    explorerUrl: "https://bscscan.com",
    explorerTxPath: "/tx/",
    explorerAddressPath: "/address/",
    color: "#0e0e0e",
  },
  {
    id: "polygon",
    name: "Polygon",
    family: "evm",
    chainId: 137,
    nativeCurrency: { name: "POL", symbol: "POL", decimals: 18 },
    rpcUrls: [
      "https://polygon-rpc.com",
      "https://polygon-bor.publicnode.com",
      "https://1rpc.io/matic",
    ],
    explorerUrl: "https://polygonscan.com",
    explorerTxPath: "/tx/",
    explorerAddressPath: "/address/",
    color: "#0e0e0e",
  },
  {
    id: "arbitrum",
    name: "Arbitrum",
    family: "evm",
    chainId: 42161,
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: [
      "https://arb1.arbitrum.io/rpc",
      "https://arbitrum-one.publicnode.com",
      "https://1rpc.io/arb",
    ],
    explorerUrl: "https://arbiscan.io",
    explorerTxPath: "/tx/",
    explorerAddressPath: "/address/",
    color: "#0e0e0e",
  },
  {
    id: "avalanche",
    name: "Avalanche",
    family: "evm",
    chainId: 43114,
    nativeCurrency: { name: "Avalanche", symbol: "AVAX", decimals: 18 },
    rpcUrls: ["https://api.avax.network/ext/bc/C/rpc"],
    explorerUrl: "https://snowtrace.io",
    explorerTxPath: "/tx/",
    explorerAddressPath: "/address/",
    color: "#0e0e0e",
  },
  {
    id: "scroll",
    name: "Scroll",
    family: "evm",
    chainId: 534352,
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: ["https://rpc.scroll.io"],
    explorerUrl: "https://scrollscan.com",
    explorerTxPath: "/tx/",
    explorerAddressPath: "/address/",
    color: "#0e0e0e",
  },
  {
    id: "kaia",
    name: "Kaia",
    family: "evm",
    chainId: 8217,
    nativeCurrency: { name: "KAIA", symbol: "KAIA", decimals: 18 },
    rpcUrls: ["https://public-en.node.kaia.io"],
    explorerUrl: "https://kaiascan.io",
    explorerTxPath: "/tx/",
    explorerAddressPath: "/address/",
    color: "#0e0e0e",
  },
  {
    id: "silicon",
    name: "Silicon",
    family: "evm",
    chainId: 2355,
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: ["https://rpc.silicon.network", "https://silicon-mainnet.nodeinfra.com"],
    explorerUrl: "https://scope.silicon.network",
    explorerTxPath: "/tx/",
    explorerAddressPath: "/address/",
    color: "#0e0e0e",
  },
  {
    id: "chainbounty",
    name: "ChainBounty",
    family: "evm",
    chainId: 51828,
    nativeCurrency: { name: "ChainBounty", symbol: "BOUNTY", decimals: 18 },
    rpcUrls: ["https://rpc.chainbounty.io"],
    explorerUrl: "https://scan.chainbounty.io",
    explorerTxPath: "/tx/",
    explorerAddressPath: "/address/",
    color: "#0e0e0e",
    note: "Arbitrum One 위 Orbit L3. 가스 토큰은 BOUNTY입니다.",
  },
  {
    id: "solana",
    name: "Solana",
    family: "solana",
    nativeCurrency: { name: "SOL", symbol: "SOL", decimals: 9 },
    rpcUrls: [
      "https://solana-rpc.publicnode.com",
      "https://api.mainnet-beta.solana.com",
    ],
    explorerUrl: "https://explorer.solana.com",
    explorerTxPath: "/tx/",
    explorerAddressPath: "/address/",
    color: "#0e0e0e",
  },
  {
    id: "tron",
    name: "TRON",
    family: "tron",
    nativeCurrency: { name: "TRON", symbol: "TRX", decimals: 6 },
    rpcUrls: ["https://api.trongrid.io"],
    explorerUrl: "https://tronscan.org",
    explorerTxPath: "/#/transaction/",
    explorerAddressPath: "/#/address/",
    color: "#0e0e0e",
  },
  {
    id: "xrpl",
    name: "XRP Ledger",
    family: "xrpl",
    nativeCurrency: { name: "XRP", symbol: "XRP", decimals: 6 },
    rpcUrls: ["wss://xrplcluster.com", "wss://s1.ripple.com"],
    explorerUrl: "https://livenet.xrpl.org",
    explorerTxPath: "/transactions/",
    explorerAddressPath: "/accounts/",
    color: "#0e0e0e",
  },
];

export function getChain(id: string): SupportedChain | undefined {
  return CHAINS.find((c) => c.id === id);
}

export function explorerTx(chain: SupportedChain, hash: string) {
  return `${chain.explorerUrl}${chain.explorerTxPath}${hash}`;
}

export function explorerAddress(chain: SupportedChain, address: string) {
  return `${chain.explorerUrl}${chain.explorerAddressPath}${address}`;
}
