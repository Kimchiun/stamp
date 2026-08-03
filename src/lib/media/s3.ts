import {
  HeadBucketCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  S3Client,
  type S3ClientConfig,
} from "@aws-sdk/client-s3";

function requireEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`${name} 이(가) 비어 있습니다.`);
  return v;
}

export function createS3Client(): S3Client {
  const region = process.env.S3_REGION?.trim() || "auto";
  const endpoint = process.env.S3_ENDPOINT?.trim();
  const config: S3ClientConfig = {
    region,
    credentials: {
      accessKeyId: requireEnv("S3_ACCESS_KEY_ID"),
      secretAccessKey: requireEnv("S3_SECRET_ACCESS_KEY"),
    },
  };
  if (endpoint) {
    config.endpoint = endpoint;
    config.forcePathStyle =
      process.env.S3_FORCE_PATH_STYLE === "1" ||
      process.env.S3_FORCE_PATH_STYLE === "true" ||
      endpoint.includes("r2.cloudflarestorage.com");
  }
  return new S3Client(config);
}

export async function putS3Objects(
  objects: { key: string; body: Buffer; contentType: string }[],
): Promise<void> {
  const bucket = requireEnv("S3_BUCKET");
  const s3 = createS3Client();
  await Promise.all(
    objects.map((o) =>
      s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: o.key,
          Body: o.body,
          ContentType: o.contentType,
          CacheControl: "public, max-age=31536000, immutable",
        }),
      ),
    ),
  );
}

export type S3ProbeResult = {
  ok: boolean;
  step: string;
  message: string;
  publicFetchOk?: boolean;
  publicUrl?: string;
};

/**
 * Write a tiny object, optionally fetch via MEDIA_PUBLIC_BASE_URL, then delete.
 */
export async function probeS3Media(): Promise<S3ProbeResult> {
  const bucket = requireEnv("S3_BUCKET");
  const publicBase = requireEnv("MEDIA_PUBLIC_BASE_URL").replace(/\/$/, "");
  const s3 = createS3Client();
  const key = `n/_health/${Date.now()}.txt`;
  const body = Buffer.from(`stamp-media-ok ${new Date().toISOString()}`, "utf8");

  try {
    await s3.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch (e: unknown) {
    return {
      ok: false,
      step: "HeadBucket",
      message:
        e instanceof Error
          ? `버킷 접근 실패: ${e.message} (S3_ENDPOINT / 키 / 버킷명 확인)`
          : "버킷 접근 실패",
    };
  }

  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: "text/plain; charset=utf-8",
        CacheControl: "no-store",
      }),
    );
  } catch (e: unknown) {
    return {
      ok: false,
      step: "PutObject",
      message:
        e instanceof Error
          ? `업로드 실패: ${e.message}`
          : "업로드 실패",
    };
  }

  const publicUrl = `${publicBase}/${key}`;
  let publicFetchOk = false;
  let fetchMsg = "";
  try {
    const res = await fetch(publicUrl, {
      method: "GET",
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
    const text = await res.text();
    publicFetchOk = res.ok && text.includes("stamp-media-ok");
    fetchMsg = publicFetchOk
      ? "공개 URL GET 성공"
      : `공개 URL 응답 ${res.status} (R2 Public access / Custom Domain 연결 확인)`;
  } catch (e: unknown) {
    fetchMsg =
      e instanceof Error
        ? `공개 URL fetch 실패: ${e.message}`
        : "공개 URL fetch 실패";
  }

  try {
    await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  } catch {
    /* leave orphan ok */
  }

  if (!publicFetchOk) {
    return {
      ok: false,
      step: "PublicGET",
      message: fetchMsg,
      publicFetchOk: false,
      publicUrl,
    };
  }

  return {
    ok: true,
    step: "done",
    message: "S3/R2 쓰기 + 공개 HTTPS 읽기 정상",
    publicFetchOk: true,
    publicUrl,
  };
}
