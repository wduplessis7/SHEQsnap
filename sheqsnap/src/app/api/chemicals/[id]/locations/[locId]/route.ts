import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/utils";
import { Role } from "@prisma/client";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; locId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const body = await req.json();

  const existing = await (prisma as any).chemicalLocation.findUnique({
    where: { id: params.locId },
  });

  if (!existing || existing.chemicalId !== params.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updateData: any = {};
  if (body.locationName !== undefined) updateData.locationName = body.locationName;
  if (body.buildingArea !== undefined) updateData.buildingArea = body.buildingArea;
  if (body.quantity !== undefined) updateData.quantity = body.quantity;
  if (body.unit !== undefined) updateData.unit = body.unit;
  if (body.maxQuantity !== undefined) updateData.maxQuantity = body.maxQuantity;
  if (body.storageConditions !== undefined) updateData.storageConditions = body.storageConditions;

  const updated = await (prisma as any).chemicalLocation.update({
    where: { id: params.locId },
    data: updateData,
  });

  await writeAuditLog("Chemical", params.id, "LOCATION_UPDATE", user.id, {
    locationId: params.locId,
    updated: updateData,
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; locId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;

  if (user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const existing = await (prisma as any).chemicalLocation.findUnique({
    where: { id: params.locId },
  });

  if (!existing || existing.chemicalId !== params.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await (prisma as any).chemicalLocation.delete({ where: { id: params.locId } });

  await writeAuditLog("Chemical", params.id, "LOCATION_DELETE", user.id, {
    locationId: params.locId,
    locationName: existing.locationName,
  });

  return NextResponse.json({ success: true });
}
