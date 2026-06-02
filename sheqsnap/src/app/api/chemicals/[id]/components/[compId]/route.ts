import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/utils";
import { Role } from "@prisma/client";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; compId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const body = await req.json();

  const existing = await (prisma as any).chemicalItemComponent.findUnique({
    where: { id: params.compId },
  });

  if (!existing || existing.chemicalItemId !== params.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updateData: any = {};
  if (body.concentration !== undefined) updateData.concentration = body.concentration;
  if (body.notes !== undefined) updateData.notes = body.notes;

  const updated = await (prisma as any).chemicalItemComponent.update({
    where: { id: params.compId },
    data: updateData,
    include: { library: true },
  });

  await writeAuditLog("ChemicalItem", params.id, "COMPONENT_UPDATE", user.id, {
    componentId: params.compId,
    updated: updateData,
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; compId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;

  if (user.role !== Role.ADMIN && user.role !== Role.SAFETY_OFFICER) {
    return NextResponse.json({ error: "Admin or Safety Officer only" }, { status: 403 });
  }

  const existing = await (prisma as any).chemicalItemComponent.findUnique({
    where: { id: params.compId },
  });

  if (!existing || existing.chemicalItemId !== params.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await (prisma as any).chemicalItemComponent.delete({ where: { id: params.compId } });

  await writeAuditLog("ChemicalItem", params.id, "COMPONENT_DELETE", user.id, {
    componentId: params.compId,
  });

  return NextResponse.json({ success: true });
}
