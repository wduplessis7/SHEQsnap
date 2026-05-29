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
    where.dateReported = {};
    if (from) where.dateReported.gte = new Date(from);
    if (to) where.dateReported.lte = new Date(new Date(to).setHours(23, 59, 59, 999));
  }

  const records = await prisma.nearMiss.findMany({
    where,
    select: {
      id: true,
      dateReported: true,
      riskCategory: true,
      severityLevel: true,
      status: true,
      location: true,
    },
    orderBy: { dateReported: "asc" },
  });

  // Monthly trend grouped by riskCategory
  const monthlyMap: Record<string, Record<string, number>> = {};
  const categorySet = new Set<string>();
  const categoryTotals: Record<string, number> = {};
  const severityTotals: Record<string, number> = {};
  const locationTotals: Record<string, number> = {};
  const statusTotals: Record<string, number> = {};

  for (const r of records) {
    const month = r.dateReported.toISOString().slice(0, 7); // "YYYY-MM"
    const cat = r.riskCategory || "Unknown";
    categorySet.add(cat);

    if (!monthlyMap[month]) monthlyMap[month] = {};
    monthlyMap[month][cat] = (monthlyMap[month][cat] || 0) + 1;

    categoryTotals[cat] = (categoryTotals[cat] || 0) + 1;
    severityTotals[r.severityLevel] = (severityTotals[r.severityLevel] || 0) + 1;
    locationTotals[r.location] = (locationTotals[r.location] || 0) + 1;
    statusTotals[r.status] = (statusTotals[r.status] || 0) + 1;
  }

  // Fill gaps so every month has all categories
  const categories = Array.from(categorySet).sort();
  const monthlyTrend = Object.entries(monthlyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, counts]) => {
      const entry: Record<string, any> = { month };
      for (const cat of categories) entry[cat] = counts[cat] || 0;
      return entry;
    });

  // Top 10 locations
  const topLocations = Object.entries(locationTotals)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([location, count]) => ({ location, count }));

  const categoryBreakdown = Object.entries(categoryTotals)
    .sort(([, a], [, b]) => b - a)
    .map(([category, count]) => ({ category, count }));

  const severityBreakdown = Object.entries(severityTotals)
    .map(([severity, count]) => ({ severity, count }));

  const statusBreakdown = Object.entries(statusTotals)
    .map(([status, count]) => ({ status, count }));

  return NextResponse.json({
    total: records.length,
    categories,
    monthlyTrend,
    categoryBreakdown,
    severityBreakdown,
    statusBreakdown,
    topLocations,
  });
}
