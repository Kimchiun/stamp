import {
  BrowserProvider,
  Contract,
  ContractFactory,
  JsonRpcProvider,
  concat,
  formatEther,
  getAddress,
  getCreate2Address,
  hexlify,
  id,
  keccak256,
  toQuantity,
  type Eip1193Provider,
  type Signer,
  type TransactionRequest,
} from "ethers";
import type { SupportedChain } from "@/lib/chains";
import { explorerTx } from "@/lib/chains";
import type { MintInput, MintOutcome } from "./types";
import nftArtifact from "@/lib/contracts/StampOpenNFT.json";
import editionMinterArtifact from "@/lib/contracts/StampEditionMinter.json";
import { connectEvmWallet, switchEvmChain } from "./evmInjected";
import { wrapEip1193Provider, isUserCancelledError } from "@/lib/wallet/errors";
import {
  PLATFORM_COLLECTION_NAME,
  PLATFORM_COLLECTION_SYMBOL,
  validateKlipFields,
} from "@/lib/klipFilters";

export { connectEvmWallet, switchEvmChain };

/**
 * Arachnid/Nick deterministic deployer — present on ETH/BNB/Polygon/Arb/etc.
 * Lets us deploy WITH a `to` address (Klip WaaS requires To).
 */
const CREATE2_DEPLOYER = getAddress(
  "0x4e59b44847b379578588920ca78fbf26c0b4956c",
);

/** Chains where we already verified the CREATE2 factory exists. */
const CREATE2_KNOWN_CHAIN_IDS = new Set([
  1, // ethereum
  56, // bnb
  137, // polygon
  42161, // arbitrum
  51828, // chainbounty L3
  43114, // avalanche
  534352, // scroll
  8217, // kaia
]);

/** Browser must use same-origin proxy — public RPCs often block CORS. */
function publicRpcUrl(chain: SupportedChain): string {
  if (!chain.chainId || !chain.rpcUrls[0]) {
    throw new Error("유효하지 않은 EVM 체인입니다.");
  }
  if (typeof window !== "undefined") {
    return `${window.location.origin}/api/rpc/${chain.chainId}`;
  }
  return chain.rpcUrls[0];
}

function createPublicRpc(chain: SupportedChain): JsonRpcProvider {
  return new JsonRpcProvider(publicRpcUrl(chain), chain.chainId);
}

type EvmBrowserProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

export type FeeEstimate = {
  deployGas: string;
  mintGas: string;
  totalGas: string;
  gasPriceGwei: string;
  totalFee: string;
  nativeSymbol: string;
  note: string;
};

/** Wallet approval steps the user will see (in order) */
export type EvmMintStep =
  | "switch_network"
  | "deploy_contract"
  | "mint_tokens";

export type MintOnEvmOptions = {
  eip1193?: EvmBrowserProvider | null;
  onStep?: (step: EvmMintStep) => void;
};

const MAX_ONCHAIN_URI_CHARS = 2_000;

function assertUriFitForChain(tokenURI: string) {
  if (tokenURI.startsWith("data:") && tokenURI.length > MAX_ONCHAIN_URI_CHARS) {
    throw new Error(
      "메타데이터가 너무 커서 온체인 민팅이 불가합니다. 이미지·메타데이터를 IPFS(짧은 URI)로 올려 주세요.",
    );
  }
  if (tokenURI.length > 8_000) {
    throw new Error(
      "tokenURI가 너무 깁니다. IPFS 또는 짧은 HTTPS URL을 사용해 주세요.",
    );
  }
}

function extractTokenIdFromReceipt(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  receipt: any,
  isMulti: boolean,
): string | undefined {
  try {
    const logs = receipt?.logs || [];
    for (const log of logs) {
      if (isMulti) {
        if (log.topics?.length >= 1 && log.data && log.data.length >= 66) {
          const idHex = log.data.slice(2, 66);
          const id = BigInt(`0x${idHex}`);
          if (id >= BigInt(0)) return id.toString();
        }
      } else if (log.topics?.length >= 4) {
        const id = BigInt(log.topics[3]);
        return id.toString();
      }
    }
  } catch {
    /* ignore */
  }
  return undefined;
}

async function getEip1193Provider(
  preferred?: EvmBrowserProvider | null,
): Promise<Eip1193Provider> {
  if (preferred?.request) {
    return wrapEip1193Provider(preferred) as unknown as Eip1193Provider;
  }
  throw new Error(
    "WalletConnect 지갑이 준비되지 않았습니다. 연결을 해제했다가 클립으로 다시 연결해 주세요.",
  );
}

