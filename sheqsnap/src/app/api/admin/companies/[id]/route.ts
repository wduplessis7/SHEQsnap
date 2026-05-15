import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { writeAuditLog } from "@/lib/utils";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  if (user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const body = await req.json();

  const company = await prisma.company.update({
    where: { id: params.id },
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

  await writeAuditLog("Company", company.id, "UPDATE", user.id, { name: company.name, active: company.active });

  return NextResponse.json(company);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  if (user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  // Soft delete — just set active = false
  const company = await prisma.company.update({
    where: { id: params.id },
    data: { active: false },
  });

  await writeAuditLog("Company", company.id, "DELETE", user.id, { name: company.name });

  return NextResponse.json({ ok: true });
}
