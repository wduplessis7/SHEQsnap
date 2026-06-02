import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/utils";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const docs = await (prisma as any).sdsDocument.findMany({
    where: {
      chemicalId: params.id,
      deletedAt: null,
      isActive: true,
    },
    include: {
      uploadedBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(docs);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const body = await req.json();

  // Verify chemical exists
  const chemical = await (prisma as any).chemical.findUnique({ where: { id: params.id } });
  if (!chemical) return NextResponse.json({ error: "Chemical not found" }, { status: 404 });

  const language = body.language || "English";

  // Deactivate other docs with same language
  await (prisma as any).sdsDocument.updateMany({
    where: {
      chemicalId: params.id,
      language,
      deletedAt: null,
      isActive: true,
    },
    data: { isActive: false },
  });

  const doc = await (prisma as any).sdsDocument.create({
    data: {
      chemicalId: params.id,
      version: body.version || "1.0",
      language,
      effectiveDate: body.effectiveDate ? new Date(body.effectiveDate) : null,
      expiryDate: body.expiryDate ? new Date(body.expiryDate) : null,
      filename: body.filename,
      originalName: body.originalName,
      fileSize: body.fileSize,
      mimeType: body.mimeType || "application/pdf",
      isActive: true,
      notes: body.notes || null,
      uploadedById: user.id,
    },
    include: {
      uploadedBy: { select: { id: true, name: true } },
    },
  });

  await writeAuditLog("Chemical", params.id, "SDS_UPLOAD", user.id, {
    sdsId: doc.id,
    filename: doc.originalName,
    language,
    version: doc.version,
  });

  return NextResponse.json(doc, { status: 201 });
}
