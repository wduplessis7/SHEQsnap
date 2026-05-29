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

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      isLicensed: true,
      reportingOnly: true,
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(users);
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const currentUser = session.user as any;
  if (currentUser.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const body = await req.json();
  if (!body.userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const updateData: any = {};

  if (body.reportingOnly === true) {
    // Setting reportingOnly: true also forces isLicensed: false
    updateData.reportingOnly = true;
    updateData.isLicensed = false;
  } else {
    if (typeof body.reportingOnly === "boolean") {
      updateData.reportingOnly = body.reportingOnly;
    }
    if (typeof body.isLicensed === "boolean") {
      updateData.isLicensed = body.isLicensed;
    }
  }

  const updated = await prisma.user.update({
    where: { id: body.userId },
    data: updateData,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      isLicensed: true,
      reportingOnly: true,
    },
  });

  return NextResponse.json(updated);
}
