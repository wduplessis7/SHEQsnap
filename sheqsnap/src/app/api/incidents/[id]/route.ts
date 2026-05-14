import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/utils";
import { Role } from "@prisma/client";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const item = await prisma.incident.findUnique({
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
    where: { entityType: "Incident", entityId: params.id },
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

  const existing = await prisma.incident.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (
    (existing.status === "CLOSED" || existing.status === "CANCELLED") &&
    user.role !== Role.ADMIN
  ) {
    return NextResponse.json({ error: "Record is closed and read-only" }, { status: 403 });
  }

  if (body.status === "CLOSED") {
    const openActions = await prisma.action.count({
      where: {
        incidentId: params.id,
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

  const updated = await prisma.incident.update({
    where: { id: params.id },
    data: {
      dateOfIncident: body.dateOfIncident ? new Date(body.dateOfIncident) : undefined,
      dateReported: body.dateReported ? new Date(body.dateReported) : undefined,
      departmentId: body.departmentId !== undefined ? body.departmentId : undefined,
      location: body.location,
      incidentType: body.incidentType,
      description: body.description,
      personsInvolved: body.personsInvolved,
      injuryType: body.injuryType,
      severityLevel: body.severityLevel,
      rootCause: body.rootCause,
      immediateAction: body.immediateAction,
      status: body.status,
      assignedUserId: body.assignedUserId !== undefined ? body.assignedUserId : undefined,
      assignedGroupId: body.assignedGroupId !== undefined ? body.assignedGroupId : undefined,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      investigationNotes: body.investigationNotes,
      closureDate: body.status === "CLOSED" && !existing.closureDate ? new Date() : undefined,
    },
    include: {
      reportedBy: { select: { id: true, name: true } },
      department: { select: { id: true, name: true } },
      assignedUser: { select: { id: true, name: true } },
    },
  });

  await writeAuditLog("Incident", params.id, "UPDATE", user.id, {
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

  await prisma.incident.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
