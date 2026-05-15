import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendChecklistReminder } from "@/lib/email";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // Today boundaries
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  // Tomorrow boundaries
  const tomorrowStart = new Date(now);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  tomorrowStart.setHours(0, 0, 0, 0);
  const tomorrowEnd = new Date(now);
  tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);
  tomorrowEnd.setHours(23, 59, 59, 999);

  let sent = 0;
  const errors: string[] = [];

  // Day-before pass: due tomorrow, not submitted, reminder not yet sent
  const dayBeforeAssignments = await prisma.checklistAssignment.findMany({
    where: {
      dueDate: { gte: tomorrowStart, lte: tomorrowEnd },
      status: { not: "SUBMITTED" },
      reminderSentDayBefore: false,
    },
    include: {
      assignedToUser: { select: { id: true, name: true, email: true } },
      template: { select: { id: true, title: true, category: true } },
    },
  });

  for (const assignment of dayBeforeAssignments) {
    try {
      await sendChecklistReminder(assignment, assignment.assignedToUser, assignment.template, "day-before");
      await prisma.checklistAssignment.update({
        where: { id: assignment.id },
        data: { reminderSentDayBefore: true },
      });
      sent++;
    } catch (err: any) {
      errors.push(`day-before assignment ${assignment.id}: ${err?.message || String(err)}`);
    }
  }

  // Day-of pass: due today, not submitted, reminder not yet sent
  const dayOfAssignments = await prisma.checklistAssignment.findMany({
    where: {
      dueDate: { gte: todayStart, lte: todayEnd },
      status: { not: "SUBMITTED" },
      reminderSentDayOf: false,
    },
    include: {
      assignedToUser: { select: { id: true, name: true, email: true } },
      template: { select: { id: true, title: true, category: true } },
    },
  });

  for (const assignment of dayOfAssignments) {
    try {
      await sendChecklistReminder(assignment, assignment.assignedToUser, assignment.template, "day-of");
      await prisma.checklistAssignment.update({
        where: { id: assignment.id },
        data: { reminderSentDayOf: true },
      });
      sent++;
    } catch (err: any) {
      errors.push(`day-of assignment ${assignment.id}: ${err?.message || String(err)}`);
    }
  }

  return NextResponse.json({ sent, errors });
}
