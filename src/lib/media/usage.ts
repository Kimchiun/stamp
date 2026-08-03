/**
 * Soft daily media upload quota (R2 / local) to control storage + request cost.
 * Default 100 MB/day (calendar day in Asia/Seoul).
 */

import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import {
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { createS3Client } from "./s3";
import { s3Configured } from "./config";

export type DailyUsage = {
  date: string;
  /** timezone label for the date key */
  tz: string;
  usedBytes: number;
  limitBytes: number;
  remainingBytes: number;
  uploadCount: number;
  limitMb: number;
};

function limitMb(): number {
  const n = Number(process.env.MEDIA_DAILY_LIMIT_MB);
  if (Number.isFinite(n) && n > 0) return n;
  return 100;
}

export function mediaDailyLimitBytes(): number {
  return Math.floor(limitMb() * 1024 * 1024);
}

/** YYYY-MM-DD in Asia/Seoul */
export function seoulDateKey(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function usageKey(date: string): string {
  return `n/_usage/${date}.json`;
}

type UsageRecord = {
  date: string;
  usedBytes: number;
  uploadCount: number;
  updatedAt: string;
};

function emptyRecord(date: string): UsageRecord {
  return { date, usedBytes: 0, uploadCount: 0, updatedAt: new Date().toISOString() };
}

function toDaily(rec: UsageRecord): DailyUsage {
  const limitBytes = mediaDailyLimitBytes();
  return {
    date: rec.date,
    tz: "Asia/Seoul",
    usedBytes: rec.usedBytes,
    limitBytes,
    remainingBytes: Math.max(0, limitBytes - rec.usedBytes),
    uploadCount: rec.uploadCount,
    limitMb: limitMb(),
  };
}

async function readLocalUsage(date: string): Promise<UsageRecord> {
  const file = path.join(process.cwd(), ".data", "usage", `${date}.json`);
  try {
    const raw = await readFile(file, "utf8");
    const j = JSON.parse(raw) as UsageRecord;
    if (typeof j.usedBytes === "number") return j;
  } catch {
    /* */
  }
  return emptyRecord(date);
}

async function writeLocalUsage(rec: UsageRecord): Promise<void> {
  const dir = path.join(process.cwd(), ".data", "usage");
  await mkdir(dir, { recursive: true });
  await writeFile(
    path.join(dir, `${rec.date}.json`),
    JSON.stringify(rec, null, 2),
  );
}

async function readS3Usage(date: string): Promise<UsageRecord> {
  const bucket = process.env.S3_BUCKET!.trim();
  const s3 = createS3Client();
  try {
    const out = await s3.send(
      new GetObjectCommand({ Bucket: bucket, Key: usageKey(date) }),
    );
    const text = await out.Body?.transformToString("utf8");
    if (!text) return emptyRecord(date);
    const j = JSON.parse(text) as UsageRecord;
    if (typeof j.usedBytes === "number") return j;
  } catch {
    /* NoSuchKey */
  }
  return emptyRecord(date);
}

async function writeS3Usage(rec: UsageRecord): Promise<void> {
  const bucket = process.env.S3_BUCKET!.trim();
  const s3 = createS3Client();
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: usageKey(rec.date),
      Body: Buffer.from(JSON.stringify(rec), "utf8"),
      ContentType: "application/json",
      CacheControl: "no-store",
    }),
  );
}

export async function getDailyMediaUsage(): Promise<DailyUsage> {
  const date = seoulDateKey();
  const rec = s3Configured()
    ? await readS3Usage(date)
    : await readLocalUsage(date);
  return toDaily(rec);
}

/**
 * Reserve `bytes` against today's quota before/after upload.
 * Soft limit: concurrent requests may slightly exceed under rare races.
 */
export async function assertAndAddDailyUsage(bytes: number): Promise<DailyUsage> {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return getDailyMediaUsage();
  }

  const date = seoulDateKey();
  const limit = mediaDailyLimitBytes();
  const rec = s3Configured()
    ? await readS3Usage(date)
    : await readLocalUsage(date);

  if (rec.usedBytes + bytes > limit) {
    const usedMb = (rec.usedBytes / (1024 * 1024)).toFixed(1);
    const limitLabel = limitMb();
    throw new Error(
      `오늘 미디어 업로드 한도(${limitLabel}MB)를 초과했습니다. 사용 ${usedMb}MB / ${limitLabel}MB (한국 시간 기준 자정 리셋). 내일 다시 시도하거나 MEDIA_DAILY_LIMIT_MB를 조정하세요.`,
    );
  }

  const next: UsageRecord = {
    date,
    usedBytes: rec.usedBytes + bytes,
    uploadCount: rec.uploadCount + 1,
    updatedAt: new Date().toISOString(),
  };

  if (s3Configured()) await writeS3Usage(next);
  else await writeLocalUsage(next);

  return toDaily(next);
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
