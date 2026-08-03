/**
 * Load .env and print media/R2 readiness. Optional live probe.
 *
 *   npm run media:check
 *   npm run media:check -- --probe
 */
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, "utf8");
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

loadEnvFile(path.join(root, ".env.local"));
loadEnvFile(path.join(root, ".env"));

const wantProbe = process.argv.includes("--probe");

const fields = [
  "MEDIA_PUBLIC_BASE_URL",
  "NEXT_PUBLIC_APP_URL",
  "S3_ENDPOINT",
  "S3_REGION",
  "S3_BUCKET",
  "S3_ACCESS_KEY_ID",
  "S3_SECRET_ACCESS_KEY",
  "S3_FORCE_PATH_STYLE",
];

console.log("\n=== STAMP media env ===\n");
for (const k of fields) {
  const v = process.env[k]?.trim() || "";
  if (!v) {
    console.log(`  [ ] ${k}`);
    continue;
  }
  if (k.includes("SECRET") || k.includes("KEY_ID")) {
    console.log(`  [x] ${k}  (set, ${v.length} chars)`);
  } else {
    console.log(`  [x] ${k}  = ${v}`);
  }
}

const hasS3 =
  process.env.S3_BUCKET?.trim() &&
  process.env.S3_ACCESS_KEY_ID?.trim() &&
  process.env.S3_SECRET_ACCESS_KEY?.trim() &&
  process.env.MEDIA_PUBLIC_BASE_URL?.trim();

const base =
  process.env.MEDIA_PUBLIC_BASE_URL?.trim() ||
  process.env.NEXT_PUBLIC_APP_URL?.trim() ||
  "";

let klipReady = false;
if (base) {
  try {
    const u = new URL(base);
    const host = u.hostname.toLowerCase();
    const loop =
      host === "localhost" ||
      host === "127.0.0.1" ||
      host.endsWith(".local");
    klipReady = u.protocol === "https:" && !loop;
  } catch {
    /* */
  }
}

console.log("\n=== 상태 ===");
console.log(`  모드:     ${hasS3 ? "s3 (R2/S3)" : "local (디스크 + /api/meta)"}`);
console.log(`  public:   ${base || "(요청 origin / localhost)"}`);
console.log(`  klipReady:${klipReady ? " yes" : " NO — 공개 https MEDIA_PUBLIC_BASE_URL 필요"}`);

console.log(`
=== Cloudflare R2 붙이기 (한 번만) ===
1) https://dash.cloudflare.com → R2 → Create bucket  (예: stamp-media)
2) R2 → Manage R2 API Tokens → Create API token
   - Permissions: Object Read & Write (해당 버킷)
   - 나온 Access Key ID / Secret Access Key 복사
3) 계정 Overview 의 Account ID 로 엔드포인트:
   S3_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
4) 공개 URL (둘 중 하나)
   A) 버킷 Settings → Public access → Allow Access
      → R2.dev subdomain 활성화 → https://pub-xxxx.r2.dev
      MEDIA_PUBLIC_BASE_URL=https://pub-xxxx.r2.dev
   B) Custom Domains → media.yourdomain.com 연결 (클립 허용 문의 시 유리)
      MEDIA_PUBLIC_BASE_URL=https://media.yourdomain.com
5) .env 예시:

MEDIA_PUBLIC_BASE_URL=https://pub-xxxx.r2.dev
S3_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
S3_REGION=auto
S3_BUCKET=stamp-media
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_FORCE_PATH_STYLE=true
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app

6) 검증:
   npm run media:check -- --probe
   또는 서버 켠 뒤 GET /api/media/health?probe=1
`);

if (!wantProbe) {
  console.log("(라이브 업로드 테스트: npm run media:check -- --probe)\n");
  process.exit(klipReady && hasS3 ? 0 : 1);
}

if (!hasS3) {
  console.error("probe 실패: S3_* + MEDIA_PUBLIC_BASE_URL 이 필요합니다.\n");
  process.exit(1);
}

const mod = await import(
  pathToFileURL(path.join(root, "src/lib/media/s3.ts")).href
).catch(async () => {
  // Prefer compiled-free path: dynamic import of API via jiti not available.
  // Call probe by spinning minimal inline using same package.
  return null;
});

if (mod?.probeS3Media) {
  const result = await mod.probeS3Media();
  console.log("\n=== probe ===");
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.ok ? 0 : 1);
}

// Fallback: invoke health logic without TS import — use @aws-sdk from node
const { S3Client, HeadBucketCommand, PutObjectCommand, DeleteObjectCommand } =
  await import("@aws-sdk/client-s3");

const region = process.env.S3_REGION?.trim() || "auto";
const endpoint = process.env.S3_ENDPOINT?.trim();
const s3 = new S3Client({
  region,
  endpoint,
  forcePathStyle:
    process.env.S3_FORCE_PATH_STYLE === "1" ||
    process.env.S3_FORCE_PATH_STYLE === "true" ||
    (endpoint || "").includes("r2.cloudflarestorage.com"),
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID.trim(),
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY.trim(),
  },
});

const bucket = process.env.S3_BUCKET.trim();
const publicBase = process.env.MEDIA_PUBLIC_BASE_URL.trim().replace(/\/$/, "");
const key = `n/_health/${Date.now()}.txt`;
const payload = `stamp-media-ok ${new Date().toISOString()}`;

try {
  await s3.send(new HeadBucketCommand({ Bucket: bucket }));
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: Buffer.from(payload, "utf8"),
      ContentType: "text/plain; charset=utf-8",
    }),
  );
  const url = `${publicBase}/${key}`;
  const res = await fetch(url, { cache: "no-store" });
  const text = await res.text();
  const ok = res.ok && text.includes("stamp-media-ok");
  await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key })).catch(() => {});
  console.log("\n=== probe ===");
  console.log(
    JSON.stringify(
      {
        ok,
        status: res.status,
        url,
        bodyPreview: text.slice(0, 80),
      },
      null,
      2,
    ),
  );
  if (!ok) {
    console.error(
      "\n쓰기 성공 but 공개 GET 실패 → R2 Public access / Custom Domain 을 켜세요.\n",
    );
    process.exit(1);
  }
  console.log("\nOK — 미디어 파이프라인 준비됨.\n");
  process.exit(0);
} catch (e) {
  console.error("\nprobe 에러:", e?.message || e);
  process.exit(1);
}
