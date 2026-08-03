import { NextResponse } from "next/server";
import { getS3Object } from "@/lib/media/s3";
import { mimeFromExt } from "@/lib/media/config";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "*",
  "Cache-Control": "public, max-age=31536000, immutable",
};

const EXTS = ["png", "jpg", "jpeg", "gif", "webp"] as const;

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors });
}

/**
 * Stream NFT image from R2 through the app domain (Klip-friendly host).
 */
export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!/^[a-f0-9]{16}$/i.test(id)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400, headers: cors });
  }

  // Prefer extension from meta.properties.image_ext when present
  let preferredExt: string | null = null;
  try {
    const metaObj = await getS3Object(`n/${id}/meta.json`);
    if (metaObj) {
      const meta = JSON.parse(metaObj.body.toString("utf8")) as {
        properties?: { image_ext?: string };
      };
      if (meta.properties?.image_ext) preferredExt = meta.properties.image_ext;
    }
  } catch {
    /* */
  }

  const tryExts = preferredExt
    ? [preferredExt, ...EXTS.filter((e) => e !== preferredExt)]
    : [...EXTS];

  for (const ext of tryExts) {
    const obj = await getS3Object(`n/${id}/image.${ext}`);
    if (obj) {
      const type =
        obj.contentType && obj.contentType !== "application/octet-stream"
          ? obj.contentType
          : mimeFromExt(ext);
      return new NextResponse(new Uint8Array(obj.body), {
        headers: {
          ...cors,
          "Content-Type": type,
        },
      });
    }
  }

  return NextResponse.json({ error: "not found" }, { status: 404, headers: cors });
}
