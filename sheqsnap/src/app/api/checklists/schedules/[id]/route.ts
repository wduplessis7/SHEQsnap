import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/utils";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const canManage = ["SAFETY_OFFICER", "MANAGER", "ADMIN"].includes(user.role);
  if (!canManage) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const schedule = await prisma.checklistSchedule.findUnique({
    where: { id: params.id },
    include: {
      template: { select: { id: true, title: true, category: true } },
      assignedToUser: { select: { id: true, name: true, email: true } },
      assignedToGroup: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
      assignments: {
        include: {
          assignedToUser: { select: { id: true, name: true, email: true } },
        },
        orderBy: { dueDate: "asc" },
        select: {
          id: true,
          dueDate: true,
          status: true,
          submittedAt: true,
          assignedToUser: true,
        },
      },
    },
  });

  if (!schedule) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(schedule);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const canManage = ["SAFETY_OFFICER", "MANAGER", "ADMIN"].includes(user.role);
  if (!canManage) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const existing = await prisma.checklistSchedule.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { isActive, dueTime, endDate } = body;

  const schedule = await prisma.checklistSchedule.update({
    where: { id: params.id },
    data: {
      ...(isActive !== undefined && { isActive }),
      ...(dueTime !== undefined && { dueTime }),
      ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
    },
  });

  await writeAuditLog("ChecklistSchedule", params.id, "UPDATE", user.id, { isActive, dueTime, endDate });

  return NextResponse.json(schedule);
}
