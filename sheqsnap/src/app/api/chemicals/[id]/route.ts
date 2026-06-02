import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/utils";
import { Role } from "@prisma/client";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const item = await (prisma as any).chemicalItem.findUnique({
    where: { id: params.id },
    include: {
      addedBy: { select: { id: true, name: true, email: true } },
      components: {
        include: {
          library: true,
        },
        orderBy: { createdAt: "asc" },
      },
      sdsDocuments: {
        where: { deletedAt: null },
        include: {
          uploadedBy: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      locations: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const auditLogs = await prisma.auditLog.findMany({
    where: { entityType: "ChemicalItem", entityId: params.id },
    include: { changedBy: { select: { id: true, name: true } } },
    orderBy: { timestamp: "desc" },
  });

  return NextResponse.json({ ...item, auditLogs });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const body = await req.json();

  const existing = await (prisma as any).chemicalItem.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Only admins can change deletedAt
  if (body.deletedAt !== undefined && user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const updateData: any = {};

  if (body.productName !== undefined) updateData.productName = body.productName;
  if (body.tradeName !== undefined) updateData.tradeName = body.tradeName;
  if (body.manufacturer !== undefined) updateData.manufacturer = body.manufacturer;
  if (body.supplier !== undefined) updateData.supplier = body.supplier;
  if (body.physicalState !== undefined) updateData.physicalState = body.physicalState;
  if (body.colour !== undefined) updateData.colour = body.colour;
  if (body.odour !== undefined) updateData.odour = body.odour;
  if (body.flashPoint !== undefined) updateData.flashPoint = body.flashPoint;
  if (body.boilingPoint !== undefined) updateData.boilingPoint = body.boilingPoint;
  if (body.unNumber !== undefined) updateData.unNumber = body.unNumber;
  if (body.mhiThreshold !== undefined) updateData.mhiThreshold = body.mhiThreshold;
  if (body.mhiQuantityOnSite !== undefined) updateData.mhiQuantityOnSite = body.mhiQuantityOnSite;
  if (body.isHazardous !== undefined) updateData.isHazardous = body.isHazardous;
  if (body.emergencyContact !== undefined) updateData.emergencyContact = body.emergencyContact;
  if (body.poisonCentre !== undefined) updateData.poisonCentre = body.poisonCentre;
  if (body.notes !== undefined) updateData.notes = body.notes;
  if (body.deletedAt !== undefined) updateData.deletedAt = body.deletedAt ? new Date(body.deletedAt) : null;

  const updated = await (prisma as any).chemicalItem.update({
    where: { id: params.id },
    data: updateData,
    include: {
      addedBy: { select: { id: true, name: true } },
    },
  });

  await writeAuditLog("ChemicalItem", params.id, "UPDATE", user.id, {
    previous: { productName: existing.productName },
    updated: updateData,
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

  const existing = await (prisma as any).chemicalItem.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const deletedAt = new Date();
  await (prisma as any).chemicalItem.update({ where: { id: params.id }, data: { deletedAt } });
  await writeAuditLog("ChemicalItem", params.id, "DELETE", user.id, { deletedAt: deletedAt.toISOString() });

  return NextResponse.json({ success: true });
}
