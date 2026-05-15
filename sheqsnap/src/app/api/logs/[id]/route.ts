import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role, LogEntryStatus, LogType } from "@prisma/client";
import { writeAuditLog } from "@/lib/utils";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;

  const logEntry = await prisma.logEntry.findUnique({
    where: { id: params.id },
    include: {
      company: { select: { id: true, name: true } },
      department: { select: { id: true, name: true } },
      uploadedBy: { select: { id: true, name: true, email: true } },
      approvedBy: { select: { id: true, name: true } },
      attachments: {
        include: { uploadedBy: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!logEntry) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Contractors can only see their own entries
  if (user.role === Role.CONTRACTOR && logEntry.uploadedById !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Fetch audit logs for this entry
  const auditLogs = await prisma.auditLog.findMany({
    where: { entityType: "LogEntry", entityId: params.id },
    include: { changedBy: { select: { id: true, name: true } } },
    orderBy: { timestamp: "desc" },
  });

  // Fetch approval requests for this entry
  const approvalRequests = await prisma.approvalRequest.findMany({
    where: { entityType: "LOG_ENTRY", entityId: params.id },
    include: {
      requestedBy: { select: { id: true, name: true } },
      assignedApprover: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ ...logEntry, auditLogs, approvalRequests });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const body = await req.json();

  const existing = await prisma.logEntry.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Contractors can only edit their own entries
  if (user.role === Role.CONTRACTOR && existing.uploadedById !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const allowedRoles: Role[] = [Role.SAFETY_OFFICER, Role.MANAGER, Role.ADMIN];
  const canApprove = allowedRoles.includes(user.role);

  const updateData: Record<string, unknown> = {
    title: body.title ?? existing.title,
    logType: (body.logType as LogType) ?? existing.logType,
    companyId: body.companyId ?? existing.companyId,
    departmentId: body.departmentId ?? existing.departmentId,
    entryDate: body.entryDate ? new Date(body.entryDate) : existing.entryDate,
    description: body.description ?? existing.description,
  };

  // Only approvers can change status
  if (canApprove && body.status) {
    updateData.status = body.status as LogEntryStatus;
    if (body.status === LogEntryStatus.ACTIVE) {
      updateData.approvedById = user.id;
      updateData.approvedAt = new Date();
    }
  }

  const updated = await prisma.logEntry.update({
    where: { id: params.id },
    data: updateData,
    include: {
      company: { select: { id: true, name: true } },
      department: { select: { id: true, name: true } },
      uploadedBy: { select: { id: true, name: true } },
      approvedBy: { select: { id: true, name: true } },
    },
  });

  await writeAuditLog("LogEntry", params.id, "UPDATE", user.id, {
    previous: { status: existing.status },
    updated: { status: updated.status },
  });

  return NextResponse.json(updated);
}
