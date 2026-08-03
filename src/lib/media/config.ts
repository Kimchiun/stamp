/**
 * Public media URLs for NFT metadata/images.
 * Prefer our own HTTPS origin/CDN — public IPFS gateways are often blocked by wallet apps.
 */

export type MediaStatus = {
  /** Can store uploads (local disk or object storage) */
  canUpload: boolean;
  /**
   * tokenURI/image use a non-loopback HTTPS host wallets can fetch.
   * false on localhost/http — Klip Flutter will not load images.
   */
  klipReady: boolean;
  mode: "s3" | "local";
  publicBase: string;
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
 * Resolve absolute public base for tokenURI / image fields.
 * Priority: MEDIA_PUBLIC_BASE_URL → NEXT_PUBLIC_APP_URL → request origin
 */
export function resolvePublicBase(requestOrigin?: string | null): string {
  const env =
    process.env.MEDIA_PUBLIC_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    "";
  if (env) return stripSlash(env);
  if (requestOrigin) return stripSlash(requestOrigin);
  return "http://localhost:3000";
}

export function s3Configured(): boolean {
  return Boolean(
    process.env.S3_BUCKET?.trim() &&
      process.env.S3_ACCESS_KEY_ID?.trim() &&
      process.env.S3_SECRET_ACCESS_KEY?.trim() &&
      process.env.MEDIA_PUBLIC_BASE_URL?.trim(),
  );
}

export function getMediaStatus(requestOrigin?: string | null): MediaStatus {
  const publicBase = resolvePublicBase(requestOrigin);
  const { okHttps, loopback } = analyzePublicUrl(publicBase);
  const mode = s3Configured() ? "s3" : "local";
  const klipReady = okHttps && !loopback;

  // On Vercel-like serverless without S3, local disk is ephemeral — still "can upload" for one request but warn
  const vercelNoDisk = Boolean(process.env.VERCEL) && mode === "local";

  let hint: string;
  if (klipReady && mode === "s3") {
    hint = `미디어 CDN/오브젝트 스토리지 활성 (${publicBase})`;
  } else if (klipReady && mode === "local") {
    hint = `앱 공개 HTTPS로 메타 제공 (${publicBase})`;
  } else if (loopback || !okHttps) {
    hint =
      "공개 HTTPS 도메인이 필요합니다. MEDIA_PUBLIC_BASE_URL 또는 NEXT_PUBLIC_APP_URL을 https://… 로 설정하세요. (localhost·공개 IPFS 게이트웨이는 클립 플러터에서 차단·미표시될 수 있음)";
  } else {
    hint = "미디어 스토어를 확인하세요.";
  }

  if (vercelNoDisk) {
    hint +=
      " Vercel 등 서버리스에서는 S3/R2(S3_* + MEDIA_PUBLIC_BASE_URL) 설정을 권장합니다.";
  }

  return {
    canUpload: mode === "s3" || !vercelNoDisk || process.env.NODE_ENV === "development",
    klipReady,
    mode,
    publicBase,
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
