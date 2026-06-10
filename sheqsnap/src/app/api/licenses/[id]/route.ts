import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

function computeStatus(expiryDate: Date): string {
  const now = new Date();
  const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  if (expiryDate < now) return "expired";
  if (expiryDate <= thirtyDays) return "expiring_soon";
  return "active";
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const license = await prisma.license.findUnique({
    where: { id: params.id },
    include: { attachments: { include: { uploadedBy: { select: { name: true } } }, orderBy: { createdAt: "desc" } } },
  });
  if (!license) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(license);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.license.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();

  const expiryDate = body.expiryDate ? new Date(body.expiryDate) : existing.expiryDate;
  const status = computeStatus(expiryDate);

  const updated = await prisma.license.update({
    where: { id: params.id },
    data: {
      holderName: body.holderName ?? existing.holderName,
      holderType: body.holderType ?? existing.holderType,
      licenseType: body.licenseType ?? existing.licenseType,
      licenseNumber: body.licenseNumber !== undefined ? body.licenseNumber : existing.licenseNumber,
      issuedDate: body.issuedDate !== undefined ? (body.issuedDate ? new Date(body.issuedDate) : null) : existing.issuedDate,
      expiryDate,
      status,
      reminderSent: body.reminderSent !== undefined ? body.reminderSent : existing.reminderSent,
      notes: body.notes !== undefined ? body.notes : existing.notes,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  if (user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  await prisma.license.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
