import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/utils";
import { Role } from "@prisma/client";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; sdsId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;

  if (user.role !== Role.ADMIN && user.role !== Role.SAFETY_OFFICER) {
    return NextResponse.json({ error: "Admin or Safety Officer only" }, { status: 403 });
  }

  const doc = await (prisma as any).sdsDocument.findUnique({
    where: { id: params.sdsId },
  });

  if (!doc || doc.chemicalId !== params.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const deletedAt = new Date();
  await (prisma as any).sdsDocument.update({
    where: { id: params.sdsId },
    data: { deletedAt, isActive: false },
  });

  await writeAuditLog("Chemical", params.id, "SDS_DELETE", user.id, {
    sdsId: params.sdsId,
    originalName: doc.originalName,
    deletedAt: deletedAt.toISOString(),
  });

  return NextResponse.json({ success: true });
}