function digWalletErrorMessage(e: unknown): string {
  if (e == null) return "";
  if (typeof e === "string") return e;
  if (typeof e !== "object") return String(e);

  const o = e as Record<string, unknown>;
  const parts: string[] = [];
  for (const key of ["shortMessage", "reason", "message", "details"] as const) {
    const v = o[key];
    if (typeof v === "string" && v.trim()) parts.push(v.trim());
  }

  const info = o.info as Record<string, unknown> | undefined;
  if (info && typeof info === "object") {
    const inner = info.error;
    if (typeof inner === "string" && inner.trim()) parts.push(inner.trim());
    if (inner && typeof inner === "object") {
      const im = inner as Record<string, unknown>;
      for (const key of ["message", "description", "detail"] as const) {
        const v = im[key];
        if (typeof v === "string" && v.trim()) parts.push(v.trim());
      }
      // Klip sometimes nests body JSON
      if (typeof im.body === "string" && im.body.trim()) {
        try {
          const body = JSON.parse(im.body) as {
            error?: { message?: string; details?: unknown };
            err?: string;
          };
          if (body.error?.message) parts.push(String(body.error.message));
          if (body.err) parts.push(String(body.err));
          if (body.error?.details) {
            parts.push(
              typeof body.error.details === "string"
                ? body.error.details
                : JSON.stringify(body.error.details),
            );
          }
        } catch {
          parts.push(im.body.slice(0, 180));
        }
      }
    }
    if (typeof info.payload === "object" && info.payload) {
      const p = info.payload as { method?: string };
      if (p.method) parts.push(`method=${p.method}`);
    }
  }

  const err = o.error;
  if (typeof err === "string") parts.push(err);
  if (err && typeof err === "object") {
    const em = (err as { message?: string }).message;
    if (em) parts.push(em);
  }

  // unique preserve order
  return [...new Set(parts.filter(Boolean))].join(" | ");
}

async function getWalletSigner(
  chain: SupportedChain,
  ownerAddress: string,
  eip1193?: EvmBrowserProvider | null,
  onStep?: (step: EvmMintStep) => void,
): Promise<{
  signer: Signer;
  rawProvider: Eip1193Provider;
}> {
  if (!chain.chainId) throw new Error("유효하지 않은 EVM 체인입니다.");

  const rawProvider = await getEip1193Provider(eip1193);
  onStep?.("switch_network");
  await ensureCorrectChain(rawProvider, chain);

  // Don't force network object in a way that fights WC — use "any" then check
  const browser = new BrowserProvider(rawProvider);
  const signer = await browser.getSigner();
  const signerAddr = (await signer.getAddress()).toLowerCase();
  if (signerAddr !== ownerAddress.toLowerCase()) {
    throw new Error(
      `연결된 지갑 주소(${signerAddr.slice(0, 6)}…${signerAddr.slice(-4)})가 앱에 표시된 주소와 다릅니다. 다시 연결해 주세요.`,
    );
  }
  return { signer, rawProvider };
}

