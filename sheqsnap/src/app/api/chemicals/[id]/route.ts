import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/utils";
import { Role } from "@prisma/client";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const chemical = await (prisma as any).chemical.findUnique({
    where: { id: params.id },
    include: {
      addedBy: { select: { id: true, name: true, email: true } },
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

  if (!chemical) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const auditLogs = await prisma.auditLog.findMany({
    where: { entityType: "Chemical", entityId: params.id },
    include: { changedBy: { select: { id: true, name: true } } },
    orderBy: { timestamp: "desc" },
  });

  return NextResponse.json({ ...chemical, auditLogs });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const body = await req.json();

  const existing = await (prisma as any).chemical.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Only admins can change deletedAt
  if (body.deletedAt !== undefined && user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const updateData: any = {};

  if (body.name !== undefined) updateData.name = body.name;
  if (body.tradeName !== undefined) updateData.tradeName = body.tradeName;
  if (body.casNumber !== undefined) updateData.casNumber = body.casNumber;
  if (body.formula !== undefined) updateData.formula = body.formula;
  if (body.manufacturer !== undefined) updateData.manufacturer = body.manufacturer;
  if (body.supplier !== undefined) updateData.supplier = body.supplier;
  if (body.ghsPictograms !== undefined) updateData.ghsPictograms = JSON.stringify(body.ghsPictograms);
  if (body.hazardClass !== undefined) updateData.hazardClass = body.hazardClass;
  if (body.signalWord !== undefined) updateData.signalWord = body.signalWord;
  if (body.hazardStatements !== undefined) updateData.hazardStatements = JSON.stringify(body.hazardStatements);
  if (body.precautionaryStatements !== undefined) updateData.precautionaryStatements = JSON.stringify(body.precautionaryStatements);
  if (body.flashPoint !== undefined) updateData.flashPoint = body.flashPoint;
  if (body.boilingPoint !== undefined) updateData.boilingPoint = body.boilingPoint;
  if (body.physicalState !== undefined) updateData.physicalState = body.physicalState;
  if (body.colour !== undefined) updateData.colour = body.colour;
  if (body.odour !== undefined) updateData.odour = body.odour;
  if (body.isHazardous !== undefined) updateData.isHazardous = body.isHazardous;
  if (body.unNumber !== undefined) updateData.unNumber = body.unNumber;
  if (body.mhiThreshold !== undefined) updateData.mhiThreshold = body.mhiThreshold;
  if (body.mhiQuantityOnSite !== undefined) updateData.mhiQuantityOnSite = body.mhiQuantityOnSite;
  if (body.pubchemCid !== undefined) updateData.pubchemCid = body.pubchemCid;
  if (body.emergencyContact !== undefined) updateData.emergencyContact = body.emergencyContact;
  if (body.poisonCentre !== undefined) updateData.poisonCentre = body.poisonCentre;
  if (body.notes !== undefined) updateData.notes = body.notes;
  if (body.deletedAt !== undefined) updateData.deletedAt = body.deletedAt ? new Date(body.deletedAt) : null;

  const updated = await (prisma as any).chemical.update({
    where: { id: params.id },
    data: updateData,
    include: {
      addedBy: { select: { id: true, name: true } },
    },
  });

  await writeAuditLog("Chemical", params.id, "UPDATE", user.id, {
    previous: { name: existing.name },
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

  const existing = await (prisma as any).chemical.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const deletedAt = new Date();
  await (prisma as any).chemical.update({ where: { id: params.id }, data: { deletedAt } });
  await writeAuditLog("Chemical", params.id, "DELETE", user.id, { deletedAt: deletedAt.toISOString() });

  return NextResponse.json({ success: true });
}
