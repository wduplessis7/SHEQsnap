import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role, LogType, LogEntryStatus, ApprovalEntityType } from "@prisma/client";
import { writeAuditLog } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const { searchParams } = new URL(req.url);

  const logType = searchParams.get("logType");
  const companyId = searchParams.get("companyId");
  const departmentId = searchParams.get("departmentId");
  const status = searchParams.get("status");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");

  const where: Record<string, unknown> = {};

  // Contractors can only see their own department's logs
  if (user.role === Role.CONTRACTOR) {
    where.departmentId = user.departmentId;
    where.uploadedById = user.id;
  } else {
    if (logType) where.logType = logType as LogType;
    if (companyId) where.companyId = companyId;
    if (departmentId) where.departmentId = departmentId;
    if (status) where.status = status as LogEntryStatus;
    if (from || to) {
      where.entryDate = {} as Record<string, Date>;
      if (from) (where.entryDate as Record<string, Date>).gte = new Date(from);
      if (to) (where.entryDate as Record<string, Date>).lte = new Date(to);
    }
  }

  const [items, total] = await Promise.all([
    prisma.logEntry.findMany({
      where,
      include: {
        company: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
        uploadedBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
        _count: { select: { attachments: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.logEntry.count({ where }),
  ]);

  return NextResponse.json({ items, total, page, limit });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const body = await req.json();

  // Determine status based on role
  const status: LogEntryStatus =
    user.role === Role.CONTRACTOR ? LogEntryStatus.PENDING_APPROVAL : LogEntryStatus.DRAFT;

  // Generate reference number
  const count = await prisma.logEntry.count();
  const referenceNo = `LOG${String(count + 1).padStart(4, "0")}`;

  const logEntry = await prisma.logEntry.create({
    data: {
      referenceNo,
      title: body.title,
      logType: body.logType as LogType,
      companyId: body.companyId || null,
      departmentId: body.departmentId || (user.role === Role.CONTRACTOR ? user.departmentId : null),
      entryDate: body.entryDate ? new Date(body.entryDate) : new Date(),
      description: body.description,
      uploadedById: user.id,
      status,
    },
    include: {
      company: { select: { id: true, name: true } },
      department: { select: { id: true, name: true } },
      uploadedBy: { select: { id: true, name: true } },
    },
  });

  // Auto-create approval request if contractor
  if (user.role === Role.CONTRACTOR && user.responsiblePersonId) {
    await prisma.approvalRequest.create({
      data: {
        entityType: ApprovalEntityType.LOG_ENTRY,
        entityId: logEntry.id,
        requestedById: user.id,
        assignedApproverId: user.responsiblePersonId,
      },
    });
  }

  await writeAuditLog("LogEntry", logEntry.id, "CREATE", user.id, {
    referenceNo,
    status,
    title: body.title,
  });

  return NextResponse.json(logEntry, { status: 201 });
}
