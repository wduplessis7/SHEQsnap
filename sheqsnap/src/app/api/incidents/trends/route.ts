import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const departmentId = searchParams.get("departmentId");

  const where: any = {};
  if (departmentId) where.departmentId = departmentId;
  if (from || to) {
    where.dateOfIncident = {};
    if (from) where.dateOfIncident.gte = new Date(from);
    if (to) where.dateOfIncident.lte = new Date(new Date(to).setHours(23, 59, 59, 999));
  }

  const records = await prisma.incident.findMany({
    where,
    select: {
      id: true,
      dateOfIncident: true,
      incidentType: true,
      injuryType: true,
      riskCategory: true,
      severityLevel: true,
      status: true,
      location: true,
    },
    orderBy: { dateOfIncident: "asc" },
  });

  // Monthly trend helpers
  function buildMonthlyTrend(records: any[], key: string) {
    const monthlyMap: Record<string, Record<string, number>> = {};
    const valueSet = new Set<string>();

    for (const r of records) {
      const month = r.dateOfIncident.toISOString().slice(0, 7);
      const val = r[key] || "Unknown";
      valueSet.add(val);
      if (!monthlyMap[month]) monthlyMap[month] = {};
      monthlyMap[month][val] = (monthlyMap[month][val] || 0) + 1;
    }

    const values = Array.from(valueSet).sort();
    const trend = Object.entries(monthlyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, counts]) => {
        const entry: Record<string, any> = { month };
        for (const v of values) entry[v] = counts[v] || 0;
        return entry;
      });

    return { trend, values };
  }

  function buildBreakdown(records: any[], key: string) {
    const totals: Record<string, number> = {};
    for (const r of records) {
      const val = r[key] || "Unknown";
      totals[val] = (totals[val] || 0) + 1;
    }
    return Object.entries(totals)
      .sort(([, a], [, b]) => b - a)
      .map(([label, count]) => ({ label, count }));
  }

  const { trend: injuryTrend, values: injuryTypes } = buildMonthlyTrend(records, "injuryType");
  const { trend: incidentTypeTrend, values: incidentTypes } = buildMonthlyTrend(records, "incidentType");

  const severityTotals: Record<string, number> = {};
  const statusTotals: Record<string, number> = {};
  const locationTotals: Record<string, number> = {};

  for (const r of records) {
    severityTotals[r.severityLevel] = (severityTotals[r.severityLevel] || 0) + 1;
    statusTotals[r.status] = (statusTotals[r.status] || 0) + 1;
    locationTotals[r.location] = (locationTotals[r.location] || 0) + 1;
  }

  const topLocations = Object.entries(locationTotals)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([location, count]) => ({ location, count }));

  return NextResponse.json({
    total: records.length,
    injuryTypes,
    injuryTrend,
    injuryBreakdown: buildBreakdown(records, "injuryType"),
    incidentTypes,
    incidentTypeTrend,
    incidentTypeBreakdown: buildBreakdown(records, "incidentType"),
    severityBreakdown: Object.entries(severityTotals).map(([severity, count]) => ({ severity, count })),
    statusBreakdown: Object.entries(statusTotals).map(([status, count]) => ({ status, count })),
    topLocations,
  });
}
