import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { getLicenseModules } from "@/lib/license";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const currentUser = session.user as any;
  if (currentUser.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const [licenseServerData, licensedUserCount, reportingOnlyCount] = await Promise.all([
    getLicenseModules(),
    prisma.user.count({ where: { isLicensed: true, reportingOnly: false, active: true } }),
    prisma.user.count({ where: { reportingOnly: true } }),
  ]);

  return NextResponse.json({
    licenseServer: {
      status: licenseServerData.status,
      companyName: licenseServerData.companyName ?? null,
      modules: licenseServerData.modules,
      expiresAt: licenseServerData.expiresAt ?? null,
      maxUsers: licenseServerData.maxUsers,
    },
    stats: {
      licensedUserCount,
      reportingOnlyCount,
    },
  });
}
