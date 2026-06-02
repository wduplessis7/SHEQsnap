import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

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

  const uploadDir = path.join(process.cwd(), "public/uploads/legal-appointments");
  await mkdir(uploadDir, { recursive: true });

  const ext = path.extname(file.name);
  const fileName = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}${ext}`;
  const filePath = path.join(uploadDir, fileName);

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);

  const document = await prisma.appointmentDocument.create({
    data: {
      appointmentId: params.id,
      documentType,
      fileName,
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

  return NextResponse.json(document, { status: 201 });
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

  const filePath = path.join(process.cwd(), "public/uploads/legal-appointments", document.fileName);
  try {
    const { unlink } = await import("fs/promises");
    await unlink(filePath);
  } catch {
    // File may already be missing from disk — proceed with DB deletion
  }

  await prisma.appointmentDocument.delete({ where: { id: docId } });

  return NextResponse.json({ success: true });
}
