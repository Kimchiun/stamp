import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import {
  extFromMime,
  getMediaStatus,
  resolveFacingBase,
  s3Configured,
} from "./config";
import { putS3Objects } from "./s3";
import { saveLocalMetadata } from "@/lib/localMeta";
import { assertAndAddDailyUsage, type DailyUsage } from "./usage";

export type StoredMediaResult = {
  id: string;
  tokenURI: string;
  imageUrl: string;
  mode: "s3" | "local";
  publicBase: string;
  klipReady: boolean;
  usage?: DailyUsage;
};

/**
 * Store on R2 (or local). tokenURI/image use app-domain proxy URLs when S3
 * so wallets (Klip) never fetch r2.dev directly.
 */
export async function storeNftMedia(params: {
  file: File;
  name: string;
  description: string;
  requestOrigin?: string | null;
}): Promise<StoredMediaResult> {
  const status = getMediaStatus(params.requestOrigin);
  if (!status.canUpload) {
    throw new Error(
      "서버리스 환경에서는 S3/R2 설정이 필요합니다. S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_ENDPOINT를 설정하세요.",
    );
  }

  const facing = resolveFacingBase(params.requestOrigin);
  const bytes = Buffer.from(await params.file.arrayBuffer());
  const mime = params.file.type || "image/png";
  const ext = extFromMime(mime);

  const metaEstimate = Buffer.byteLength(
    JSON.stringify({
      name: params.name,
      description: params.description,
      image: "https://placeholder.example/image",
    }),
    "utf8",
  );

  if (s3Configured()) {
    const id = randomUUID().replace(/-/g, "").slice(0, 16);
    const imageKey = `n/${id}/image.${ext}`;
    const metaKey = `n/${id}/meta.json`;
    // Wallet-facing HTTPS on app host (Vercel), not r2.dev
    const imageUrl = `${facing}/api/media/o/${id}/image`;
    const tokenURI = `${facing}/api/media/o/${id}`;
    const metaBody = {
      name: params.name,
      description: params.description,
      image: imageUrl,
      image_url: imageUrl,
      external_url: facing,
      properties: {
        image: imageUrl,
        media_id: id,
        image_ext: ext,
      },
    };
    const metaBuf = Buffer.from(JSON.stringify(metaBody), "utf8");
    const usage = await assertAndAddDailyUsage(bytes.length + metaBuf.length);

    await putS3Objects([
      {
        key: imageKey,
        body: bytes,
        contentType: mime,
      },
      {
        key: metaKey,
        body: metaBuf,
        contentType: "application/json",
      },
    ]);

    return {
      id,
      tokenURI,
      imageUrl,
      mode: "s3",
      publicBase: facing,
      klipReady: status.klipReady,
      usage,
    };
  }

  const usage = await assertAndAddDailyUsage(bytes.length + metaEstimate + 256);

  const saved = await saveLocalMetadata({
    file: params.file,
    name: params.name,
    description: params.description,
  });
  const imageUrl = `${facing}/api/meta/${saved.id}/image`;
  const tokenURI = `${facing}/api/meta/${saved.id}`;

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
    publicBase: facing,
    klipReady: status.klipReady,
    usage,
  };
}
