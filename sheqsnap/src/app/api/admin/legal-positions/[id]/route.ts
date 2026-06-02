import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/utils";
import { Role } from "@prisma/client";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const position = await prisma.legalPosition.findUnique({
    where: { id: params.id },
    include: {
      archivedBy: { select: { id: true, name: true, email: true } },
      _count: { select: { appointments: true } },
    },
  });

  if (!position) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(position);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const allowedRoles = [Role.ADMIN, Role.MANAGER, Role.SAFETY_OFFICER];
  if (!allowedRoles.includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();

  const before = await prisma.legalPosition.findUnique({ where: { id: params.id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const position = await prisma.legalPosition.update({
    where: { id: params.id },
    data: {
      name: body.name !== undefined ? body.name : undefined,
      code: body.code !== undefined ? body.code : undefined,
      organizationType: body.organizationType !== undefined ? body.organizationType : undefined,
      appointmentCategory: body.appointmentCategory !== undefined ? body.appointmentCategory : undefined,
      description: body.description !== undefined ? body.description || null : undefined,
      isStatutory: body.isStatutory !== undefined ? Boolean(body.isStatutory) : undefined,
      termLengthMonths: body.termLengthMonths !== undefined ? (body.termLengthMonths ? Number(body.termLengthMonths) : null) : undefined,
      renewalAllowed: body.renewalAllowed !== undefined ? Boolean(body.renewalAllowed) : undefined,
      minQualifications: body.minQualifications !== undefined ? body.minQualifications || null : undefined,
      eligibilityRules: body.eligibilityRules !== undefined ? body.eligibilityRules || null : undefined,
      requiresResolution: body.requiresResolution !== undefined ? Boolean(body.requiresResolution) : undefined,
      requiresBackgroundCheck: body.requiresBackgroundCheck !== undefined ? Boolean(body.requiresBackgroundCheck) : undefined,
      requiresDeclarationOfInterest: body.requiresDeclarationOfInterest !== undefined ? Boolean(body.requiresDeclarationOfInterest) : undefined,
      requiresGazettePublication: body.requiresGazettePublication !== undefined ? Boolean(body.requiresGazettePublication) : undefined,
      requiredDocuments: body.requiredDocuments !== undefined ? body.requiredDocuments || null : undefined,
      complianceNotes: body.complianceNotes !== undefined ? body.complianceNotes || null : undefined,
    },
  });

  await writeAuditLog("LegalPosition", params.id, "UPDATE", user.id, { before, after: position });

  return NextResponse.json(position);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const allowedRoles = [Role.ADMIN, Role.MANAGER, Role.SAFETY_OFFICER];
  if (!allowedRoles.includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  if (!body.archiveReason) {
    return NextResponse.json({ error: "archiveReason is required" }, { status: 400 });
  }

  const position = await prisma.legalPosition.findUnique({
    where: { id: params.id },
    include: {
      _count: {
        select: {
          appointments: { where: { status: { in: ["ACTIVE", "DRAFT"] } } },
        },
      },
    },
  });

  if (!position) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (position._count.appointments > 0) {
    return NextResponse.json(
      { error: "Cannot archive: position has active or draft appointments" },
      { status: 409 }
    );
  }

  const archived = await prisma.legalPosition.update({
    where: { id: params.id },
    data: {
      isActive: false,
      archivedAt: new Date(),
      archivedById: user.id,
      archiveReason: body.archiveReason,
    },
  });

  await writeAuditLog("LegalPosition", params.id, "ARCHIVE", user.id, { archiveReason: body.archiveReason });

  return NextResponse.json(archived);
}
