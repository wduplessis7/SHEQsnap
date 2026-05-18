import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { subWeeks, startOfWeek, endOfWeek, subMonths, startOfMonth, endOfMonth, format } from "date-fns";

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const notDeleted = { NOT: { status: "DELETED" } };

  const [
    totalObservations,
    openObservations,
    closedObservations,
    byRiskLevelRaw,
    bySafetyCategoryRaw,
    byLocationRaw,
    byWorkTypeRaw,
    actionsOverdue,
    actionsByStatusRaw,
    allObservations,
  ] = await Promise.all([
    prisma.behaviourObservation.count({ where: notDeleted }),
    prisma.behaviourObservation.count({ where: { ...notDeleted, status: "OPEN" } }),
    prisma.behaviourObservation.count({ where: { ...notDeleted, status: "CLOSED" } }),
    prisma.behaviourObservation.groupBy({ by: ["riskLevel"], _count: true, where: notDeleted }),
    prisma.behaviourObservation.groupBy({ by: ["safetyCategory"], _count: true, where: notDeleted }),
    prisma.behaviourObservation.groupBy({ by: ["location"], _count: true, where: notDeleted }),
    prisma.behaviourObservation.groupBy({ by: ["workType"], _count: true, where: notDeleted }),
    prisma.behaviourAction.count({
      where: {
        dueDate: { lt: new Date() },
        status: { not: "CLOSED" },
      },
    }),
    prisma.behaviourAction.groupBy({ by: ["status"], _count: true }),
    prisma.behaviourObservation.findMany({
      where: notDeleted,
      select: { unsafeBehaviours: true },
    }),
  ]);

  // Build risk level map
  const riskMap: Record<string, number> = { LOW: 0, MEDIUM: 0, HIGH: 0 };
  for (const r of byRiskLevelRaw) {
    if (r.riskLevel) riskMap[r.riskLevel] = (riskMap[r.riskLevel] || 0) + (r._count as number);
  }

  // Safety category
  const bySafetyCategory = bySafetyCategoryRaw.map((r) => ({
    category: r.safetyCategory || "Uncategorised",
    count: r._count as number,
  }));

  // By location
  const byLocation = byLocationRaw.map((r) => ({
    location: r.location,
    count: r._count as number,
  })).sort((a, b) => b.count - a.count);

  // By work type
  const byWorkType = byWorkTypeRaw.map((r) => ({
    type: r.workType || "Unknown",
    count: r._count as number,
  }));

  // Actions by status
  const aStatusMap: Record<string, number> = { OPEN: 0, IN_PROGRESS: 0, CLOSED: 0 };
  for (const r of actionsByStatusRaw) {
    aStatusMap[r.status] = (aStatusMap[r.status] || 0) + (r._count as number);
  }

  // Top 5 unsafe behaviours
  const behaviourCounts: Record<string, number> = {};
  for (const obs of allObservations) {
    if (obs.unsafeBehaviours) {
      try {
        const arr: string[] = JSON.parse(obs.unsafeBehaviours);
        for (const b of arr) {
          behaviourCounts[b] = (behaviourCounts[b] || 0) + 1;
        }
      } catch {
        // ignore parse errors
      }
    }
  }
  const topUnsafeBehaviours = Object.entries(behaviourCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([behaviour, count]) => ({ behaviour, count }));

  // Trend last 12 weeks: safe vs unsafe counts
  const trendLast12Weeks: Array<{ week: string; safeCount: number; unsafeCount: number }> = [];
  for (let i = 11; i >= 0; i--) {
    const weekDate = subWeeks(new Date(), i);
    const start = startOfWeek(weekDate, { weekStartsOn: 1 });
    const end = endOfWeek(weekDate, { weekStartsOn: 1 });

    const [weekObs] = await Promise.all([
      prisma.behaviourObservation.findMany({
        where: {
          ...notDeleted,
          observationDate: { gte: start, lte: end },
        },
        select: { safeBehaviours: true, unsafeBehaviours: true },
      }),
    ]);

    let safeCount = 0;
    let unsafeCount = 0;
    for (const obs of weekObs) {
      try {
        if (obs.safeBehaviours) safeCount += (JSON.parse(obs.safeBehaviours) as string[]).length;
      } catch { /* ignore */ }
      try {
        if (obs.unsafeBehaviours) unsafeCount += (JSON.parse(obs.unsafeBehaviours) as string[]).length;
      } catch { /* ignore */ }
    }

    trendLast12Weeks.push({
      week: format(start, "dd MMM"),
      safeCount,
      unsafeCount,
    });
  }

  // Observations by month (last 6 months)
  const observationsByMonth: Array<{ month: string; count: number }> = [];
  for (let i = 5; i >= 0; i--) {
    const monthDate = subMonths(new Date(), i);
    const start = startOfMonth(monthDate);
    const end = endOfMonth(monthDate);
    const count = await prisma.behaviourObservation.count({
      where: {
        ...notDeleted,
        observationDate: { gte: start, lte: end },
      },
    });
    observationsByMonth.push({ month: format(monthDate, "MMM yyyy"), count });
  }

  return NextResponse.json({
    totalObservations,
    openObservations,
    closedObservations,
    byRiskLevel: riskMap,
    bySafetyCategory,
    byLocation,
    byWorkType,
    actionsOverdue,
    actionsByStatus: aStatusMap,
    trendLast12Weeks,
    topUnsafeBehaviours,
    observationsByMonth,
  });
}
