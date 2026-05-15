import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/utils";
import { ChecklistRecurrence } from "@prisma/client";

async function generateAssignmentsForSchedule(scheduleId: string) {
  const schedule = await prisma.checklistSchedule.findUnique({
    where: { id: scheduleId },
    include: {
      assignedToGroup: {
        include: { members: { select: { userId: true } } },
      },
    },
  });

  if (!schedule) return;

  // Resolve user IDs
  const userIds: string[] = [];
  if (schedule.assignedToUserId) {
    userIds.push(schedule.assignedToUserId);
  } else if (schedule.assignedToGroup) {
    for (const member of schedule.assignedToGroup.members) {
      userIds.push(member.userId);
    }
  }

  if (userIds.length === 0) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startDate = new Date(schedule.startDate);
  startDate.setHours(0, 0, 0, 0);

  const endDate = schedule.endDate ? new Date(schedule.endDate) : null;
  if (endDate) endDate.setHours(23, 59, 59, 999);

  const baseDate = startDate > today ? startDate : today;

  const assignmentsToCreate: {
    scheduleId: string;
    templateId: string;
    assignedToUserId: string;
    dueDate: Date;
    status: "PENDING";
  }[] = [];

  if (schedule.recurrence === ChecklistRecurrence.ONCE) {
    for (const userId of userIds) {
      const existing = await prisma.checklistAssignment.findFirst({
        where: {
          scheduleId,
          assignedToUserId: userId,
          dueDate: schedule.startDate,
        },
      });
      if (!existing) {
        assignmentsToCreate.push({
          scheduleId,
          templateId: schedule.templateId,
          assignedToUserId: userId,
          dueDate: new Date(schedule.startDate),
          status: "PENDING",
        });
      }
    }
  } else {
    // Generate rolling 30 days
    const windowEnd = new Date(baseDate);
    windowEnd.setDate(windowEnd.getDate() + 30);
    if (endDate && endDate < windowEnd) windowEnd.setTime(endDate.getTime());

    const current = new Date(baseDate);
    while (current <= windowEnd) {
      let matches = false;

      if (schedule.recurrence === ChecklistRecurrence.DAILY) {
        matches = true;
      } else if (schedule.recurrence === ChecklistRecurrence.WEEKLY) {
        matches = schedule.weekDay !== null && schedule.weekDay !== undefined
          ? current.getDay() === schedule.weekDay
          : false;
      } else if (schedule.recurrence === ChecklistRecurrence.MONTHLY) {
        matches = schedule.monthDay !== null && schedule.monthDay !== undefined
          ? current.getDate() === schedule.monthDay
          : false;
      }

      if (matches) {
        const dueDateSnapshot = new Date(current);
        for (const userId of userIds) {
          const existing = await prisma.checklistAssignment.findFirst({
            where: {
              scheduleId,
              assignedToUserId: userId,
              dueDate: dueDateSnapshot,
            },
          });
          if (!existing) {
            assignmentsToCreate.push({
              scheduleId,
              templateId: schedule.templateId,
              assignedToUserId: userId,
              dueDate: dueDateSnapshot,
              status: "PENDING",
            });
          }
        }
      }

      current.setDate(current.getDate() + 1);
    }
  }

  if (assignmentsToCreate.length > 0) {
    await prisma.checklistAssignment.createMany({ data: assignmentsToCreate });
  }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const canManage = ["SAFETY_OFFICER", "MANAGER", "ADMIN"].includes(user.role);
  if (!canManage) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const isActive = searchParams.get("isActive");
  const templateId = searchParams.get("templateId");

  const where: any = {};
  if (isActive !== null && isActive !== undefined) {
    where.isActive = isActive === "true";
  }
  if (templateId) where.templateId = templateId;

  const items = await prisma.checklistSchedule.findMany({
    where,
    include: {
      template: { select: { id: true, title: true, category: true } },
      assignedToUser: { select: { id: true, name: true, email: true } },
      assignedToGroup: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
      _count: { select: { assignments: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ items, total: items.length });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const canManage = ["SAFETY_OFFICER", "MANAGER", "ADMIN"].includes(user.role);
  if (!canManage) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const {
    templateId,
    assignedToUserId,
    assignedToGroupId,
    startDate,
    dueTime,
    recurrence,
    weekDay,
    monthDay,
    endDate,
  } = body;

  if (!templateId) return NextResponse.json({ error: "templateId is required" }, { status: 400 });
  if (!startDate) return NextResponse.json({ error: "startDate is required" }, { status: 400 });
  if (!recurrence) return NextResponse.json({ error: "recurrence is required" }, { status: 400 });

  const schedule = await prisma.checklistSchedule.create({
    data: {
      templateId,
      assignedToUserId: assignedToUserId || null,
      assignedToGroupId: assignedToGroupId || null,
      startDate: new Date(startDate),
      dueTime: dueTime || "17:00",
      recurrence: recurrence as ChecklistRecurrence,
      weekDay: weekDay !== undefined ? weekDay : null,
      monthDay: monthDay !== undefined ? monthDay : null,
      endDate: endDate ? new Date(endDate) : null,
      createdById: user.id,
    },
    include: {
      template: { select: { id: true, title: true } },
      assignedToUser: { select: { id: true, name: true } },
      assignedToGroup: { select: { id: true, name: true } },
    },
  });

  await generateAssignmentsForSchedule(schedule.id);

  await writeAuditLog("ChecklistSchedule", schedule.id, "CREATE", user.id, {
    templateId,
    recurrence,
    startDate,
  });

  return NextResponse.json(schedule, { status: 201 });
}
