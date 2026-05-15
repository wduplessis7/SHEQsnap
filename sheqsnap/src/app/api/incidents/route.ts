import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateReferenceNo, writeAuditLog } from "@/lib/utils";
import { IncidentStatus, SeverityLevel, Role, ApprovalEntityType } from "@prisma/client";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const severity = searchParams.get("severity");
  const departmentId = searchParams.get("departmentId");
  const incidentType = searchParams.get("incidentType");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const search = searchParams.get("search");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");

  const where: any = {};
  if (status) where.status = status as IncidentStatus;
  if (severity) where.severityLevel = severity as SeverityLevel;
  if (departmentId) where.departmentId = departmentId;
  if (incidentType) where.incidentType = incidentType;
  if (from || to) {
    where.dateOfIncident = {};
    if (from) where.dateOfIncident.gte = new Date(from);
    if (to) where.dateOfIncident.lte = new Date(to);
  }
  if (search) {
    where.OR = [
      { referenceNo: { contains: search } },
      { description: { contains: search } },
      { location: { contains: search } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.incident.findMany({
      where,
      include: {
        reportedBy: { select: { id: true, name: true, email: true } },
        department: { select: { id: true, name: true } },
        assignedUser: { select: { id: true, name: true } },
        assignedGroup: { select: { id: true, name: true } },
        _count: { select: { actions: true, attachments: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.incident.count({ where }),
  ]);

  return NextResponse.json({ items, total, page, limit });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const body = await req.json();

  const referenceNo = await generateReferenceNo("INC", "incident");

  const isContractor = user.role === Role.CONTRACTOR;
  const status: IncidentStatus = isContractor
    ? IncidentStatus.PENDING_APPROVAL
    : IncidentStatus.NEW;

  const incident = await prisma.incident.create({
    data: {
      referenceNo,
      dateOfIncident: new Date(body.dateOfIncident),
      dateReported: body.dateReported ? new Date(body.dateReported) : new Date(),
      reportedById: user.id,
      departmentId: isContractor ? user.departmentId : (body.departmentId || null),
      location: body.location,
      incidentType: body.incidentType,
      description: body.description,
      personsInvolved: body.personsInvolved || null,
      injuryType: body.injuryType || null,
      severityLevel: body.severityLevel || "LOW",
      rootCause: body.rootCause || null,
      immediateAction: body.immediateAction || null,
      status,
      assignedUserId: isContractor ? null : (body.assignedUserId || null),
      assignedGroupId: isContractor ? null : (body.assignedGroupId || null),
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      investigationNotes: body.investigationNotes || null,
    },
    include: {
      reportedBy: { select: { id: true, name: true } },
      department: { select: { id: true, name: true } },
    },
  });

  // Auto-create approval request for contractors
  if (isContractor && user.responsiblePersonId) {
    await prisma.approvalRequest.create({
      data: {
        entityType: ApprovalEntityType.INCIDENT,
        entityId: incident.id,
        requestedById: user.id,
        assignedApproverId: user.responsiblePersonId,
      },
    });
  }

  await writeAuditLog("Incident", incident.id, "CREATE", user.id, {
    referenceNo,
    status,
  });

  return NextResponse.json(incident, { status: 201 });
}
