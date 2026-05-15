import { prisma } from '@/lib/prisma'
import { ChecklistRecurrence } from '@prisma/client'

export async function generateAssignmentsForSchedule(scheduleId: string) {
  const schedule = await prisma.checklistSchedule.findUnique({
    where: { id: scheduleId },
    include: {
      assignedToGroup: {
        include: { members: { select: { userId: true } } },
      },
    },
  })

  if (!schedule || !schedule.isActive) return 0

  // Collect user IDs to assign to
  const userIds: string[] = []
  if (schedule.assignedToUserId) {
    userIds.push(schedule.assignedToUserId)
  } else if (schedule.assignedToGroup) {
    schedule.assignedToGroup.members.forEach((m) => userIds.push(m.userId))
  }

  if (userIds.length === 0) return 0

  // Build list of due dates to generate
  const dueDates: Date[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const startDate = new Date(schedule.startDate)
  startDate.setHours(0, 0, 0, 0)
  const windowStart = startDate > today ? startDate : today
  const windowEnd = new Date(windowStart)
  windowEnd.setDate(windowEnd.getDate() + 30)
  const endDate = schedule.endDate ? new Date(schedule.endDate) : null

  if (schedule.recurrence === ChecklistRecurrence.ONCE) {
    dueDates.push(new Date(schedule.startDate))
  } else {
    const cursor = new Date(windowStart)
    while (cursor <= windowEnd) {
      if (endDate && cursor > endDate) break
      let include = false
      if (schedule.recurrence === ChecklistRecurrence.DAILY) {
        include = true
      } else if (schedule.recurrence === ChecklistRecurrence.WEEKLY) {
        include = schedule.weekDay !== null && cursor.getDay() === schedule.weekDay
      } else if (schedule.recurrence === ChecklistRecurrence.MONTHLY) {
        include = schedule.monthDay !== null && cursor.getDate() === schedule.monthDay
      }
      if (include) dueDates.push(new Date(cursor))
      cursor.setDate(cursor.getDate() + 1)
    }
  }

  if (dueDates.length === 0) return 0

  // Check for existing assignments to avoid duplicates
  const existing = await prisma.checklistAssignment.findMany({
    where: {
      scheduleId,
      assignedToUserId: { in: userIds },
      dueDate: { in: dueDates },
    },
    select: { assignedToUserId: true, dueDate: true },
  })
  const existingSet = new Set(
    existing.map((e) => `${e.assignedToUserId}_${e.dueDate.toISOString().split('T')[0]}`)
  )

  const toCreate = []
  for (const userId of userIds) {
    for (const dueDate of dueDates) {
      const key = `${userId}_${dueDate.toISOString().split('T')[0]}`
      if (!existingSet.has(key)) {
        toCreate.push({
          scheduleId,
          templateId: schedule.templateId,
          assignedToUserId: userId,
          dueDate,
        })
      }
    }
  }

  if (toCreate.length === 0) return 0

  await prisma.checklistAssignment.createMany({ data: toCreate })
  return toCreate.length
}
