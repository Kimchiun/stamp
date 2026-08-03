import { NextRequest, NextResponse } from "next/server";
import { getMediaStatus, s3Configured } from "@/lib/media/config";
import { probeS3Media } from "@/lib/media/s3";
import { getDailyMediaUsage } from "@/lib/media/usage";

export const runtime = "nodejs";

/**
 * Media pipeline diagnostics.
 * GET /api/media/health
 * GET /api/media/health?probe=1
 */
export async function GET(req: NextRequest) {
  const status = getMediaStatus(req.nextUrl.origin);
  const probe = req.nextUrl.searchParams.get("probe") === "1";

  let usage = null;
  try {
    usage = await getDailyMediaUsage();
  } catch {
    /* */
  }

  const body: Record<string, unknown> = {
    ...status,
    s3Configured: s3Configured(),
    usage,
    env: {
      hasMediaPublicBase: Boolean(process.env.MEDIA_PUBLIC_BASE_URL?.trim()),
      hasAppUrl: Boolean(process.env.NEXT_PUBLIC_APP_URL?.trim()),
      hasS3Bucket: Boolean(process.env.S3_BUCKET?.trim()),
      hasS3Endpoint: Boolean(process.env.S3_ENDPOINT?.trim()),
      hasS3Keys: Boolean(
        process.env.S3_ACCESS_KEY_ID?.trim() &&
          process.env.S3_SECRET_ACCESS_KEY?.trim(),
      ),
      dailyLimitMb: process.env.MEDIA_DAILY_LIMIT_MB || "100",
    },
    checklist: [
      {
        id: "r2_bucket",
        done: Boolean(process.env.S3_BUCKET?.trim()),
        title: "R2/S3 버킷 생성 + S3_BUCKET",
      },
      {
        id: "r2_api_token",
        done: Boolean(
          process.env.S3_ACCESS_KEY_ID?.trim() &&
            process.env.S3_SECRET_ACCESS_KEY?.trim(),
        ),
        title: "R2 API 토큰 → S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY",
      },
      {
        id: "r2_endpoint",
        done: Boolean(process.env.S3_ENDPOINT?.trim()),
        title: "S3_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com",
      },
      {
        id: "public_base",
        done: Boolean(process.env.MEDIA_PUBLIC_BASE_URL?.trim()),
        title:
          "MEDIA_PUBLIC_BASE_URL = R2 public r2.dev 또는 커스텀 도메인 (https)",
      },
      {
        id: "klip_ready",
        done: status.klipReady,
        title: "tokenURI 호스트가 공개 https (localhost 아님)",
      },
      {
        id: "daily_quota",
        done: true,
        title: `일일 업로드 한도 ${process.env.MEDIA_DAILY_LIMIT_MB || "100"}MB (KST)`,
      },
    ],
  };

  if (probe) {
    if (!s3Configured()) {
      body.probe = {
        ok: false,
        step: "config",
        message:
          "probe에 S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, MEDIA_PUBLIC_BASE_URL 이 모두 필요합니다.",
      };
    } else {
      try {
        body.probe = await probeS3Media();
      } catch (e: unknown) {
        body.probe = {
          ok: false,
          step: "exception",
          message: e instanceof Error ? e.message : String(e),
        };
      }
    }
  }

  return NextResponse.json(body);
}