function formatEvmError(e: unknown): string {
  if (typeof e === "object" && e && "code" in e) {
    const code = String((e as { code?: string }).code);
    if (code === "WALLET_EMPTY_RESPONSE" || code === "WALLET_SESSION_STALE") {
      return (
        (e as { message?: string }).message ||
        "지갑 응답이 비어 있습니다. WalletConnect를 다시 연결해 주세요."
      );
    }
  }

  const dug = digWalletErrorMessage(e);
  const text = dug || String(
    (e as { shortMessage?: string; message?: string })?.shortMessage ||
      (e as { message?: string })?.message ||
      "",
  );

  if (/세션|다시 연결|WALLET_SESSION/i.test(text) && !/could not coalesce/i.test(text)) {
    return text;
  }
  if (/잘못된 요청|invalid request|bad request|Field validation.*To|invalid request to waas/i.test(text)) {
    return `클립이 요청을 거부했습니다: ${text.slice(0, 240)}`;
  }
  if (/could not coalesce error/i.test(text)) {
    const extra = dug
      .replace(/could not coalesce error/gi, "")
      .replace(/^\s*\|\s*|\s*\|\s*$/g, "")
      .trim();
    return extra
      ? `지갑이 요청을 처리하지 못했습니다: ${extra}`
      : "지갑이 요청을 처리하지 못했습니다(상세 없음). 클립에서 체인·잔액을 확인하고, 연결을 다시 한 뒤 시도해 주세요.";
  }
  if (/ACTION_REJECTED|user rejected|user denied/i.test(text)) {
    return "지갑에서 요청을 취소했습니다.";
  }
  if (typeof e === "object" && e && "code" in e) {
    const code = String((e as { code?: string }).code || "");
    if (code === "ACTION_REJECTED") {
      return "지갑에서 요청을 취소했습니다.";
    }
    if (
      code === "CALL_EXCEPTION" ||
      /estimateGas|missing revert data/i.test(text)
    ) {
      return "가스 추정에 실패했습니다. 메타데이터 URI가 너무 길거나 잔액·네트워크가 맞지 않을 수 있습니다.";
    }
  }
  if (text && !/^could not coalesce/i.test(text)) return text;
  if (e instanceof Error) {
    if (/failed to fetch|networkerror|load failed/i.test(e.message)) {
      return "네트워크 요청에 실패했습니다. 페이지를 새로고침하거나 RPC 연결을 확인해 주세요.";
    }
    if (!/could not coalesce/i.test(e.message)) return e.message;
  }
  return dug || "민팅 중 오류가 발생했습니다.";
}

function normalizeChainIdHex(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    return `0x${Math.trunc(value).toString(16)}`;
  }
  if (typeof value === "bigint") {
    return `0x${value.toString(16)}`;
  }
  if (typeof value === "string") {
    const t = value.trim();
    if (!t) return null;
    if (/^0x[0-9a-fA-F]+$/i.test(t)) return t.toLowerCase();
    if (/^\d+$/.test(t)) return `0x${BigInt(t).toString(16)}`;
    return t.toLowerCase();
  }
  // Some WC wallets return { result: "0x38" } or similar
  if (typeof value === "object") {
    const rec = value as { result?: unknown; chainId?: unknown };
    if (rec.result != null) return normalizeChainIdHex(rec.result);
    if (rec.chainId != null) return normalizeChainIdHex(rec.chainId);
  }
  return null;
}

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err: unknown) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

async function ensureCorrectChain(
  rawProvider: Eip1193Provider,
  chain: SupportedChain,
) {
  if (!chain.chainId) return;
  const hexId = `0x${chain.chainId.toString(16)}`.toLowerCase();

  try {
    const current = normalizeChainIdHex(
      await withTimeout(
        rawProvider.request({ method: "eth_chainId" }),
        20_000,
        "지갑에서 체인 정보를 가져오지 못했습니다.",
      ),
    );
    if (current === hexId) return;
  } catch {
    /* fall through to switch */
  }

  const addParams = [
    {
      chainId: hexId,
      chainName: chain.name,
      nativeCurrency: {
        name: chain.nativeCurrency.name,
        symbol: chain.nativeCurrency.symbol,
        decimals: chain.nativeCurrency.decimals,
      },
      rpcUrls: chain.rpcUrls,
      blockExplorerUrls: [chain.explorerUrl],
    },
  ];

  try {
    await withTimeout(
      rawProvider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: hexId }],
      }),
      90_000,
      `지갑에서 ${chain.name} 네트워크 전환 응답이 없습니다. 지갑 앱을 확인해 주세요.`,
    );
  } catch (err: unknown) {
    if (isUserCancelledError(err)) throw err;

    // Unknown chain (e.g. ChainBounty 51828) → add then switch
    try {
      await withTimeout(
        rawProvider.request({
          method: "wallet_addEthereumChain",
          params: addParams,
        }),
        120_000,
        `${chain.name} 네트워크 추가 요청에 응답이 없습니다.`,
      );
      await withTimeout(
        rawProvider.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: hexId }],
        }),
        90_000,
        `${chain.name}으로 전환 응답이 없습니다.`,
      );
    } catch (addErr: unknown) {
      if (isUserCancelledError(addErr)) throw addErr;
      const detail = digWalletErrorMessage(addErr) || digWalletErrorMessage(err);
      throw new Error(
        `${chain.name}(chainId ${chain.chainId})을 지갑에 추가·전환하지 못했습니다. ` +
          `MetaMask 등 커스텀 네트워크를 지원하는 지갑으로 연결해 주세요` +
          (chain.id === "chainbounty"
            ? " (클립은 ChainBounty L3를 지원하지 않을 수 있습니다)"
            : "") +
          `. 이미 WalletConnect 중이라면 끊고 다시 연결한 뒤 시도해 주세요.` +
          (detail ? ` (${detail})` : ""),
      );
    }
  }

  const after = normalizeChainIdHex(
    await rawProvider.request({ method: "eth_chainId" }),
  );
  if (after !== hexId) {
    throw new Error(
      `네트워크 전환 후에도 ${chain.name}이 아닙니다. 지갑에서 ${chain.name}(chainId ${chain.chainId})을 선택한 뒤 다시 연결해 주세요.`,
    );
  }
}

