import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateReferenceNo, writeAuditLog } from "@/lib/utils";
import { ActionStatus, ActionPriority, LinkedType } from "@prisma/client";

function computeDueDate(actionClass: string, rawDueDate?: string | null): Date | null {
  const now = new Date();
  const endOfDay = (d: Date) => { d.setHours(23, 59, 59, 999); return d; };
  if (actionClass === "A") return endOfDay(new Date(now));
  if (actionClass === "B") { const d = new Date(now); d.setDate(d.getDate() + 3); return endOfDay(d); }
  if (actionClass === "C") { const d = new Date(now); d.setDate(d.getDate() + 7); return endOfDay(d); }
  return rawDueDate ? new Date(rawDueDate) : null;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const priority = searchParams.get("priority");
  const ownerId = searchParams.get("ownerId");
  const linkedType = searchParams.get("linkedType");
  const overdue = searchParams.get("overdue");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const search = searchParams.get("search");

  const departmentId = searchParams.get("departmentId");

  const where: any = { deletedAt: null };
  if (status) where.status = status as ActionStatus;
  if (priority) where.priority = priority as ActionPriority;
  if (ownerId) where.ownerId = ownerId;
  if (departmentId) where.departmentId = departmentId;
  if (linkedType) where.linkedType = linkedType as LinkedType;
  if (overdue === "true") {
    where.dueDate = { lt: new Date() };
    where.status = { notIn: ["COMPLETED", "CANCELLED"] };
  }
  if (search) {
    where.OR = [
      { referenceNo: { contains: search } },
      { description: { contains: search } },
    ];
  }

  try {
    const [items, total] = await Promise.all([
      prisma.action.findMany({
        where,
        include: {
          owner: { select: { id: true, name: true } },
          assignedGroup: { select: { id: true, name: true } },
          linkedNearMiss: { select: { id: true, referenceNo: true } },
          linkedIncident: { select: { id: true, referenceNo: true } },
          _count: { select: { attachments: true, comments: true } },
        },
        orderBy: [{ escalationFlag: "desc" }, { dueDate: "asc" }, { createdAt: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.action.count({ where }),
    ]);

    return NextResponse.json({ items, total, page, limit });
  } catch (err) {
    console.error("[actions GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const body = await req.json();

  try {
    const referenceNo = await generateReferenceNo("ACT", "action");

    const ownerId = body.ownerId || user.id;
    const owner = await prisma.user.findUnique({ where: { id: ownerId }, select: { departmentId: true } });
    if (body.ownerId && !owner) {
      return NextResponse.json({ error: "Assigned user not found" }, { status: 404 });
    }
    const departmentId = owner?.departmentId || user.departmentId || null;

    const actionClass: string = body.actionClass || "NORMAL";
    const dueDate = computeDueDate(actionClass, body.dueDate);

    const action = await prisma.action.create({
      data: {
        referenceNo,
        linkedType: body.linkedType || "OTHER",
        nearMissId: body.nearMissId || null,
        incidentId: body.incidentId || null,
        description: body.description,
        ownerId,
        departmentId,
        assignedGroupId: body.assignedGroupId || null,
        priority: body.priority || "MEDIUM",
        actionClass,
        dueDate,
        status: "OPEN",
        escalationFlag: body.escalationFlag || false,
      },
      include: {
        owner: { select: { id: true, name: true } },
        linkedNearMiss: { select: { id: true, referenceNo: true } },
        linkedIncident: { select: { id: true, referenceNo: true } },
      },
    });

    await writeAuditLog("Action", action.id, "CREATE", user.id, {
      referenceNo,
      status: "OPEN",
    });

    return NextResponse.json(action, { status: 201 });
  } catch (err) {
    console.error("[actions POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
