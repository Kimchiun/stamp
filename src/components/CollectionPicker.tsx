"use client";

import { Loader2 } from "lucide-react";
import type { UserCollection } from "@/lib/adapters";
import { validateKlipFields } from "@/lib/klipFilters";

export type CollectionMode = "stamp" | "new" | "existing";

type Props = {
  mode: CollectionMode;
  onMode: (mode: CollectionMode) => void;
  name: string;
  symbol: string;
  onName: (v: string) => void;
  onSymbol: (v: string) => void;
  collections: UserCollection[];
  loading: boolean;
  connected: boolean;
  selected: string;
  onSelect: (address: string) => void;
};

const OPTIONS: { id: CollectionMode; title: string; desc: string }[] = [
  {
    id: "stamp",
    title: "STAMP 공유 컬렉션",
    desc: "바로 발행합니다. 컬렉션 이름은 STAMP로 표시됩니다.",
  },
  {
    id: "new",
    title: "내 컬렉션 새로 만들기",
    desc: "이름과 심볼을 직접 정합니다. 만든 사람만 민트할 수 있습니다.",
  },
  {
    id: "existing",
    title: "내 컬렉션 선택",
    desc: "이전에 만든 내 컬렉션에 이어서 발행합니다.",
  },
];

export function CollectionPicker({
  mode,
  onMode,
  name,
  symbol,
  onName,
  onSymbol,
  collections,
  loading,
  connected,
  selected,
  onSelect,
}: Props) {
  const hits =
    mode === "new" && (name || symbol)
      ? validateKlipFields({ name, symbol })
      : [];
  const nameHit = hits.find((h) => h.field === "name");
  const symbolHit = hits.find((h) => h.field === "symbol");

  return (
    <div className="mb-6 space-y-3">
      <span className="xerox-label block text-[var(--ink)]/55">컬렉션</span>
      <div className="grid gap-2 sm:grid-cols-3">
        {OPTIONS.map((opt) => {
          const active = mode === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onMode(opt.id)}
              className={`border-2 border-[var(--ink)] px-3 py-3 text-left transition-colors duration-150 ${
                active
                  ? "bg-[var(--ink)] text-[var(--cream)] shadow-[2px_2px_0_var(--lime)]"
                  : "bg-[var(--cream)] text-[var(--ink)]"
              }`}
            >
              <span className="block text-sm font-bold tracking-tight">
                {opt.title}
              </span>
              <span
                className={`mt-1 block text-xs leading-relaxed ${
                  active ? "text-[var(--cream)]/70" : "text-[var(--ink)]/70"
                }`}
              >
                {opt.desc}
              </span>
            </button>
          );
        })}
      </div>

      {mode === "new" && (
        <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
          <label className="block">
            <span className="xerox-label mb-1.5 block text-[var(--ink)]/55">
              컬렉션 이름
            </span>
            <input
              value={name}
              maxLength={64}
              onChange={(e) => onName(e.target.value)}
              placeholder="My Art Collection"
              className="input-flyer"
            />
            {nameHit && (
              <span className="mt-1.5 block text-xs font-medium text-[var(--pink)]">
                {nameHit.reason}
              </span>
            )}
          </label>
          <label className="block">
            <span className="xerox-label mb-1.5 block text-[var(--ink)]/55">
              컬렉션 심볼
            </span>
            <input
              value={symbol}
              maxLength={12}
              onChange={(e) => onSymbol(e.target.value.toUpperCase())}
              placeholder="ART"
              className="input-flyer"
            />
            {symbolHit && (
              <span className="mt-1.5 block text-xs font-medium text-[var(--pink)]">
                {symbolHit.reason}
              </span>
            )}
          </label>
          <p className="text-xs leading-relaxed text-[var(--ink)]/60 sm:col-span-2">
            컬렉션 생성 후 이름·심볼은 바꿀 수 없습니다. 생성에 지갑 승인이 한 번
            더 필요하고, 클립 갤러리에 보이려면 컬렉션 주소를 클립에 등록해야 할 수
            있습니다.
          </p>
        </div>
      )}

      {mode === "existing" && (
        <div>
          {!connected ? (
            <p className="text-xs text-[var(--ink)]/60">
              지갑을 연결하면 내 컬렉션 목록이 표시됩니다.
            </p>
          ) : loading ? (
            <p className="flex items-center gap-2 text-xs text-[var(--ink)]/60">
              <Loader2 className="animate-spin" size={14} />
              내 컬렉션을 불러오는 중…
            </p>
          ) : collections.length === 0 ? (
            <p className="text-xs text-[var(--ink)]/60">
              이 체인에 만든 컬렉션이 없습니다. &quot;내 컬렉션 새로 만들기&quot;를
              선택하세요.
            </p>
          ) : (
            <select
              value={selected}
              onChange={(e) => onSelect(e.target.value)}
              className="input-flyer"
            >
              {collections.map((c) => (
                <option key={c.address} value={c.address}>
                  {c.name} ({c.symbol}) · {c.address.slice(0, 6)}…
                  {c.address.slice(-4)}
                </option>
              ))}
            </select>
          )}
        </div>
      )}
    </div>
  );
}
