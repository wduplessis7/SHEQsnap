import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/utils";
import { Role } from "@prisma/client";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const item = await prisma.action.findUnique({
    where: { id: params.id },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      assignedGroup: { select: { id: true, name: true } },
      linkedNearMiss: { select: { id: true, referenceNo: true, description: true } },
      linkedIncident: { select: { id: true, referenceNo: true, description: true } },
      attachments: { include: { uploadedBy: { select: { name: true } } } },
      comments: {
        include: { author: { select: { id: true, name: true } } },
        orderBy: { createdAt: "asc" as const },
      },
    },
  });

  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const auditLogs = await prisma.auditLog.findMany({
    where: { entityType: "Action", entityId: params.id },
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

  const existing = await prisma.action.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (
    (existing.status === "COMPLETED" || existing.status === "CANCELLED") &&
    user.role !== Role.ADMIN
  ) {
    return NextResponse.json({ error: "Action is closed" }, { status: 403 });
  }

  // If owner is being reassigned, sync departmentId to the new owner's department
  let departmentId: string | null | undefined = undefined;
  if (body.ownerId && body.ownerId !== existing.ownerId) {
    const newOwner = await prisma.user.findUnique({ where: { id: body.ownerId }, select: { departmentId: true } });
    departmentId = newOwner?.departmentId ?? null;
  }

  const updated = await prisma.action.update({
    where: { id: params.id },
    data: {
      description: body.description,
      ownerId: body.ownerId,
      ...(departmentId !== undefined ? { departmentId } : {}),
      assignedGroupId: body.assignedGroupId !== undefined ? body.assignedGroupId : undefined,
      priority: body.priority,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      status: body.status,
      completionNotes: body.completionNotes,
      dateCompleted:
        body.status === "COMPLETED" && !existing.dateCompleted ? new Date() : undefined,
      escalationFlag: body.escalationFlag !== undefined ? body.escalationFlag : undefined,
    },
    include: {
      owner: { select: { id: true, name: true } },
      linkedNearMiss: { select: { id: true, referenceNo: true } },
      linkedIncident: { select: { id: true, referenceNo: true } },
    },
  });

  await writeAuditLog("Action", params.id, "UPDATE", user.id, {
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

  await prisma.action.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
