export type MediaUsage = {
  date: string;
  tz: string;
  usedBytes: number;
  limitBytes: number;
  remainingBytes: number;
  uploadCount: number;
  limitMb: number;
};

export type UploadStatus = {
  publicUploads: boolean;
  klipReady: boolean;
  mode: string;
  gateway: string;
  publicBase: string;
  hint: string;
  s3Configured?: boolean;
  checklist?: { id: string; done: boolean; title: string }[];
  usage?: MediaUsage | null;
};

/**
 * Upload image + metadata under a public HTTPS-friendly URL (own domain / CDN).
 */
export async function uploadMetadata(params: {
  file: File;
  name: string;
  description: string;
}): Promise<{
  tokenURI: string;
  imagePreview: string;
  mode?: string;
  klipReady?: boolean;
  usage?: MediaUsage;
}> {
  const form = new FormData();
  form.append("file", params.file);
  form.append("name", params.name);
  form.append("description", params.description);

  const res = await fetch("/api/ipfs", {
    method: "POST",
    body: form,
  }).catch(() => {
    throw new Error(
      "업로드 서버에 연결하지 못했습니다. 개발 서버(npm run dev)가 켜져 있는지 확인해 주세요.",
    );
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "업로드 실패" }));
    throw new Error(err.error || "업로드 실패");
  }

  return res.json();
}

export async function checkPublicUploads(): Promise<UploadStatus> {
  const [uploadRes, healthRes] = await Promise.all([
    fetch("/api/ipfs"),
    fetch("/api/media/health"),
  ]);

  const upload = uploadRes.ok ? await uploadRes.json().catch(() => null) : null;
  const health = healthRes.ok ? await healthRes.json().catch(() => null) : null;

  if (!upload && !health) {
    return {
      publicUploads: false,
      klipReady: false,
      mode: "",
      gateway: "",
      publicBase: "",
      hint: "업로드 상태를 확인할 수 없습니다.",
    };
  }

  const base = health || upload;
  return {
    publicUploads: Boolean(
      (upload && upload.publicUploads) ?? base.canUpload ?? base.publicUploads,
    ),
    klipReady: Boolean(base.klipReady),
    mode: String(base.mode || ""),
    gateway: String(base.publicBase || base.gateway || ""),
    publicBase: String(base.publicBase || base.gateway || ""),
    hint: String(base.hint || ""),
    s3Configured: Boolean(base.s3Configured),
    checklist: Array.isArray(base.checklist) ? base.checklist : undefined,
    usage: (health?.usage || upload?.usage || null) as MediaUsage | null,
  };
}
