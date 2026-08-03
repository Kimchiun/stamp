/** Normalize WalletConnect / AppKit / injected wallet errors for UI. */

/** While >0, suppress noisy console.error from WC/ethers during RPC. */
let walletRpcSilenceDepth = 0;

export function beginWalletRpcSilence() {
  walletRpcSilenceDepth += 1;
}

export function endWalletRpcSilence() {
  walletRpcSilenceDepth = Math.max(0, walletRpcSilenceDepth - 1);
}

export function isWalletRpcSilenced(): boolean {
  return walletRpcSilenceDepth > 0;
}

function readErrorText(error: unknown): string {
  if (error == null) return "";
  if (typeof error === "string") return error;
  if (typeof error !== "object") return String(error);
  const e = error as {
    message?: string;
    shortMessage?: string;
    name?: string;
    code?: number | string;
  };
  return [e.message, e.shortMessage, e.name, typeof e.code === "string" ? e.code : ""]
    .filter(Boolean)
    .join(" ");
}

/** Empty / unparseable payloads Klip·WC often throw or console.error. */
export function isEmptyWalletPayload(error: unknown): boolean {
  if (error == null) return true;
  if (typeof error === "string") {
    const t = error.trim();
    return (
      t.length === 0 ||
      t === "{}" ||
      t === "[]" ||
      t === "null" ||
      t === "undefined"
    );
  }
  if (typeof error !== "object") return false;

  if (error instanceof Error) {
    const msg = (error.message || "").trim();
    return !msg || msg === "{}" || msg === "undefined";
  }

  try {
    const json = JSON.stringify(error);
    if (
      json === undefined ||
      json === "{}" ||
      json === "[]" ||
      json === "null"
    ) {
      return true;
    }
    if (
      /^\{"[^"]*":(-?\d+|""|null|undefined)(,"[^"]*":(-?\d+|""|null|undefined))*\}$/.test(
        json,
      )
    ) {
      const rec = error as Record<string, unknown>;
      const msg = rec.message;
      if (msg == null || msg === "") return true;
    }
  } catch {
    /* ignore */
  }

  const keys = Reflect.ownKeys(error as object);
  if (keys.length === 0) return true;

  const rec = error as Record<string | symbol, unknown>;
  const meaningful = keys.filter((k) => {
    const v = rec[k as keyof typeof rec];
    return v != null && v !== "";
  });
  if (meaningful.length === 0) return true;

  if (
    meaningful.length === 1 &&
    (meaningful[0] === "code" || meaningful[0] === "data")
  ) {
    return true;
  }

  return false;
}

/** Console args that would render as `{}` / blank in Next overlay. */
export function consoleArgsLookBlank(args: unknown[]): boolean {
  if (args.length === 0) return true;
  try {
    const parts = args.map((a) => {
      if (a == null) return "";
      if (typeof a === "string") return a.trim();
      if (typeof a === "number" || typeof a === "boolean") return String(a);
      if (a instanceof Error) return (a.message || "").trim();
      if (isEmptyWalletPayload(a)) return "";
      try {
        const j = JSON.stringify(a);
        if (!j || j === "{}" || j === "[]") return "";
        return j;
      } catch {
        return "";
      }
    });
    const joined = parts.join(" ").trim();
    return !joined || joined === "{}";
  } catch {
    return true;
  }
}

/** ethers could not map wallet error → usually empty `{}` from mobile WC. */
export function isCoalesceError(error: unknown): boolean {
  const text = readErrorText(error).toLowerCase();
  if (/could not coalesce error/.test(text)) return true;
  if (typeof error === "object" && error && "code" in error) {
    if (String((error as { code?: string }).code) === "UNKNOWN_ERROR") {
      const nested =
        (error as { info?: { error?: unknown }; error?: unknown }).info?.error ??
        (error as { error?: unknown }).error;
      if (isEmptyWalletPayload(nested) || nested == null) return true;
    }
  }
  return false;
}

export function isSessionStaleError(error: unknown): boolean {
  if (typeof error === "object" && error && "code" in error) {
    const code = String((error as { code?: string }).code);
    if (code === "WALLET_SESSION_STALE" || code === "WALLET_EMPTY_RESPONSE") {
      return true;
    }
  }
  const msg = readErrorText(error).toLowerCase();
  return /session|세션|다시 연결|빈 오류|응답이 비어/i.test(msg);
}

/**
 * Explicit user reject only — empty `{}` / coalesce are session issues, not cancel.
 */
