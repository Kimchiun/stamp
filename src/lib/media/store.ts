import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import {
  extFromMime,
  getMediaStatus,
  resolvePublicBase,
  s3Configured,
} from "./config";
import { putS3Objects } from "./s3";
import { saveLocalMetadata } from "@/lib/localMeta";

export type StoredMediaResult = {
  id: string;
  tokenURI: string;
  imageUrl: string;
  mode: "s3" | "local";
  publicBase: string;
  klipReady: boolean;
};

/**
 * Store image + ERC-721 style metadata JSON under a public HTTPS-friendly URL.
 * On-chain tokenURI points here — not to public IPFS gateways.
 */
export async function storeNftMedia(params: {
  file: File;
  name: string;
  description: string;
  /** browser origin fallback when env public base unset */
  requestOrigin?: string | null;
}): Promise<StoredMediaResult> {
  const status = getMediaStatus(params.requestOrigin);
  if (!status.canUpload) {
    throw new Error(
      "서버리스 환경에서는 S3/R2 설정이 필요합니다. S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, MEDIA_PUBLIC_BASE_URL을 설정하세요.",
    );
  }

  const publicBase = resolvePublicBase(params.requestOrigin);
  const bytes = Buffer.from(await params.file.arrayBuffer());
  const mime = params.file.type || "image/png";
  const ext = extFromMime(mime);

  if (s3Configured()) {
    const id = randomUUID().replace(/-/g, "").slice(0, 16);
    const imageKey = `n/${id}/image.${ext}`;
    const metaKey = `n/${id}/meta.json`;
    const imageUrl = `${publicBase}/${imageKey}`;
    const metaBody = {
      name: params.name,
      description: params.description,
      image: imageUrl,
      image_url: imageUrl,
      external_url: publicBase,
      properties: { image: imageUrl },
    };
    await putS3Objects([
      {
        key: imageKey,
        body: bytes,
        contentType: mime,
      },
      {
        key: metaKey,
        body: Buffer.from(JSON.stringify(metaBody), "utf8"),
        contentType: "application/json",
      },
    ]);
    const tokenURI = `${publicBase}/${metaKey}`;
    return {
      id,
      tokenURI,
      imageUrl,
      mode: "s3",
      publicBase,
      klipReady: status.klipReady,
    };
  }

  // Local disk + Next routes /api/meta/*
  const saved = await saveLocalMetadata({
    file: params.file,
    name: params.name,
    description: params.description,
  });
  const imageUrl = `${publicBase}/api/meta/${saved.id}/image`;
  const tokenURI = `${publicBase}/api/meta/${saved.id}`;

  // Also drop a static copy under .data for optional static hosts
  try {
    const mirror = path.join(process.cwd(), ".data", "public-mirror", saved.id);
    await mkdir(mirror, { recursive: true });
    await writeFile(path.join(mirror, `image.${ext}`), bytes);
    await writeFile(
      path.join(mirror, "meta.json"),
      JSON.stringify({
        name: params.name,
        description: params.description,
        image: imageUrl,
        image_url: imageUrl,
      }),
    );
  } catch {
    /* optional */
  }

  return {
    id: saved.id,
    tokenURI,
    imageUrl,
    mode: "local",
    publicBase,
    klipReady: status.klipReady,
  };
}