/**
 * Klip/WC-friendly legacy eth_sendTransaction.
 * Klip WaaS requires `to` (ContractTransferFeeRequest.To) — never omit it.
 */
async function sendLegacyWalletTx(args: {
  rawProvider: Eip1193Provider;
  publicRpc: JsonRpcProvider;
  chain: SupportedChain;
  from: string;
  tx: TransactionRequest & { to: string };
  gasLimit: bigint;
}): Promise<{ hash: string }> {
  const { rawProvider, publicRpc, chain, from, tx, gasLimit } = args;
  if (!chain.chainId) throw new Error("유효하지 않은 EVM 체인입니다.");
  if (!tx.to) {
    throw new Error(
      "클립은 To(수신 주소) 없는 배포를 거부합니다. CREATE2 경로가 필요합니다.",
    );
  }

  const fee = await publicRpc.getFeeData();
  const gasPrice = fee.gasPrice ?? fee.maxFeePerGas;
  if (!gasPrice || gasPrice <= BigInt(0)) {
    throw new Error("가스 가격을 가져오지 못했습니다. RPC를 확인해 주세요.");
  }

  const data =
    tx.data != null
      ? typeof tx.data === "string"
        ? tx.data
        : hexlify(tx.data)
      : undefined;

  // Minimal legacy fields — no chainId (WC session already scopes the chain)
  const param: Record<string, string> = {
    from: from.toLowerCase(),
    to: String(tx.to).toLowerCase(),
    gas: toQuantity(gasLimit),
    gasPrice: toQuantity(gasPrice),
    value: toQuantity(tx.value ?? BigInt(0)),
  };
  if (data && data !== "0x") {
    param.data = data;
  }

  let hash: string;
  try {
    hash = (await withTimeout(
      rawProvider.request({
        method: "eth_sendTransaction",
        params: [param],
      }),
      180_000,
      `지갑에서 트랜잭션 승인이 없습니다(3분 초과). 클립 앱 알림/승인 화면을 확인해 주세요. (${chain.name})`,
    )) as string;
  } catch (e: unknown) {
    if (isUserCancelledError(e)) throw e;
    const msg = digWalletErrorMessage(e) || String(
      (e as { message?: string })?.message ||
        (e as { shortMessage?: string })?.shortMessage ||
        "",
    );
    if (/no such account/i.test(msg)) {
      throw new Error(
        `${chain.name}에서 지갑 계정을 쓰지 못했습니다(no such account). ` +
          `이 체인이 지갑/WalletConnect 세션에 없거나, 클립처럼 커스텀 L3를 지원하지 않는 지갑일 수 있습니다. ` +
          `MetaMask 등으로 ${chain.name}(chainId ${chain.chainId})을 추가한 뒤 다시 연결하고, 가스용 ${chain.nativeCurrency.symbol} 잔액도 확인해 주세요.`,
      );
    }
    if (/To|required|invalid request|잘못된/i.test(msg)) {
      throw new Error(
        `지갑이 트랜잭션을 거부했습니다. ${chain.name} 네트워크·잔액을 확인하고 다시 시도해 주세요.${msg ? ` (${msg})` : ""}`,
      );
    }
    throw e instanceof Error
      ? e
      : new Error(
          msg ||
            `지갑이 트랜잭션을 거부했습니다. ${chain.name} 네트워크와 수수료 잔액을 확인해 주세요.`,
        );
  }

  if (!hash || typeof hash !== "string") {
    throw new Error("지갑이 트랜잭션 해시를 반환하지 않았습니다.");
  }

  const receipt = await withTimeout(
    publicRpc.waitForTransaction(hash),
    180_000,
    `트랜잭션 영수증을 기다리다 시간 초과했습니다. 익스플로러에서 ${hash.slice(0, 10)}… 를 확인해 주세요.`,
  );
  if (!receipt || receipt.status === 0) {
    throw new Error("트랜잭션이 실패했습니다. 익스플로러에서 확인해 주세요.");
  }

  return { hash };
}

