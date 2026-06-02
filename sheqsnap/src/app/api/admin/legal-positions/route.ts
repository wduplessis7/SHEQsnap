import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const positions = await prisma.legalPosition.findMany({
    include: {
      archivedBy: { select: { id: true, name: true, email: true } },
      _count: { select: { appointments: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(positions);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const allowedRoles = [Role.ADMIN, Role.MANAGER, Role.SAFETY_OFFICER];
  if (!allowedRoles.includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();

  if (!body.name || !body.code) {
    return NextResponse.json({ error: "name and code are required" }, { status: 400 });
  }

  const existing = await prisma.legalPosition.findUnique({ where: { code: body.code } });
  if (existing) {
    return NextResponse.json({ error: "A position with this code already exists" }, { status: 409 });
  }

  const position = await prisma.legalPosition.create({
    data: {
      name: body.name,
      code: body.code,
      organizationType: body.organizationType,
      appointmentCategory: body.appointmentCategory,
      description: body.description || null,
      isStatutory: Boolean(body.isStatutory),
      termLengthMonths: body.termLengthMonths ? Number(body.termLengthMonths) : null,
      renewalAllowed: body.renewalAllowed !== undefined ? Boolean(body.renewalAllowed) : true,
      minQualifications: body.minQualifications || null,
      eligibilityRules: body.eligibilityRules || null,
      requiresResolution: Boolean(body.requiresResolution),
      requiresBackgroundCheck: Boolean(body.requiresBackgroundCheck),
      requiresDeclarationOfInterest: Boolean(body.requiresDeclarationOfInterest),
      requiresGazettePublication: Boolean(body.requiresGazettePublication),
      requiredDocuments: body.requiredDocuments || null,
      complianceNotes: body.complianceNotes || null,
    },
  });

  return NextResponse.json(position, { status: 201 });
}