export function isUserCancelledError(error: unknown): boolean {
  if (error == null) return false;
  if (typeof error === "string") {
    if (error === "CANCELLED") return true;
    return (
      /user rejected|user denied|user canceled|user cancelled|action_rejected|rejected the request|modal closed|closed by user|denied request/i.test(
        error,
      ) && !/session|세션|다시 연결/i.test(error)
    );
  }

  if (typeof error === "object") {
    const e = error as { code?: number | string };
    const code = String(e.code);
    if (
      code === "WALLET_EMPTY_RESPONSE" ||
      code === "WALLET_SESSION_STALE" ||
      code === "UNKNOWN_ERROR"
    ) {
      return false;
    }
    if (code === "ACTION_REJECTED") return true;
    const n = Number(e.code);
    // 4001 = user rejected (EIP-1193). Do NOT treat bare empty as cancel.
    if (n === 4001) {
      const msg = readErrorText(error).toLowerCase();
      // Our old wrap faked 4001 for empty — message was exactly this
      if (msg === "user rejected the request" && !("data" in e)) {
        // Could be real or faked; prefer session hint if no stack details
        return true;
      }
      return true;
    }
    // WC sometimes uses 5000 for reject; 5001/5002 also appear on disconnect
    if (n === 5000) {
      const msg = readErrorText(error).toLowerCase();
      if (/reject|denied|cancel/i.test(msg)) return true;
      // session delete / reset — not a deliberate mint cancel
      if (/session|disconnect|delete|reset/i.test(msg)) return false;
      return true;
    }

    const msg = readErrorText(error).toLowerCase();
    if (
      /user rejected|user denied|user canceled|user cancelled|action_rejected|rejected the request|modal closed|closed by user|denied request|ethers-user-denied/.test(
        msg,
      )
    ) {
      return true;
    }
  }

  return false;
}

export function formatWalletError(
  error: unknown,
  fallback = "지갑 요청에 실패했습니다.",
): string {
  if (typeof error === "object" && error && "code" in error) {
    const code = String((error as { code?: string }).code);
    if (code === "WALLET_EMPTY_RESPONSE" || code === "WALLET_SESSION_STALE") {
      return (
        (error as { message?: string }).message ||
        "지갑 세션 응답이 비어 있습니다. WalletConnect를 끊고 다시 연결해 주세요."
      );
    }
  }

  if (isUserCancelledError(error)) {
    return "지갑에서 요청을 취소했습니다.";
  }

  if (isCoalesceError(error) || isEmptyWalletPayload(error)) {
    return "지갑 세션이 만료되었거나 응답이 비어 있습니다. WalletConnect를 끊고 클립으로 다시 연결해 주세요.";
  }

  if (error instanceof Error && error.message) {
    if (/could not coalesce/i.test(error.message)) {
      return "지갑 세션 오류입니다. WalletConnect를 다시 연결한 뒤 승인해 주세요.";
    }
    return error.message;
  }

  if (typeof error === "string" && error.trim()) {
    if (error === "CANCELLED") {
      return "지갑에서 요청을 취소했습니다.";
    }
    return error;
  }

  if (typeof error === "object" && error) {
    const e = error as {
      message?: string;
      shortMessage?: string;
      details?: string;
    };
    const msg = e.shortMessage || e.message || e.details;
    if (msg && String(msg).trim()) return String(msg);
  }

  return fallback;
}

function sessionStaleError(method: string): Error {
  const err = new Error(
    `지갑 세션 응답이 비어 있습니다(${method}). 화면에서 연결 해제 후 WalletConnect로 클립을 다시 연결해 주세요.`,
  );
  (err as Error & { code: string }).code = "WALLET_SESSION_STALE";
  return err;
}

function emptyResponseError(method: string): Error {
  const err = new Error(
    method === "wallet_switchEthereumChain" ||
      method === "wallet_addEthereumChain"
      ? "네트워크 전환에 실패했습니다. 클립에서 민팅할 체인으로 바꾼 뒤 WalletConnect를 다시 연결해 주세요."
      : "지갑이 트랜잭션에 빈 오류를 반환했습니다. 연결을 다시 하고 체인·잔액을 확인해 주세요.",
  );
  (err as Error & { code: string }).code = "WALLET_EMPTY_RESPONSE";
  return err;
}

/**
 * Wrap EIP-1193: empty `{}` → session/empty errors (NOT fake 4001 cancel).
 */
export function wrapEip1193Provider<
  T extends {
    request: (args: {
      method: string;
      params?: unknown[];
    }) => Promise<unknown>;
  },
>(provider: T): T {
  const request = async (args: {
    method: string;
    params?: unknown[];
  }) => {
    beginWalletRpcSilence();
    try {
      return await provider.request(args);
    } catch (e: unknown) {
      // Real user reject — pass through
      if (isUserCancelledError(e) && !isEmptyWalletPayload(e)) {
        throw e;
      }
      if (isEmptyWalletPayload(e) || isCoalesceError(e)) {
        const mutating =
          args.method === "eth_sendTransaction" ||
          args.method === "eth_sendRawTransaction" ||
          args.method === "wallet_switchEthereumChain" ||
          args.method === "wallet_addEthereumChain";
        throw mutating
          ? emptyResponseError(args.method)
          : sessionStaleError(args.method);
      }
      throw e;
    } finally {
      endWalletRpcSilence();
    }
  };
  return new Proxy(provider, {
    get(target, prop, receiver) {
      if (prop === "request") return request;
      return Reflect.get(target, prop, receiver);
    },
  }) as T;
}
