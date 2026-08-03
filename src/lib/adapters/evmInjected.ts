import type { SupportedChain } from "@/lib/chains";

type EthProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

function getInjected(): EthProvider | null {
  if (typeof window === "undefined") return null;
  const eth = (window as unknown as { ethereum?: EthProvider }).ethereum;
  return eth?.request ? eth : null;
}

export async function connectEvmWallet(): Promise<string> {
  const ethereum = getInjected();
  if (!ethereum) {
    throw new Error(
      "MetaMask 등 EVM 지갑을 설치하거나 WalletConnect로 연결해 주세요.",
    );
  }
  const accounts = (await ethereum.request({
    method: "eth_requestAccounts",
  })) as string[];
  if (!accounts[0]) throw new Error("지갑 계정을 가져오지 못했습니다.");
  return accounts[0];
}

export async function switchEvmChain(
  chain: SupportedChain,
  provider?: EthProvider | null,
) {
  const ethereum = provider ?? getInjected();
  if (!ethereum || !chain.chainId) {
    throw new Error("체인을 전환할 수 없습니다.");
  }
  const hexId = `0x${chain.chainId.toString(16)}`;
  try {
    await ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: hexId }],
    });
  } catch (err: unknown) {
    const code = (err as { code?: number })?.code;
    if (code === 4902 || code === -32601) {
      await ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: hexId,
            chainName: chain.name,
            nativeCurrency: chain.nativeCurrency,
            rpcUrls: chain.rpcUrls,
            blockExplorerUrls: [chain.explorerUrl],
          },
        ],
      });
      return;
    }
    throw err;
  }
}
