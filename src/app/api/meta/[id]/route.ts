import { NextResponse } from "next/server";
import { readLocalRecord } from "@/lib/localMeta";
import { resolvePublicBase } from "@/lib/media/config";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!/^[a-f0-9]{16}$/i.test(id)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  const record = await readLocalRecord(id);
  if (!record) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const base = resolvePublicBase(new URL(req.url).origin);
  const image = `${base}/api/meta/${id}/image`;
  const body = {
    name: record.name,
    description: record.description,
    image,
    image_url: image,
    properties: { image },
  };

  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "public, max-age=31536000, immutable",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