/** Fixed salts → same STAMP collection address on every mint for a given chain. */
const PLATFORM_SALT_NFT = id("STAMP_OPEN_NFT_V1");
const PLATFORM_SALT_EDITION = id("STAMP_EDITION_MINTER_V1");

/** EVM multi-token cap (gas); exclusive editions on ERC-721. */
export const MAX_EVM_EDITIONS = 50;

async function ensureCreate2Factory(
  publicRpc: JsonRpcProvider,
  chainId: number,
): Promise<void> {
  let factoryOk = CREATE2_KNOWN_CHAIN_IDS.has(chainId);
  if (!factoryOk) {
    try {
      const code = await publicRpc.getCode(CREATE2_DEPLOYER);
      factoryOk = Boolean(code && code !== "0x");
    } catch {
      factoryOk = false;
    }
  }
  if (!factoryOk) {
    throw new Error(
      "이 체인에는 CREATE2 배포 팩토리가 없거나 RPC가 eth_getCode에 실패했습니다.",
    );
  }
}

type Create2Plan = {
  to: string;
  data: string;
  predictedAddress: string;
  needsDeploy: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  artifact: { abi: any; bytecode: string };
};

async function planCreate2Deploy(args: {
  publicRpc: JsonRpcProvider;
  chainId: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  artifact: { abi: any; bytecode: string };
  salt: string;
}): Promise<Create2Plan> {
  await ensureCreate2Factory(args.publicRpc, args.chainId);

  const factory = new ContractFactory(args.artifact.abi, args.artifact.bytecode);
  const deployTx = await factory.getDeployTransaction();
  if (!deployTx.data) {
    throw new Error("배포 바이트코드를 만들지 못했습니다.");
  }

  const initCode =
    typeof deployTx.data === "string" ? deployTx.data : hexlify(deployTx.data);
  const data = hexlify(concat([args.salt, initCode]));
  const predictedAddress = getCreate2Address(
    CREATE2_DEPLOYER,
    args.salt,
    keccak256(initCode),
  );

  let needsDeploy = true;
  try {
    const code = await args.publicRpc.getCode(predictedAddress);
    needsDeploy = !code || code === "0x";
  } catch {
    needsDeploy = true;
  }

  return {
    to: CREATE2_DEPLOYER,
    data,
    predictedAddress,
    needsDeploy,
    artifact: args.artifact,
  };
}

/** Shared ERC-721 STAMP collection (same address for single + multi editions). */
async function resolveStampCollection(args: {
  publicRpc: JsonRpcProvider;
  chainId: number;
}): Promise<Create2Plan> {
  return planCreate2Deploy({
    publicRpc: args.publicRpc,
    chainId: args.chainId,
    artifact: nftArtifact as Create2Plan["artifact"],
    salt: PLATFORM_SALT_NFT,
  });
}

/** Helper that batch-mints ERC-721 editions in one wallet tx. */
async function resolveEditionMinter(args: {
  publicRpc: JsonRpcProvider;
  chainId: number;
}): Promise<Create2Plan> {
  return planCreate2Deploy({
    publicRpc: args.publicRpc,
    chainId: args.chainId,
    artifact: editionMinterArtifact as Create2Plan["artifact"],
    salt: PLATFORM_SALT_EDITION,
  });
}

async function maybeDeployCreate2(args: {
  plan: Create2Plan;
  rawProvider: Eip1193Provider;
  publicRpc: JsonRpcProvider;
  chain: SupportedChain;
  from: string;
  onStep?: (step: EvmMintStep) => void;
}): Promise<void> {
  if (!args.plan.needsDeploy) return;

  let deployGas: bigint;
  try {
    deployGas = await args.publicRpc.estimateGas({
      from: args.from,
      to: args.plan.to,
      data: args.plan.data,
    });
  } catch {
    deployGas = BigInt(3_500_000);
  }

  args.onStep?.("deploy_contract");
  try {
    await sendLegacyWalletTx({
      rawProvider: args.rawProvider,
      publicRpc: args.publicRpc,
      chain: args.chain,
      from: args.from,
      tx: { to: args.plan.to, data: args.plan.data },
      gasLimit: withGasBuffer(deployGas, BigInt(3_500_000)),
    });
  } catch (e: unknown) {
    let code = "0x";
    try {
      code =
        (await args.publicRpc.getCode(args.plan.predictedAddress)) || "0x";
    } catch {
      /* */
    }
    if (!code || code === "0x") throw e;
  }
}

