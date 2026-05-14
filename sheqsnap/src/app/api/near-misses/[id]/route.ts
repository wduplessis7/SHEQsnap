import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/utils";
import { Role } from "@prisma/client";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const item = await prisma.nearMiss.findUnique({
    where: { id: params.id },
    include: {
      reportedBy: { select: { id: true, name: true, email: true } },
      department: { select: { id: true, name: true } },
      assignedUser: { select: { id: true, name: true, email: true } },
      assignedGroup: { select: { id: true, name: true } },
      attachments: { include: { uploadedBy: { select: { name: true } } } },
      actions: {
        include: { owner: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" as const },
      },
      comments: {
        include: { author: { select: { id: true, name: true } } },
        orderBy: { createdAt: "asc" as const },
      },
    },
  });

  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const auditLogs = await prisma.auditLog.findMany({
    where: { entityType: "NearMiss", entityId: params.id },
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

  const existing = await prisma.nearMiss.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Read-only check for closed records unless admin
  if (
    (existing.status === "CLOSED" || existing.status === "CANCELLED") &&
    user.role !== Role.ADMIN
  ) {
    return NextResponse.json({ error: "Record is closed and read-only" }, { status: 403 });
  }

  // Check open actions before closing
  if (body.status === "CLOSED") {
    const openActions = await prisma.action.count({
      where: {
        nearMissId: params.id,
        status: { notIn: ["COMPLETED", "CANCELLED"] },
      },
    });
    if (openActions > 0) {
      return NextResponse.json(
        { error: `Cannot close: ${openActions} open action(s) remain` },
        { status: 422 }
      );
    }
  }

  const updated = await prisma.nearMiss.update({
    where: { id: params.id },
    data: {
      dateReported: body.dateReported ? new Date(body.dateReported) : undefined,
      departmentId: body.departmentId !== undefined ? body.departmentId : undefined,
      location: body.location,
      description: body.description,
      riskCategory: body.riskCategory,
      severityLevel: body.severityLevel,
      immediateAction: body.immediateAction,
      status: body.status,
      assignedUserId: body.assignedUserId !== undefined ? body.assignedUserId : undefined,
      assignedGroupId: body.assignedGroupId !== undefined ? body.assignedGroupId : undefined,
      targetCloseDate: body.targetCloseDate ? new Date(body.targetCloseDate) : null,
      actualCloseDate:
        body.status === "CLOSED" && !existing.actualCloseDate ? new Date() : undefined,
    },
    include: {
      reportedBy: { select: { id: true, name: true } },
      department: { select: { id: true, name: true } },
      assignedUser: { select: { id: true, name: true } },
    },
  });

  await writeAuditLog("NearMiss", params.id, "UPDATE", user.id, {
    previous: { status: existing.status },
    updated: { status: body.status },
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

  await prisma.nearMiss.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
