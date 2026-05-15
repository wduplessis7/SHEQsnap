import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ChecklistAssignmentStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const canManage = ["MANAGER", "ADMIN"].includes(user.role);
  if (!canManage) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const scheduleId = searchParams.get("scheduleId");
  const userId = searchParams.get("userId");
  const departmentId = searchParams.get("departmentId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const status = searchParams.get("status");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");

  const where: any = {};

  if (scheduleId) where.scheduleId = scheduleId;
  if (userId) where.assignedToUserId = userId;
  if (status) where.status = status as ChecklistAssignmentStatus;
  if (from || to) {
    where.dueDate = {};
    if (from) where.dueDate.gte = new Date(from);
    if (to) where.dueDate.lte = new Date(to);
  }
  if (departmentId) {
    where.assignedToUser = { departmentId };
  }

  const [items, total] = await Promise.all([
    prisma.checklistAssignment.findMany({
      where,
      include: {
        assignedToUser: { select: { id: true, name: true, email: true } },
        template: { select: { id: true, title: true, category: true } },
        schedule: { select: { id: true, recurrence: true } },
        submission: { select: { id: true, submittedAt: true, notes: true } },
      },
      orderBy: { dueDate: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.checklistAssignment.count({ where }),
  ]);

  return NextResponse.json({ items, total, page, limit });
}