/**
 * Fee estimate uses public RPC only — no wallet popup.
 */
export async function estimateEvmMintFee(
  chain: SupportedChain,
  input: MintInput,
  ownerAddress: string,
): Promise<FeeEstimate> {
  assertUriFitForChain(input.tokenURI);
  if (!chain.chainId || !chain.rpcUrls[0]) {
    throw new Error("유효하지 않은 EVM 체인입니다.");
  }

  const isMulti = input.kind === "multi";
  const amount = Math.min(
    MAX_EVM_EDITIONS,
    Math.max(1, Math.floor(input.amount || 1)),
  );
  const rpc = createPublicRpc(chain);

  const collection = await resolveStampCollection({
    publicRpc: rpc,
    chainId: chain.chainId,
  });
  const editionMinter = isMulti
    ? await resolveEditionMinter({ publicRpc: rpc, chainId: chain.chainId })
    : null;

  let deployGas = BigInt(0);
  for (const plan of [collection, editionMinter].filter(Boolean) as Create2Plan[]) {
    if (!plan.needsDeploy) continue;
    try {
      const g = await rpc.estimateGas({
        from: ownerAddress,
        to: plan.to,
        data: plan.data,
      });
      deployGas += g;
    } catch {
      deployGas += BigInt(2_500_000);
    }
  }

  // Rough mint gas: single mint ~140k; editions scale
  let mintGas = isMulti
    ? BigInt(120_000) * BigInt(amount) + BigInt(80_000)
    : BigInt(140_000);
  if (!collection.needsDeploy && !(editionMinter?.needsDeploy)) {
    try {
      const c = new Contract(
        isMulti ? editionMinter!.predictedAddress : collection.predictedAddress,
        isMulti ? editionMinterArtifact.abi : nftArtifact.abi,
        rpc,
      );
      const mintData = isMulti
        ? c.interface.encodeFunctionData("mintEditions", [
            collection.predictedAddress,
            ownerAddress,
            amount,
            input.tokenURI,
          ])
        : c.interface.encodeFunctionData("mint", [
            ownerAddress,
            input.tokenURI,
          ]);
      mintGas = await rpc.estimateGas({
        from: ownerAddress,
        to: isMulti
          ? editionMinter!.predictedAddress
          : collection.predictedAddress,
        data: mintData,
      });
    } catch {
      /* keep default */
    }
  }

  const totalGas = deployGas + mintGas;
  const feeData = await rpc.getFeeData();
  const gasPrice = feeData.gasPrice ?? feeData.maxFeePerGas ?? BigInt(0);
  const totalWei = totalGas * gasPrice;

  return {
    deployGas: deployGas.toString(),
    mintGas: mintGas.toString(),
    totalGas: totalGas.toString(),
    gasPriceGwei: (Number(gasPrice) / 1e9).toFixed(4),
    totalFee: formatEther(totalWei),
    nativeSymbol: chain.nativeCurrency.symbol,
    note: isMulti
      ? `멀티=ERC-721 에디션 ${amount}개(동일 컬렉션). 클립 ERC-1155 차단 회피.`
      : collection.needsDeploy
        ? `체인 첫 STAMP 컬렉션 배포 + 민트`
        : `공유 STAMP 컬렉션 민트 (${collection.predictedAddress.slice(0, 10)}…)`,
  };
}

/** Buffer so wallet doesn't re-estimate; keeps a single eth_sendTransaction per step. */
function withGasBuffer(gas: bigint, fallback: bigint): bigint {
  const base = gas > BigInt(0) ? gas : fallback;
  return (base * BigInt(130)) / BigInt(100);
}

/**
 * EVM mint:
 * NFT → shared StampOpenNFT
 * multi → same collection via StampEditionMinter (N× ERC-721, not ERC-1155)
 */
