import { NextRequest, NextResponse } from "next/server";
import { getMediaStatus } from "@/lib/media/config";
import { storeNftMedia } from "@/lib/media/store";
import { getDailyMediaUsage } from "@/lib/media/usage";

export const runtime = "nodejs";

/**
 * NFT image + metadata upload.
 * Primary: own HTTPS domain (local API routes or S3/R2 + MEDIA_PUBLIC_BASE_URL).
 */
export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  const status = getMediaStatus(origin);
  let usage = null;
  try {
    usage = await getDailyMediaUsage();
  } catch {
    /* */
  }
  return NextResponse.json({
    publicUploads: status.canUpload,
    klipReady: status.klipReady,
    mode: status.mode,
    gateway: status.publicBase,
    publicBase: status.publicBase,
    hint: status.hint,
    usage,
  });
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    const name = String(form.get("name") || "Untitled");
    const description = String(form.get("description") || "");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "파일이 필요합니다." }, { status: 400 });
    }

    if (file.size > 4 * 1024 * 1024) {
      return NextResponse.json(
        { error: "이미지는 4MB 이하여야 합니다." },
        { status: 400 },
      );
    }

    const mime = file.type || "";
    if (mime && !mime.startsWith("image/")) {
      return NextResponse.json(
        { error: "이미지 파일만 업로드할 수 있습니다." },
        { status: 400 },
      );
    }

    const stored = await storeNftMedia({
      file,
      name,
      description,
      requestOrigin: req.nextUrl.origin,
    });

    return NextResponse.json({
      tokenURI: stored.tokenURI,
      imagePreview: stored.imageUrl,
      imageUrl: stored.imageUrl,
      mode: stored.mode,
      id: stored.id,
      publicBase: stored.publicBase,
      klipReady: stored.klipReady,
      usage: stored.usage,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "업로드 실패";
    const over = msg.includes("한도");
    return NextResponse.json({ error: msg }, { status: over ? 429 : 500 });
  }
}
