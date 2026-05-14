import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateReferenceNo, writeAuditLog } from "@/lib/utils";
import { NearMissStatus, SeverityLevel } from "@prisma/client";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const severity = searchParams.get("severity");
  const departmentId = searchParams.get("departmentId");
  const assignedUserId = searchParams.get("assignedUserId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const search = searchParams.get("search");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");

  const where: any = {};
  if (status) where.status = status as NearMissStatus;
  if (severity) where.severityLevel = severity as SeverityLevel;
  if (departmentId) where.departmentId = departmentId;
  if (assignedUserId) where.assignedUserId = assignedUserId;
  if (from || to) {
    where.dateReported = {};
    if (from) where.dateReported.gte = new Date(from);
    if (to) where.dateReported.lte = new Date(to);
  }
  if (search) {
    where.OR = [
      { referenceNo: { contains: search } },
      { description: { contains: search } },
      { location: { contains: search } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.nearMiss.findMany({
      where,
      include: {
        reportedBy: { select: { id: true, name: true, email: true } },
        department: { select: { id: true, name: true } },
        assignedUser: { select: { id: true, name: true } },
        assignedGroup: { select: { id: true, name: true } },
        _count: { select: { actions: true, attachments: true, comments: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.nearMiss.count({ where }),
  ]);

  return NextResponse.json({ items, total, page, limit });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const body = await req.json();

  const referenceNo = await generateReferenceNo("NM", "nearMiss");

  const nearMiss = await prisma.nearMiss.create({
    data: {
      referenceNo,
      dateReported: body.dateReported ? new Date(body.dateReported) : new Date(),
      reportedById: user.id,
      departmentId: body.departmentId || null,
      location: body.location,
      description: body.description,
      riskCategory: body.riskCategory,
      severityLevel: body.severityLevel || "LOW",
      immediateAction: body.immediateAction || null,
      status: "NEW",
      assignedUserId: body.assignedUserId || null,
      assignedGroupId: body.assignedGroupId || null,
      targetCloseDate: body.targetCloseDate ? new Date(body.targetCloseDate) : null,
    },
    include: {
      reportedBy: { select: { id: true, name: true } },
      department: { select: { id: true, name: true } },
    },
  });

  await writeAuditLog("NearMiss", nearMiss.id, "CREATE", user.id, { referenceNo, status: "NEW" });

  return NextResponse.json(nearMiss, { status: 201 });
}
