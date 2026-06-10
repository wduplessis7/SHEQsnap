import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/utils";
import { Role } from "@prisma/client";
import { getFileUrl } from "@/lib/storage";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const appointment = await prisma.legalAppointment.findUnique({
      where: { id: params.id },
      include: {
        position: true,
        department: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        terminatedBy: { select: { id: true, name: true } },
        documents: {
          include: {
            uploadedBy: { select: { id: true, name: true } },
          },
          orderBy: { uploadedAt: "desc" },
        },
        conflicts: {
          include: {
            reviewedBy: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!appointment) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const auditLogs = await prisma.auditLog.findMany({
      where: { entityType: "LegalAppointment", entityId: params.id },
      include: {
        changedBy: { select: { id: true, name: true } },
      },
      orderBy: { timestamp: "desc" },
    });

    const docsWithUrl = appointment.documents.map((doc) => ({
      ...doc,
      fileUrl: getFileUrl(doc.fileName),
    }));
    return NextResponse.json({ ...appointment, documents: docsWithUrl, auditLogs });
  } catch (err) {
    console.error("[legal-appointments/[id] GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const body = await req.json();

  try {
    const existing = await prisma.legalAppointment.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (existing.status === "TERMINATED" && user.role !== Role.ADMIN) {
      return NextResponse.json({ error: "Only admins can edit terminated appointments" }, { status: 403 });
    }

    if (body.status === "TERMINATED" && !body.terminationReason) {
      return NextResponse.json({ error: "terminationReason is required when terminating an appointment" }, { status: 400 });
    }

    const isTerminating = body.status === "TERMINATED";
    const isActivating = body.status === "ACTIVE";

    const updated = await prisma.legalAppointment.update({
      where: { id: params.id },
      data: {
        positionId: body.positionId !== undefined ? body.positionId : undefined,
        entityName: body.entityName !== undefined ? body.entityName : undefined,
        departmentId: body.departmentId !== undefined ? body.departmentId || null : undefined,
        fullName: body.fullName !== undefined ? body.fullName : undefined,
        idNumber: body.idNumber !== undefined ? body.idNumber || null : undefined,
        passportNumber: body.passportNumber !== undefined ? body.passportNumber || null : undefined,
        nationality: body.nationality !== undefined ? body.nationality : undefined,
        gender: body.gender !== undefined ? body.gender || null : undefined,
        race: body.race !== undefined ? body.race || null : undefined,
        disability: body.disability !== undefined ? body.disability || null : undefined,
        email: body.email !== undefined ? body.email || null : undefined,
        phone: body.phone !== undefined ? body.phone || null : undefined,
        address: body.address !== undefined ? body.address || null : undefined,
        taxNumber: body.taxNumber !== undefined ? body.taxNumber || null : undefined,
        employeeNumber: body.employeeNumber !== undefined ? body.employeeNumber || null : undefined,
        appointmentDate: body.appointmentDate !== undefined ? new Date(body.appointmentDate) : undefined,
        effectiveDate: body.effectiveDate !== undefined ? new Date(body.effectiveDate) : undefined,
        endDate: body.endDate !== undefined ? (body.endDate ? new Date(body.endDate) : null) : undefined,
        termLengthMonths: body.termLengthMonths !== undefined ? (body.termLengthMonths ? Number(body.termLengthMonths) : null) : undefined,
        appointmentType: body.appointmentType !== undefined ? body.appointmentType : undefined,
        status: body.status !== undefined ? body.status : undefined,
        appointmentAuthority: body.appointmentAuthority !== undefined ? body.appointmentAuthority || null : undefined,
        gazettedDate: body.gazettedDate !== undefined ? (body.gazettedDate ? new Date(body.gazettedDate) : null) : undefined,
        gazetteNumber: body.gazetteNumber !== undefined ? body.gazetteNumber || null : undefined,
        resolutionRef: body.resolutionRef !== undefined ? body.resolutionRef || null : undefined,
        acceptanceDate: body.acceptanceDate !== undefined ? (body.acceptanceDate ? new Date(body.acceptanceDate) : null) : undefined,
        consentDate: body.consentDate !== undefined ? (body.consentDate ? new Date(body.consentDate) : null) : undefined,
        complianceNotes: body.complianceNotes !== undefined ? body.complianceNotes || null : undefined,
        terminationReason: isTerminating ? body.terminationReason : (isActivating ? null : undefined),
        terminatedAt: isTerminating ? new Date() : (isActivating ? null : undefined),
        terminatedById: isTerminating ? user.id : (isActivating ? null : undefined),
        updatedById: user.id,
      },
    });

    await writeAuditLog("LegalAppointment", params.id, "UPDATE", user.id, {
      before: { status: existing.status },
      after: { status: updated.status },
      changes: body,
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("[legal-appointments/[id] PUT]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  if (user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  try {
    const existing = await prisma.legalAppointment.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const deletedAt = new Date();
    await prisma.legalAppointment.update({ where: { id: params.id }, data: { deletedAt } });
    await writeAuditLog("LegalAppointment", params.id, "DELETE", user.id, { referenceNo: existing.referenceNo, deletedAt: deletedAt.toISOString() });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[legal-appointments/[id] DELETE]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
