import { mkdir, writeFile, readFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const ROOT = path.join(process.cwd(), ".data", "meta");

export type StoredMeta = {
  id: string;
  name: string;
  description: string;
  imageMime: string;
  imageExt: string;
  createdAt: number;
};

export async function saveLocalMetadata(params: {
  file: File;
  name: string;
  description: string;
}): Promise<{ id: string; metaPath: string; imagePath: string }> {
  const id = randomUUID().replace(/-/g, "").slice(0, 16);
  const dir = path.join(ROOT, id);
  await mkdir(dir, { recursive: true });

  const buf = Buffer.from(await params.file.arrayBuffer());
  const mime = params.file.type || "application/octet-stream";
  const ext =
    mime === "image/png"
      ? "png"
      : mime === "image/jpeg"
        ? "jpg"
        : mime === "image/gif"
          ? "gif"
          : mime === "image/webp"
            ? "webp"
            : "bin";

  await writeFile(path.join(dir, `image.${ext}`), buf);

  const record: StoredMeta = {
    id,
    name: params.name,
    description: params.description,
    imageMime: mime,
    imageExt: ext,
    createdAt: Date.now(),
  };
  await writeFile(path.join(dir, "record.json"), JSON.stringify(record));

  return {
    id,
    metaPath: path.join(dir, "record.json"),
    imagePath: path.join(dir, `image.${ext}`),
  };
}

export async function readLocalRecord(id: string): Promise<StoredMeta | null> {
  try {
    const raw = await readFile(path.join(ROOT, id, "record.json"), "utf8");
    return JSON.parse(raw) as StoredMeta;
  } catch {
    return null;
  }
}

export async function readLocalImage(
  id: string,
): Promise<{ buf: Buffer; mime: string } | null> {
  const record = await readLocalRecord(id);
  if (!record) return null;
  try {
    const buf = await readFile(
      path.join(ROOT, id, `image.${record.imageExt}`),
    );
    return { buf, mime: record.imageMime };
  } catch {
    return null;
  }
}
