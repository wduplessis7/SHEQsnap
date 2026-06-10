import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import path from "path";
import { randomUUID } from "crypto";
import { uploadFile, getFileUrl, buildStorageKey } from "@/lib/storage";

const ALLOWED_EXTENSIONS = new Set([
  ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".csv", ".txt",
  ".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic",
  ".mp4", ".mov", ".avi",
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const licenseId = searchParams.get("licenseId");
  const inductionId = searchParams.get("inductionId");

  const where: any = {};
  if (licenseId) where.licenseId = licenseId;
  else if (inductionId) where.inductionId = inductionId;
  else return NextResponse.json([]);

  const attachments = await prisma.attachment.findMany({
    where,
    include: { uploadedBy: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(attachments);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;

  const formData = await req.formData();
  const file = formData.get("file") as File;
  const nearMissId = formData.get("nearMissId") as string | null;
  const incidentId = formData.get("incidentId") as string | null;
  const actionId = formData.get("actionId") as string | null;
  const licenseId = formData.get("licenseId") as string | null;
  const inductionId = formData.get("inductionId") as string | null;

  if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 413 });
  }

  const ext = path.extname(file.name).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return NextResponse.json({ error: "File type not allowed" }, { status: 415 });
  }

  const key = buildStorageKey(`${randomUUID()}${ext}`);
  const buffer = Buffer.from(await file.arrayBuffer());

  await uploadFile(key, buffer, file.type);

  const attachment = await prisma.attachment.create({
    data: {
      filename: key,
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
      uploadedById: user.id,
      nearMissId: nearMissId || null,
      incidentId: incidentId || null,
      actionId: actionId || null,
      licenseId: licenseId || null,
      inductionId: inductionId || null,
    },
    include: {
      uploadedBy: { select: { name: true } },
    },
  });

  return NextResponse.json({ ...attachment, url: getFileUrl(key) }, { status: 201 });
}
