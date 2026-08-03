"use client";

import { type ReactNode, useLayoutEffect } from "react";
import { createAppKit } from "@reown/appkit/react";
import {
  ethersAdapter,
  solanaAdapter,
  tronAdapter,
  networks,
  projectId,
  metadata,
} from "@/lib/wallet/config";
import {
  isUserCancelledError,
  isEmptyWalletPayload,
  isCoalesceError,
  isWalletRpcSilenced,
  consoleArgsLookBlank,
} from "@/lib/wallet/errors";

function isFormatOnly(value: unknown): boolean {
  return typeof value === "string" && /^%[\w.]*$/.test(value.trim());
}

function isNoisyWalletConsoleArgs(args: unknown[]): boolean {
  // While ethereum.request is in flight, WC often console.error({}) — drop all noise
  if (isWalletRpcSilenced()) {
    if (consoleArgsLookBlank(args)) return true;
    if (args.every((a) => typeof a !== "string" || a.length < 80)) {
      // Keep only clearly app-level messages during RPC
      const text = args
        .filter((a): a is string => typeof a === "string")
        .join(" ");
      if (!text || /coalesce|reject|cancel|\{\}/i.test(text)) return true;
      if (args.some((a) => isEmptyWalletPayload(a) || isCoalesceError(a))) {
        return true;
      }
    }
  }

  if (args.length === 0) return true;
  if (consoleArgsLookBlank(args)) return true;

  const meaningful = args.filter((a) => !isFormatOnly(a));
  if (meaningful.length === 0) return true;
  if (meaningful.every((a) => isEmptyWalletPayload(a) || isCoalesceError(a))) {
    return true;
  }

  if (
    meaningful.some(
      (a) =>
        isCoalesceError(a) ||
        (typeof a === "string" && /coalesce/i.test(a)),
    )
  ) {
    return true;
  }

  if (
    meaningful.some((a) => isUserCancelledError(a)) &&
    meaningful.every(
      (a) =>
        typeof a === "string" ||
        isEmptyWalletPayload(a) ||
        isUserCancelledError(a),
    )
  ) {
    return true;
  }

  return false;
}

type FilteredConsole = typeof console.error & { __stampFilter?: true };

/**
 * Must stay outermost. Next Dev Overlay patches console.error and will show
 * `{}` if it wraps us — so we re-wrap whenever the current handler isn't ours.
 */
function installConsoleFilter() {
  if (typeof window === "undefined") return;

  const current = console.error as FilteredConsole;
  if (current.__stampFilter) return;

  const inner = current.bind(console);
  const filtered: FilteredConsole = (...args: unknown[]) => {
    if (isNoisyWalletConsoleArgs(args)) return;
    inner(...args);
  };
  filtered.__stampFilter = true;
  console.error = filtered;
}

installConsoleFilter();

createAppKit({
  adapters: [ethersAdapter, solanaAdapter, tronAdapter],
  networks,
  projectId,
  metadata,
  themeMode: "light",
  features: {
    analytics: false,
    email: false,
    socials: false,
  },
});

export function Web3Providers({ children }: { children: ReactNode }) {
  useLayoutEffect(() => {
    installConsoleFilter();
    const delays = [0, 50, 200, 500, 1000, 2000, 4000, 8000];
    const timers = delays.map((ms) =>
      window.setTimeout(installConsoleFilter, ms),
    );
    // Keep winning the race against Next's late console patch for a while
    const interval = window.setInterval(installConsoleFilter, 1000);
    const stop = window.setTimeout(() => window.clearInterval(interval), 60_000);
    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      window.clearInterval(interval);
      window.clearTimeout(stop);
    };
  }, []);

  return children;
}
