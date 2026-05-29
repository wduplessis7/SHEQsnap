import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";

const AWS_REGION = process.env.AWS_REGION;
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const AWS_S3_BUCKET = process.env.AWS_S3_BUCKET;

function isS3Configured(): boolean {
  return !!(AWS_REGION && AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY && AWS_S3_BUCKET);
}

function getClient(): S3Client {
  return new S3Client({
    region: AWS_REGION!,
    credentials: {
      accessKeyId: AWS_ACCESS_KEY_ID!,
      secretAccessKey: AWS_SECRET_ACCESS_KEY!,
    },
  });
}

export async function uploadFile(key: string, buffer: Buffer, mimeType: string): Promise<"s3" | "local"> {
  if (isS3Configured()) {
    try {
      const client = getClient();
      await client.send(new PutObjectCommand({
        Bucket: AWS_S3_BUCKET!,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
      }));
      return "s3";
    } catch (err) {
      console.error("[storage] S3 upload failed, falling back to local:", err);
    }
  }

  // Local fallback — writes to /data/uploads/ (persistent Docker volume)
  const uploadDir = path.join("/data", "uploads");
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, path.basename(key)), buffer);
  return "local";
}

export async function deleteFile(key: string): Promise<void> {
  if (isS3Configured()) {
    try {
      const client = getClient();
      await client.send(new DeleteObjectCommand({ Bucket: AWS_S3_BUCKET!, Key: key }));
      return;
    } catch {
      // fall through to local delete
    }
  }
  try {
    await unlink(path.join("/data", "uploads", path.basename(key)));
  } catch {
    // file may not exist
  }
}

export function buildStorageKey(filename: string): string {
  const tenant = process.env.S3_TENANT_PREFIX;
  return tenant ? `${tenant}/uploads/${filename}` : `uploads/${filename}`;
}

export function getFileUrl(key: string): string {
  const s3PublicUrl = process.env.NEXT_PUBLIC_S3_PUBLIC_URL;
  if (s3PublicUrl) return `${s3PublicUrl}/${key}`;
  // Local fallback — served via /api/uploads/[filename]
  return `/api/uploads/${path.basename(key)}`;
}
