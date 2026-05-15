import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ChecklistAssignmentStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const isAdmin = user.role === "ADMIN";
  const isManager = ["MANAGER", "ADMIN"].includes(user.role);

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const userIdParam = searchParams.get("userId");

  const where: any = {};

  // Admin/Manager can filter by userId, otherwise scope to current user
  if (isManager && userIdParam) {
    where.assignedToUserId = userIdParam;
  } else if (!isManager) {
    where.assignedToUserId = user.id;
  }

  if (status) where.status = status as ChecklistAssignmentStatus;
  if (from || to) {
    where.dueDate = {};
    if (from) where.dueDate.gte = new Date(from);
    if (to) where.dueDate.lte = new Date(to);
  }

  const [items, total] = await Promise.all([
    prisma.checklistAssignment.findMany({
      where,
      include: {
        template: { select: { id: true, title: true, category: true } },
        assignedToUser: { select: { id: true, name: true, email: true } },
        schedule: { select: { id: true, recurrence: true } },
      },
      orderBy: { dueDate: "asc" },
    }),
    prisma.checklistAssignment.count({ where }),
  ]);

  return NextResponse.json({ items, total });
}
