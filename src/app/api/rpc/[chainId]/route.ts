import { NextRequest, NextResponse } from "next/server";
import { CHAINS } from "@/lib/chains";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ chainId: string }> };

function isJsonRpcErrorPayload(text: string): boolean {
  try {
    const parsed = JSON.parse(text) as {
      error?: unknown;
      result?: unknown;
    };
    if (parsed && typeof parsed === "object" && "error" in parsed && parsed.error) {
      return true;
    }
    if (Array.isArray(parsed)) {
      return parsed.every(
        (item) =>
          item &&
          typeof item === "object" &&
          "error" in item &&
          (item as { error?: unknown }).error,
      );
    }
  } catch {
    return true;
  }
  return false;
}

function errorMessageFromRpcBody(text: string): string {
  try {
    const parsed = JSON.parse(text) as unknown;
    const items = Array.isArray(parsed) ? parsed : [parsed];
    for (const item of items) {
      if (!item || typeof item !== "object") continue;
      const err = (item as { error?: { message?: string; code?: number } }).error;
      if (err?.message) return err.message;
    }
  } catch {
    /* ignore */
  }
  return text.slice(0, 240);
}

/**
 * Same-origin JSON-RPC proxy so the browser doesn't hit public RPCs
 * (many block CORS → TypeError: Failed to fetch).
 * Retries the next RPC URL when the node returns JSON-RPC errors (e.g. -32603).
 */
export async function POST(req: NextRequest, ctx: Ctx) {
  const { chainId: raw } = await ctx.params;
  const chainId = Number(raw);
  if (!Number.isFinite(chainId)) {
    return NextResponse.json({ error: "invalid chainId" }, { status: 400 });
  }

  const chain = CHAINS.find((c) => c.chainId === chainId);
  if (!chain?.rpcUrls?.length) {
    return NextResponse.json({ error: "unsupported chain" }, { status: 404 });
  }

  let body: string;
  let requestId: string | number | null = null;
  try {
    body = await req.text();
    const parsed = JSON.parse(body) as { id?: string | number | null };
    if (parsed && typeof parsed === "object" && "id" in parsed) {
      requestId = parsed.id ?? null;
    }
  } catch {
    return NextResponse.json({ error: "invalid json-rpc body" }, { status: 400 });
  }

  let lastError = "rpc failed";
  for (const rpcUrl of chain.rpcUrls) {
    try {
      const upstream = await fetch(rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        cache: "no-store",
      });
      const text = await upstream.text();
      if (!upstream.ok) {
        lastError = text.slice(0, 200) || `HTTP ${upstream.status}`;
        continue;
      }
      if (isJsonRpcErrorPayload(text)) {
        lastError = errorMessageFromRpcBody(text);
        continue;
      }
      return new NextResponse(text, {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (e: unknown) {
      lastError = e instanceof Error ? e.message : "fetch failed";
    }
  }

  // Never forward a broken/unauthorized upstream body as HTTP 200 —
  // ethers treats id:null / batch arrays as BAD_DATA ("missing response").
  return NextResponse.json(
    {
      jsonrpc: "2.0",
      id: requestId,
      error: {
        code: -32000,
        message: `RPC 프록시 실패: ${lastError}`,
      },
    },
    { status: 200 },
  );
}
