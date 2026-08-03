/**
 * Public media URLs for NFT metadata/images.
 * Storage: R2/S3. Wallet-facing tokenURI/image: app domain proxy
 * (Klip Flutter often blocks pub-*.r2.dev / IPFS gateways).
 */

export type MediaStatus = {
  canUpload: boolean;
  /**
   * Wallet-facing HTTPS host (app domain) is public non-loopback.
   */
  klipReady: boolean;
  mode: "s3" | "local";
  /** Wallet-facing base (tokenURI / image in metadata) */
  publicBase: string;
  /** Storage public base if set (R2.dev) — not used for on-chain URLs */
  storageBase?: string;
  hint: string;
};

function stripSlash(u: string): string {
  return u.replace(/\/$/, "");
}

export function isLoopbackHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return (
    h === "localhost" ||
    h === "127.0.0.1" ||
    h === "0.0.0.0" ||
    h === "[::1]" ||
    h.endsWith(".local")
  );
}

export function analyzePublicUrl(url: string): {
  okHttps: boolean;
  loopback: boolean;
  host: string;
} {
  try {
    const u = new URL(url);
    return {
      okHttps: u.protocol === "https:",
      loopback: isLoopbackHost(u.hostname),
      host: u.hostname,
    };
  } catch {
    return { okHttps: false, loopback: true, host: "" };
  }
}

/**
 * Wallet-facing base for tokenURI and metadata.image.
 * Prefer NEXT_PUBLIC_APP_URL (Vercel) so host is not r2.dev / ipfs.io.
 */
export function resolveFacingBase(requestOrigin?: string | null): string {
  const env = process.env.NEXT_PUBLIC_APP_URL?.trim() || "";
  if (env) return stripSlash(env);
  if (requestOrigin) return stripSlash(requestOrigin);
  return "http://localhost:3000";
}

/** @deprecated use resolveFacingBase — kept for call sites */
export function resolvePublicBase(requestOrigin?: string | null): string {
  return resolveFacingBase(requestOrigin);
}

export function resolveStorageBase(): string {
  const env = process.env.MEDIA_PUBLIC_BASE_URL?.trim() || "";
  return env ? stripSlash(env) : "";
}

export function s3Configured(): boolean {
  return Boolean(
    process.env.S3_BUCKET?.trim() &&
      process.env.S3_ACCESS_KEY_ID?.trim() &&
      process.env.S3_SECRET_ACCESS_KEY?.trim() &&
      process.env.S3_ENDPOINT?.trim(),
  );
}

export function getMediaStatus(requestOrigin?: string | null): MediaStatus {
  const publicBase = resolveFacingBase(requestOrigin);
  const storageBase = resolveStorageBase();
  const { okHttps, loopback } = analyzePublicUrl(publicBase);
  const mode = s3Configured() ? "s3" : "local";
  const klipReady = okHttps && !loopback;
  const vercelNoDisk = Boolean(process.env.VERCEL) && mode === "local";

  let hint: string;
  if (klipReady && mode === "s3") {
    hint = `R2 저장 + 앱 도메인 메타 프록시 (${publicBase})`;
  } else if (klipReady && mode === "local") {
    hint = `앱 공개 HTTPS로 메타 제공 (${publicBase})`;
  } else if (loopback || !okHttps) {
    hint =
      "NEXT_PUBLIC_APP_URL을 공개 https 배포 주소로 설정하세요. (클립은 localhost / r2.dev / 공개 IPFS 게이트웨이 이미지를 못 볼 수 있음)";
  } else {
    hint = "미디어 스토어를 확인하세요.";
  }

  if (vercelNoDisk) {
    hint += " Vercel에서는 S3/R2 설정을 권장합니다.";
  }

  return {
    canUpload:
      mode === "s3" || !vercelNoDisk || process.env.NODE_ENV === "development",
    klipReady,
    mode,
    publicBase,
    storageBase: storageBase || undefined,
    hint,
  };
}

export function extFromMime(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/gif") return "gif";
  if (mime === "image/webp") return "webp";
  return "bin";
}

export function mimeFromExt(ext: string): string {
  if (ext === "png") return "image/png";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "gif") return "image/gif";
  if (ext === "webp") return "image/webp";
  return "application/octet-stream";
}
