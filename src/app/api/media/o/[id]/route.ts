import { NextResponse } from "next/server";
import { getS3Object } from "@/lib/media/s3";
import { resolveFacingBase } from "@/lib/media/config";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "*",
  "Cache-Control": "public, max-age=31536000, immutable",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors });
}

/**
 * Wallet-facing metadata: rewritten image URLs always point at this app host.
 */
export async function GET(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!/^[a-f0-9]{16}$/i.test(id)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  const obj = await getS3Object(`n/${id}/meta.json`);
  if (!obj) {
    return NextResponse.json({ error: "not found" }, { status: 404, headers: cors });
  }

  let meta: Record<string, unknown>;
  try {
    meta = JSON.parse(obj.body.toString("utf8")) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "bad meta" }, { status: 500, headers: cors });
  }

  const facing = resolveFacingBase(new URL(req.url).origin);
  const imageUrl = `${facing}/api/media/o/${id}/image`;
  meta.image = imageUrl;
  meta.image_url = imageUrl;
  if (meta.properties && typeof meta.properties === "object") {
    const p = meta.properties as Record<string, unknown>;
    p.image = imageUrl;
    meta.properties = p;
  }

  return NextResponse.json(meta, {
    headers: {
      ...cors,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}
