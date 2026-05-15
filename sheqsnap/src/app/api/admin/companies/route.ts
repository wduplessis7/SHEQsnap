import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { writeAuditLog } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const allowedRoles: Role[] = [Role.ADMIN, Role.MANAGER, Role.SAFETY_OFFICER];
  if (!allowedRoles.includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const companies = await prisma.company.findMany({
    include: {
      site: { select: { id: true, name: true } },
      responsiblePerson: { select: { id: true, name: true, email: true } },
      _count: { select: { contractors: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(companies);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  if (user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const body = await req.json();

  const company = await prisma.company.create({
    data: {
      name: body.name,
      registrationNo: body.registrationNo || null,
      contactName: body.contactName || null,
      contactEmail: body.contactEmail || null,
      contactPhone: body.contactPhone || null,
      siteId: body.siteId || null,
      responsiblePersonId: body.responsiblePersonId || null,
      active: body.active !== false,
    },
    include: {
      site: { select: { id: true, name: true } },
      responsiblePerson: { select: { id: true, name: true, email: true } },
    },
  });

  await writeAuditLog("Company", company.id, "CREATE", user.id, { name: company.name });

  return NextResponse.json(company, { status: 201 });
}
