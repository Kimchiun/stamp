/**
 * Klip-style NFT name/symbol spam filters (from published blocklists).
 * Prevent minting strings that wallets commonly hide as "blocked".
 */

export type FilterHit = {
  field: "name" | "symbol";
  rule: string;
  reason: string;
};

type NameRule =
  | { type: "contains"; needle: string; label: string }
  | { type: "exactly"; value: string; label: string }
  | { type: "starts_with"; prefix: string; label: string };

type SymbolRule =
  | { type: "contains"; needle: string; label: string }
  | { type: "exactly"; value: string; label: string }
  | { type: "starts_with"; prefix: string; label: string };

const NAME_RULES: NameRule[] = [
  { type: "contains", needle: " at ", label: " at " },
  { type: "contains", needle: "visit", label: "visit" },
  { type: "contains", needle: "claim ", label: "claim " },
  { type: "contains", needle: "airdrop at", label: "airdrop at" },
  { type: "contains", needle: "reward at", label: "reward at" },
  { type: "contains", needle: "gift at", label: "gift at" },
  { type: "contains", needle: "k$ at", label: "K$ at" },
  { type: "contains", needle: "bnb at", label: "BNB at" },
  { type: "contains", needle: "eth at", label: "ETH at" },
  { type: "contains", needle: "🎁", label: "🎁" },
  { type: "contains", needle: ".us", label: ".us" },
  { type: "contains", needle: ".xyz", label: ".xyz" },
  { type: "contains", needle: ".lol", label: ".lol" },
  { type: "contains", needle: ".icu", label: ".icu" },
  { type: "contains", needle: "http", label: "http" },
  { type: "contains", needle: "www.", label: "www." },
  { type: "contains", needle: ".com", label: ".com" },
  { type: "contains", needle: "t.me/", label: "t.me/" },
  { type: "exactly", value: "matic", label: "MATIC" },
  { type: "contains", needle: "fyde", label: "fyde" },
  { type: "starts_with", prefix: "!", label: "! (starts_with)" },
];

const SYMBOL_EXACT = [
  "KLAY",
  "ETH",
  "MATIC",
  "APT",
  "XRP",
  "BORA",
  "USDC",
  "USDT",
  "BTC",
  "SOL",
  "POLY",
  "DOGE",
  "AAVE",
  "GAS",
  "CYBER",
  "RIPPLE",
  "SBIB",
  "SHIBA",
  "SHIB",
  "EOS",
  "PRAGON",
  "ONDO",
  "ARKM",
  "BT",
  "XR",
  "NEO",
] as const;

const SYMBOL_RULES: SymbolRule[] = [
  ...SYMBOL_EXACT.map(
    (value) =>
      ({ type: "exactly" as const, value: value.toLowerCase(), label: value }),
  ),
  { type: "contains", needle: "tether", label: "Tether" },
  { type: "starts_with", prefix: "claim ", label: "claim " },
  { type: "contains", needle: "claim:", label: "claim:" },
  { type: "contains", needle: "t.me/", label: "t.me/" },
  { type: "contains", needle: ".vercel.", label: ".vercel." },
  { type: "contains", needle: "$pol", label: "$POL" },
];

function fold(s: string): string {
  return s.normalize("NFKC").toLowerCase();
}

function matchName(name: string): FilterHit | null {
  const raw = name.trim();
  if (!raw) return null;
  const lower = fold(raw);

  for (const rule of NAME_RULES) {
    if (rule.type === "contains") {
      const needle = fold(rule.needle);
      if (lower.includes(needle) || raw.includes(rule.needle)) {
        return {
          field: "name",
          rule: rule.label,
          reason: `이름에 클립 차단 패턴이 포함됩니다: "${rule.label}"`,
        };
      }
    } else if (rule.type === "exactly") {
      if (lower === fold(rule.value)) {
        return {
          field: "name",
          rule: rule.label,
          reason: `이 이름은 클립에서 차단됩니다: "${rule.label}"`,
        };
      }
    } else if (rule.type === "starts_with") {
      if (raw.startsWith(rule.prefix) || lower.startsWith(fold(rule.prefix))) {
        return {
          field: "name",
          rule: rule.label,
          reason: `이름이 "${rule.prefix}"(으)로 시작하면 클립에서 차단됩니다`,
        };
      }
    }
  }
  return null;
}

function matchSymbol(symbol: string): FilterHit | null {
  const raw = symbol.trim();
  if (!raw) return null;
  const lower = fold(raw);

  for (const rule of SYMBOL_RULES) {
    if (rule.type === "contains") {
      if (lower.includes(fold(rule.needle))) {
        return {
          field: "symbol",
          rule: rule.label,
          reason: `심볼에 클립 차단 패턴이 포함됩니다: "${rule.label}"`,
        };
      }
    } else if (rule.type === "exactly") {
      if (lower === fold(rule.value)) {
        return {
          field: "symbol",
          rule: rule.label,
          reason: `이 심볼은 클립에서 차단됩니다: "${rule.label}" (코인/토큰명과 동일)`,
        };
      }
    } else if (rule.type === "starts_with") {
      if (lower.startsWith(fold(rule.prefix))) {
        return {
          field: "symbol",
          rule: rule.label,
          reason: `심볼이 "${rule.prefix}"(으)로 시작하면 클립에서 차단됩니다`,
        };
      }
    }
  }
  return null;
}

/** Safe on-chain collection identity for EVM shared STAMP contracts. */
export const PLATFORM_COLLECTION_NAME = "STAMP";
export const PLATFORM_COLLECTION_SYMBOL = "STAMP";

export function validateKlipFields(input: {
  name: string;
  symbol: string;
  /** When true, symbol is forced to STAMP and not user-checked the same way */
  platformSymbol?: boolean;
}): FilterHit[] {
  const hits: FilterHit[] = [];
  const nameHit = matchName(input.name);
  if (nameHit) hits.push(nameHit);

  const sym = input.platformSymbol
    ? PLATFORM_COLLECTION_SYMBOL
    : input.symbol;
  const symbolHit = matchSymbol(sym);
  if (symbolHit) hits.push(symbolHit);

  return hits;
}

export function isKlipSafeNameSymbol(
  name: string,
  symbol: string,
  platformSymbol = false,
): boolean {
  return validateKlipFields({ name, symbol, platformSymbol }).length === 0;
}
