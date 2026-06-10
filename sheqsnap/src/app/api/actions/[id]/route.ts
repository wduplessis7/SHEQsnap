import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/utils";
import { Role } from "@prisma/client";

function computeDueDate(actionClass: string, rawDueDate?: string | null): Date | null {
  const now = new Date();
  const endOfDay = (d: Date) => { d.setHours(23, 59, 59, 999); return d; };
  if (actionClass === "A") return endOfDay(new Date(now));
  if (actionClass === "B") { const d = new Date(now); d.setDate(d.getDate() + 3); return endOfDay(d); }
  if (actionClass === "C") { const d = new Date(now); d.setDate(d.getDate() + 7); return endOfDay(d); }
  return rawDueDate ? new Date(rawDueDate) : null;
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const item = await prisma.action.findFirst({
      where: { id: params.id, deletedAt: null },
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
  } catch (err) {
    console.error("[actions/[id] GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const body = await req.json();

  try {
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

    const actionClass: string | undefined = body.actionClass;
    const dueDate = actionClass !== undefined
      ? computeDueDate(actionClass, body.dueDate)
      : body.dueDate !== undefined ? (body.dueDate ? new Date(body.dueDate) : null) : undefined;

    const updated = await prisma.action.update({
      where: { id: params.id },
      data: {
        description: body.description,
        ownerId: body.ownerId,
        ...(departmentId !== undefined ? { departmentId } : {}),
        assignedGroupId: body.assignedGroupId !== undefined ? body.assignedGroupId : undefined,
        priority: body.priority,
        ...(actionClass !== undefined ? { actionClass } : {}),
        ...(dueDate !== undefined ? { dueDate } : {}),
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
  } catch (err) {
    console.error("[actions/[id] PUT]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  if (user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  try {
    const deletedAt = new Date();
    await prisma.action.update({ where: { id: params.id }, data: { deletedAt } });
    await writeAuditLog("Action", params.id, "DELETE", user.id, { deletedAt: deletedAt.toISOString() });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[actions/[id] DELETE]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
