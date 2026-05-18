import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const [expired, within7Days, within30Days] = await Promise.all([
    prisma.license.findMany({
      where: { expiryDate: { lt: now } },
      orderBy: { expiryDate: "asc" },
    }),
    prisma.license.findMany({
      where: { expiryDate: { gte: now, lt: in7Days } },
      orderBy: { expiryDate: "asc" },
    }),
    prisma.license.findMany({
      where: { expiryDate: { gte: in7Days, lt: in30Days } },
      orderBy: { expiryDate: "asc" },
    }),
  ]);

  return NextResponse.json({
    expired,
    within7Days,
    within30Days,
    summary: {
      expiredCount: expired.length,
      within7DaysCount: within7Days.length,
      within30DaysCount: within30Days.length,
      totalAlerts: expired.length + within7Days.length + within30Days.length,
    },
  });
}