export async function mintOnEvm(
  chain: SupportedChain,
  input: MintInput,
  ownerAddress: string,
  options?: MintOnEvmOptions | EvmBrowserProvider | null,
): Promise<MintOutcome> {
  const opts: MintOnEvmOptions =
    options && typeof options === "object" && "request" in options
      ? { eip1193: options }
      : (options as MintOnEvmOptions | undefined) || {};

  try {
    const klipHits = validateKlipFields({
      name: input.name,
      symbol: PLATFORM_COLLECTION_SYMBOL,
      platformSymbol: true,
    });
    if (klipHits.length > 0) {
      return { success: false, error: klipHits.map((h) => h.reason).join(" ") };
    }

    assertUriFitForChain(input.tokenURI);
    if (!chain.chainId || !chain.rpcUrls[0]) {
      return { success: false, error: "유효하지 않은 EVM 체인입니다." };
    }

    if (!opts.eip1193?.request) {
      return {
        success: false,
        error:
          "WalletConnect 지갑 프로바이더가 없습니다. 연결 해제 후 클립으로 다시 연결해 주세요.",
      };
    }

    const { signer, rawProvider } = await getWalletSigner(
      chain,
      ownerAddress,
      opts.eip1193,
      opts.onStep,
    );

    const isMulti = input.kind === "multi";
    const amount = Math.min(
      MAX_EVM_EDITIONS,
      Math.max(1, Math.floor(input.amount || 1)),
    );
    const publicRpc = createPublicRpc(chain);

    const collection = await resolveStampCollection({
      publicRpc,
      chainId: chain.chainId,
    });

    await maybeDeployCreate2({
      plan: collection,
      rawProvider,
      publicRpc,
      chain,
      from: ownerAddress,
      onStep: opts.onStep,
    });

    let editionMinter: Create2Plan | null = null;
    if (isMulti) {
      editionMinter = await resolveEditionMinter({
        publicRpc,
        chainId: chain.chainId,
      });
      await maybeDeployCreate2({
        plan: editionMinter,
        rawProvider,
        publicRpc,
        chain,
        from: ownerAddress,
        onStep: opts.onStep,
      });
    }

    const contractAddress = collection.predictedAddress;
    try {
      const deployedCode = await publicRpc.getCode(contractAddress);
      if (!deployedCode || deployedCode === "0x") {
        return {
          success: false,
          error:
            "공유 STAMP 컬렉션을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.",
        };
      }
    } catch {
      /* */
    }

    opts.onStep?.("mint_tokens");

    let mintTo: string;
    let mintData: string;
    let gasFallback: bigint;

    if (isMulti && editionMinter) {
      const minter = new Contract(
        editionMinter.predictedAddress,
        editionMinterArtifact.abi,
        signer,
      );
      const mintPopulated = await minter.mintEditions.populateTransaction(
        contractAddress,
        ownerAddress,
        amount,
        input.tokenURI,
      );
      mintTo = editionMinter.predictedAddress;
      mintData = mintPopulated.data || "0x";
      gasFallback = BigInt(120_000) * BigInt(amount) + BigInt(100_000);
    } else {
      const contract = new Contract(
        contractAddress,
        collection.artifact.abi,
        signer,
      );
      const mintPopulated = await contract.mint.populateTransaction(
        ownerAddress,
        input.tokenURI,
      );
      mintTo = contractAddress;
      mintData = mintPopulated.data || "0x";
      gasFallback = BigInt(140_000);
    }

    let mintGas: bigint;
    try {
      mintGas = await publicRpc.estimateGas({
        from: ownerAddress,
        to: mintTo,
        data: mintData,
      });
    } catch {
      mintGas = gasFallback;
    }

    const minted = await sendLegacyWalletTx({
      rawProvider,
      publicRpc,
      chain,
      from: ownerAddress,
      tx: { to: mintTo, data: mintData },
      gasLimit: withGasBuffer(mintGas, gasFallback),
    });

    const receipt = await publicRpc.getTransactionReceipt(minted.hash);
    // Editions still emit ERC-721 Transfer logs
    const tokenId = extractTokenIdFromReceipt(receipt, false);

    return {
      success: true,
      txHash: minted.hash,
      contractAddress,
      tokenId,
      amount: isMulti ? String(amount) : "1",
      kind: input.kind,
      explorerUrl: explorerTx(chain, minted.hash),
      tokenURI: input.tokenURI,
      imageUrl: input.imagePreview,
    };
  } catch (e: unknown) {
    if (isUserCancelledError(e)) {
      return { success: false, error: "CANCELLED" };
    }
    return { success: false, error: formatEvmError(e) };
  }
}
