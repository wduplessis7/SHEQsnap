import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role, Prisma } from "@prisma/client";
import { subMonths, subWeeks, startOfWeek, endOfWeek, startOfMonth, endOfMonth, format } from "date-fns";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const departmentId = searchParams.get("departmentId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const dateFilter: any = {};
  if (from) {
    const parsed = new Date(from);
    if (isNaN(parsed.getTime())) return NextResponse.json({ error: "Invalid 'from' date" }, { status: 400 });
    dateFilter.gte = parsed;
  }
  if (to) {
    const parsed = new Date(to);
    if (isNaN(parsed.getTime())) return NextResponse.json({ error: "Invalid 'to' date" }, { status: 400 });
    dateFilter.lte = parsed;
  }

  const deptFilter = departmentId ? { departmentId } : {};

  // KPI counts
  const sessionUser = session.user as any;
  const approverRoles: Role[] = [Role.SAFETY_OFFICER, Role.MANAGER, Role.ADMIN];

  try {
    const [
      totalNearMisses,
      totalIncidents,
      openActions,
      overdueActions,
      pendingApprovals,
      totalLogEntries,
      nearMissesBySeverity,
      incidentsBySeverity,
      nearMissesByDepartment,
      actionsByStatus,
      recentOverdueActions,
    ] = await Promise.all([
      prisma.nearMiss.count({
        where: {
          ...deptFilter,
          deletedAt: null,
          ...(Object.keys(dateFilter).length ? { dateReported: dateFilter } : {}),
        },
      }),
      prisma.incident.count({
        where: {
          ...deptFilter,
          deletedAt: null,
          ...(Object.keys(dateFilter).length ? { dateOfIncident: dateFilter } : {}),
        },
      }),
      prisma.action.count({
        where: { status: { in: ["OPEN", "IN_PROGRESS"] }, deletedAt: null },
      }),
      prisma.action.count({
        where: {
          dueDate: { lt: new Date() },
          status: { notIn: ["COMPLETED", "CANCELLED"] },
          deletedAt: null,
        },
      }),
      approverRoles.includes(sessionUser.role)
        ? prisma.approvalRequest.count({
            where: { assignedApproverId: sessionUser.id, status: "PENDING" },
          })
        : Promise.resolve(0),
      prisma.logEntry.count(),
      prisma.nearMiss.groupBy({
        by: ["severityLevel"],
        _count: true,
        where: { ...deptFilter, deletedAt: null },
      }),
      prisma.incident.groupBy({
        by: ["severityLevel"],
        _count: true,
        where: { ...deptFilter, deletedAt: null },
      }),
      prisma.nearMiss.groupBy({
        by: ["departmentId"],
        _count: true,
        where: { deletedAt: null },
      }),
      prisma.action.groupBy({
        by: ["status"],
        _count: true,
        where: { deletedAt: null },
      }),
      prisma.action.findMany({
        where: {
          dueDate: { lt: new Date() },
          status: { notIn: ["COMPLETED", "CANCELLED"] },
          deletedAt: null,
        },
        include: {
          owner: { select: { name: true } },
          linkedNearMiss: { select: { referenceNo: true } },
          linkedIncident: { select: { referenceNo: true } },
        },
        orderBy: { dueDate: "asc" },
        take: 10,
      }),
    ]);

    // Department names for chart
    const departments = await prisma.department.findMany({
      select: { id: true, name: true },
    });
    const deptMap: Record<string, string> = {};
    departments.forEach((d) => (deptMap[d.id] = d.name));

    // Monthly trend (last 12 months) — 2 queries instead of 24
    const twelveMonthsAgo = startOfMonth(subMonths(new Date(), 11));
    const monthlyEnd = endOfMonth(new Date());
    const deptClause = departmentId ? Prisma.sql`AND departmentId = ${departmentId}` : Prisma.empty;

    const [nmByMonth, incByMonth] = await Promise.all([
      prisma.$queryRaw<{ month: string; count: bigint }[]>`
        SELECT strftime('%Y-%m', dateReported) as month, COUNT(*) as count
        FROM NearMiss
        WHERE dateReported >= ${twelveMonthsAgo.toISOString()}
          AND dateReported <= ${monthlyEnd.toISOString()}
          AND deletedAt IS NULL
          ${deptClause}
        GROUP BY month
      `,
      prisma.$queryRaw<{ month: string; count: bigint }[]>`
        SELECT strftime('%Y-%m', dateOfIncident) as month, COUNT(*) as count
        FROM Incident
        WHERE dateOfIncident >= ${twelveMonthsAgo.toISOString()}
          AND dateOfIncident <= ${monthlyEnd.toISOString()}
          AND deletedAt IS NULL
          ${deptClause}
        GROUP BY month
      `,
    ]);

    const nmMonthMap = new Map(nmByMonth.map((r) => [r.month, Number(r.count)]));
    const incMonthMap = new Map(incByMonth.map((r) => [r.month, Number(r.count)]));

    const monthlyTrend = [];
    for (let i = 11; i >= 0; i--) {
      const monthDate = subMonths(new Date(), i);
      const key = format(monthDate, "yyyy-MM");
      monthlyTrend.push({
        month: format(monthDate, "MMM yyyy"),
        nearMisses: nmMonthMap.get(key) ?? 0,
        incidents: incMonthMap.get(key) ?? 0,
      });
    }

    // Weekly incident trend (last 8 weeks) — 1 query instead of 8
    const eightWeeksAgo = startOfWeek(subWeeks(new Date(), 7), { weekStartsOn: 1 });
    const weeklyEnd = endOfWeek(new Date(), { weekStartsOn: 1 });

    const weeklyIncidents = await prisma.incident.findMany({
      where: {
        dateOfIncident: { gte: eightWeeksAgo, lte: weeklyEnd },
        deletedAt: null,
        ...(departmentId ? { departmentId } : {}),
      },
      select: { dateOfIncident: true },
    });

    const weeklyTrend = [];
    for (let i = 7; i >= 0; i--) {
      const weekDate = subWeeks(new Date(), i);
      const start = startOfWeek(weekDate, { weekStartsOn: 1 });
      const end = endOfWeek(weekDate, { weekStartsOn: 1 });
      const incidents = weeklyIncidents.filter(
        (inc) => inc.dateOfIncident >= start && inc.dateOfIncident <= end
      ).length;
      weeklyTrend.push({ week: format(start, "dd MMM"), incidents });
    }

    // Checklist stats
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayEnd = new Date(today)
    todayEnd.setHours(23, 59, 59, 999)

    const [checklistDueToday, checklistSubmittedToday, checklistOverdue] = await Promise.all([
      prisma.checklistAssignment.count({
        where: { dueDate: { gte: today, lte: todayEnd } }
      }),
      prisma.checklistAssignment.count({
        where: { dueDate: { gte: today, lte: todayEnd }, status: 'SUBMITTED' }
      }),
      prisma.checklistAssignment.count({
        where: { dueDate: { lt: today }, status: { not: 'SUBMITTED' } }
      }),
    ])

    // License stats
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const [expiredLicenses, expiringSoonLicenses] = await Promise.all([
      prisma.license.count({ where: { expiryDate: { lt: now } } }),
      prisma.license.count({ where: { expiryDate: { gte: now, lte: in30Days } } }),
    ]);

    // BBS stats
    const [bbsOpenObservations, bbsOverdueActions] = await Promise.all([
      prisma.behaviourObservation.count({ where: { status: "OPEN" } }),
      prisma.behaviourAction.count({
        where: {
          dueDate: { lt: now },
          status: { not: "CLOSED" },
        },
      }),
    ]);

    return NextResponse.json({
      kpis: {
        totalNearMisses,
        totalIncidents,
        openActions,
        overdueActions,
        pendingApprovals,
        totalLogEntries,
      },
      nearMissesBySeverity: nearMissesBySeverity.map((r) => ({
        severity: r.severityLevel,
        count: r._count,
      })),
      incidentsBySeverity: incidentsBySeverity.map((r) => ({
        severity: r.severityLevel,
        count: r._count,
      })),
      nearMissesByDepartment: nearMissesByDepartment.map((r) => ({
        department: r.departmentId ? deptMap[r.departmentId] || "Unknown" : "Unassigned",
        count: r._count,
      })),
      actionsByStatus: actionsByStatus.map((r) => ({
        status: r.status,
        count: r._count,
      })),
      monthlyTrend,
      weeklyTrend,
      recentOverdueActions,
      checklistStats: {
        dueToday: checklistDueToday,
        submittedToday: checklistSubmittedToday,
        overdue: checklistOverdue,
        completionRateToday: checklistDueToday > 0 ? Math.round((checklistSubmittedToday / checklistDueToday) * 100) : 0,
      },
      expiringLicenses: expiredLicenses + expiringSoonLicenses,
      openObservations: bbsOpenObservations,
      overdueObservationActions: bbsOverdueActions,
    });
  } catch (err) {
    console.error("[dashboard/stats GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
