"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  useAppKit,
  useAppKitAccount,
  useAppKitNetwork,
  useAppKitProvider,
  useDisconnect,
} from "@reown/appkit/react";
import type { Provider as SolanaProvider } from "@reown/appkit-adapter-solana/react";
import type { ChainFamily, SupportedChain } from "@/lib/chains";
import { connectXrplWallet } from "@/lib/adapters/xrpl";
import { formatWalletError, isUserCancelledError } from "@/lib/wallet/errors";
import { useBusyLock } from "@/hooks/useBusyLock";

type Namespace = "eip155" | "solana" | "tron";

type Eip1193 = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

function familyToNamespace(family: ChainFamily): Namespace | null {
  if (family === "evm") return "eip155";
  if (family === "solana") return "solana";
  if (family === "tron") return "tron";
  return null;
}

export function useStampWallet(chain: SupportedChain) {
  const { open } = useAppKit();
  const { disconnect } = useDisconnect();
  const { caipNetwork, switchNetwork } = useAppKitNetwork();
  const namespace = familyToNamespace(chain.family);
  const lock = useBusyLock();

  const evmAccount = useAppKitAccount({ namespace: "eip155" });
  const solAccount = useAppKitAccount({ namespace: "solana" });
  const tronAccount = useAppKitAccount({ namespace: "tron" });

  const { walletProvider: evmProvider } =
    useAppKitProvider<Eip1193>("eip155");
  const { walletProvider: solanaProvider } =
    useAppKitProvider<SolanaProvider>("solana");

  const [xrplAddress, setXrplAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const address = useMemo(() => {
    if (chain.family === "xrpl") return xrplAddress;
    if (chain.family === "evm") return evmAccount.address ?? null;
    if (chain.family === "solana") return solAccount.address ?? null;
    if (chain.family === "tron") return tronAccount.address ?? null;
    return null;
  }, [
    chain.family,
    xrplAddress,
    evmAccount.address,
    solAccount.address,
    tronAccount.address,
  ]);

  useEffect(() => {
    if (chain.family !== "xrpl") setXrplAddress(null);
  }, [chain.family]);

  const connect = useCallback(async () => {
    return lock.run(async () => {
      setError(null);
      if (chain.family === "xrpl") {
        try {
          const addr = await connectXrplWallet();
          setXrplAddress(addr);
          return addr;
        } catch (e: unknown) {
          const msg =
            formatWalletError(
              e,
              "GemWallet이 필요합니다. https://gemwallet.app 에서 확장 프로그램을 설치한 뒤 다시 시도해 주세요.",
            ) || "GemWallet 연결 실패";
          setError(msg);
          throw new Error(msg);
        }
      }

      if (!namespace) {
        setError("지원하지 않는 체인입니다.");
        return null;
      }

      try {
        await open({ namespace, view: "Connect" });
        return null;
      } catch (e: unknown) {
        if (!isUserCancelledError(e)) {
          setError(formatWalletError(e, "지갑 연결 실패"));
        }
        return null;
      }
    });
  }, [chain.family, namespace, open, lock]);

  const disconnectWallet = useCallback(async () => {
    return lock.run(async () => {
      setError(null);
      if (chain.family === "xrpl") {
        setXrplAddress(null);
        return;
      }
      try {
        if (namespace) {
          await disconnect({ namespace });
        } else {
          await disconnect();
        }
      } catch (e: unknown) {
        if (!isUserCancelledError(e)) {
          setError(formatWalletError(e, "연결 해제 실패") || null);
        }
      }
    });
  }, [chain.family, namespace, disconnect, lock]);

  const ensureNetwork = useCallback(async () => {
    if (chain.family !== "evm" || !chain.chainId) return;
    if (caipNetwork && Number(caipNetwork.id) === chain.chainId) return;

    try {
      const nets = await import("@reown/appkit/networks");
      const { chainbounty } = await import("@/lib/wallet/config");

      const map: Record<string, unknown> = {
        ethereum: nets.mainnet,
        bnb: nets.bsc,
        polygon: nets.polygon,
        arbitrum: nets.arbitrum,
        avalanche: nets.avalanche,
        scroll: nets.scroll,
        kaia: nets.kaia,
        silicon: nets.silicon,
        chainbounty,
      };
      const network = map[chain.id];
      if (network && typeof network === "object" && "id" in network) {
        await switchNetwork(network as Parameters<typeof switchNetwork>[0]);
      }
    } catch (e: unknown) {
      if (!isUserCancelledError(e)) {
        setError(formatWalletError(e, "네트워크 전환 실패"));
      }
    }
  }, [chain, caipNetwork, switchNetwork]);

  return {
    address,
    isConnected: Boolean(address),
    busy: lock.busy,
    connecting: lock.busy,
    disconnecting: lock.busy,
    error,
    connect,
    disconnect: disconnectWallet,
    ensureNetwork,
    evmProvider,
    solanaProvider,
    namespace,
  };
}
