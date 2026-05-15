import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { subMonths, startOfMonth, endOfMonth, format } from "date-fns";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const departmentId = searchParams.get("departmentId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const dateFilter: any = {};
  if (from) dateFilter.gte = new Date(from);
  if (to) dateFilter.lte = new Date(to);

  const deptFilter = departmentId ? { departmentId } : {};

  // KPI counts
  const sessionUser = session.user as any;
  const approverRoles: Role[] = [Role.SAFETY_OFFICER, Role.MANAGER, Role.ADMIN];

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
        ...(Object.keys(dateFilter).length ? { dateReported: dateFilter } : {}),
      },
    }),
    prisma.incident.count({
      where: {
        ...deptFilter,
        ...(Object.keys(dateFilter).length ? { dateOfIncident: dateFilter } : {}),
      },
    }),
    prisma.action.count({
      where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
    }),
    prisma.action.count({
      where: {
        dueDate: { lt: new Date() },
        status: { notIn: ["COMPLETED", "CANCELLED"] },
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
      where: deptFilter,
    }),
    prisma.incident.groupBy({
      by: ["severityLevel"],
      _count: true,
      where: deptFilter,
    }),
    prisma.nearMiss.groupBy({
      by: ["departmentId"],
      _count: true,
    }),
    prisma.action.groupBy({
      by: ["status"],
      _count: true,
    }),
    prisma.action.findMany({
      where: {
        dueDate: { lt: new Date() },
        status: { notIn: ["COMPLETED", "CANCELLED"] },
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

  // Monthly trend (last 12 months)
  const monthlyTrend = [];
  for (let i = 11; i >= 0; i--) {
    const monthDate = subMonths(new Date(), i);
    const start = startOfMonth(monthDate);
    const end = endOfMonth(monthDate);

    const [nm, inc] = await Promise.all([
      prisma.nearMiss.count({
        where: {
          dateReported: { gte: start, lte: end },
          ...(departmentId ? { departmentId } : {}),
        },
      }),
      prisma.incident.count({
        where: {
          dateOfIncident: { gte: start, lte: end },
          ...(departmentId ? { departmentId } : {}),
        },
      }),
    ]);

    monthlyTrend.push({
      month: format(monthDate, "MMM yyyy"),
      nearMisses: nm,
      incidents: inc,
    });
  }

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
    recentOverdueActions,
  });
}
