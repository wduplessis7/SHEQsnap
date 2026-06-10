import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import path from "path";
import { randomUUID } from "crypto";
import { uploadFile, buildStorageKey, getFileUrl, deleteFile } from "@/lib/storage";

const ALLOWED_EXTENSIONS = new Set([
  ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".csv", ".txt",
  ".jpg", ".jpeg", ".png", ".gif", ".webp",
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;

  const appointment = await prisma.legalAppointment.findUnique({ where: { id: params.id } });
  if (!appointment) return NextResponse.json({ error: "Appointment not found" }, { status: 404 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const documentType = formData.get("documentType") as string | null;
  const notes = formData.get("notes") as string | null;
  const expiryDate = formData.get("expiryDate") as string | null;

  if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  if (!documentType) return NextResponse.json({ error: "documentType is required" }, { status: 400 });

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 413 });
  }

  const ext = path.extname(file.name).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return NextResponse.json({ error: "File type not allowed" }, { status: 415 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const key = buildStorageKey(`legal-appt-${randomUUID()}${ext}`);
  await uploadFile(key, buffer, file.type || "application/octet-stream");

  const document = await prisma.appointmentDocument.create({
    data: {
      appointmentId: params.id,
      documentType,
      fileName: key,
      originalName: file.name,
      mimeType: file.type || null,
      size: file.size || null,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      notes: notes || null,
      uploadedById: user.id,
    },
    include: {
      uploadedBy: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ ...document, fileUrl: getFileUrl(document.fileName) }, { status: 201 });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const docId = searchParams.get("docId");

  if (!docId) return NextResponse.json({ error: "docId query param is required" }, { status: 400 });

  const document = await prisma.appointmentDocument.findUnique({
    where: { id: docId },
  });

  if (!document) return NextResponse.json({ error: "Document not found" }, { status: 404 });
  if (document.appointmentId !== params.id) {
    return NextResponse.json({ error: "Document does not belong to this appointment" }, { status: 403 });
  }

  await deleteFile(document.fileName).catch(() => {});

  await prisma.appointmentDocument.delete({ where: { id: docId } });

  return NextResponse.json({ success: true });
}
