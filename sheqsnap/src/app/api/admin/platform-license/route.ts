import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const currentUser = session.user as any;
  if (currentUser.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const license = await prisma.platformLicense.findFirst({
    where: { active: true },
    orderBy: { createdAt: "desc" },
  });

  // Count licensed users (isLicensed=true, reportingOnly=false, active=true)
  const licensedUserCount = await prisma.user.count({
    where: { isLicensed: true, reportingOnly: false, active: true },
  });

  // Count reporting-only users
  const reportingOnlyCount = await prisma.user.count({
    where: { reportingOnly: true },
  });

  const perUserRate = license?.perUserRate ?? 385;
  const monthlyHostingFee = license?.monthlyHostingFee ?? 850;
  const monthlyUserCost = licensedUserCount * perUserRate;
  const totalMonthlyCost = monthlyHostingFee + monthlyUserCost;

  let daysUntilRenewal: number | null = null;
  let renewalAlert = false;

  if (license?.licenseRenewal) {
    const now = new Date();
    const renewal = new Date(license.licenseRenewal);
    daysUntilRenewal = Math.ceil((renewal.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    renewalAlert = daysUntilRenewal <= 30;
  }

  return NextResponse.json({
    license,
    stats: {
      licensedUserCount,
      reportingOnlyCount,
      monthlyUserCost,
      totalMonthlyCost,
      daysUntilRenewal,
      renewalAlert,
    },
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const currentUser = session.user as any;
  if (currentUser.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const body = await req.json();

  const license = await prisma.platformLicense.create({
    data: {
      clientName: body.clientName,
      serverTier: body.serverTier ?? "STARTUP",
      setupFee: body.setupFee ?? 0,
      annualLicenseFee: body.annualLicenseFee ?? 0,
      monthlyHostingFee: body.monthlyHostingFee ?? 850,
      perUserRate: body.perUserRate ?? 385,
      licenseStart: body.licenseStart ? new Date(body.licenseStart) : new Date(),
      licenseRenewal: new Date(body.licenseRenewal),
      backupEnabled: body.backupEnabled !== false,
      backupRetentionMonths: body.backupRetentionMonths ?? 12,
      maxLicensedUsers: body.maxLicensedUsers ?? null,
      active: body.active !== false,
      notes: body.notes ?? null,
    },
  });

  return NextResponse.json(license, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const currentUser = session.user as any;
  if (currentUser.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const license = await prisma.platformLicense.update({
    where: { id: body.id },
    data: {
      clientName: body.clientName,
      serverTier: body.serverTier,
      setupFee: body.setupFee,
      annualLicenseFee: body.annualLicenseFee,
      monthlyHostingFee: body.monthlyHostingFee,
      perUserRate: body.perUserRate,
      licenseStart: body.licenseStart ? new Date(body.licenseStart) : undefined,
      licenseRenewal: body.licenseRenewal ? new Date(body.licenseRenewal) : undefined,
      backupEnabled: body.backupEnabled,
      backupRetentionMonths: body.backupRetentionMonths,
      maxLicensedUsers: body.maxLicensedUsers ?? null,
      active: body.active,
      notes: body.notes ?? null,
    },
  });

  return NextResponse.json(license);
}
