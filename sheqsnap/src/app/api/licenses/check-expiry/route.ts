import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  // Fetch all licenses that are not already expired or expiring_soon but need updating,
  // plus already flagged ones that might have changed state
  const allLicenses = await prisma.license.findMany();

  let updatedExpired = 0;
  let updatedExpiringSoon = 0;
  let updatedActive = 0;

  const updates = allLicenses.map((license) => {
    let newStatus: string;
    if (license.expiryDate < now) {
      newStatus = "expired";
    } else if (license.expiryDate <= in30Days) {
      newStatus = "expiring_soon";
    } else {
      newStatus = "active";
    }

    if (newStatus !== license.status) {
      if (newStatus === "expired") updatedExpired++;
      else if (newStatus === "expiring_soon") updatedExpiringSoon++;
      else updatedActive++;

      return prisma.license.update({
        where: { id: license.id },
        data: { status: newStatus },
      });
    }
    return null;
  });

  const filtered = updates.filter(Boolean) as Promise<any>[];
  await Promise.all(filtered);

  const summary = await prisma.license.groupBy({
    by: ["status"],
    _count: true,
  });

  return NextResponse.json({
    updatedExpired,
    updatedExpiringSoon,
    updatedActive,
    totalUpdated: updatedExpired + updatedExpiringSoon + updatedActive,
    summary: summary.map((s) => ({ status: s.status, count: s._count })),
  });
}
