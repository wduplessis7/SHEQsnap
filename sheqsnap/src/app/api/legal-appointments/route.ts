import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeAuditLog, generateReferenceNo } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const positionId = searchParams.get("positionId");
  const departmentId = searchParams.get("departmentId");
  const appointmentType = searchParams.get("appointmentType");
  const search = searchParams.get("search");
  const expiring = searchParams.get("expiring");
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "25", 10)));
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { deletedAt: null };

  if (status) where.status = status;
  if (positionId) where.positionId = positionId;
  if (departmentId) where.departmentId = departmentId;
  if (appointmentType) where.appointmentType = appointmentType;

  if (search) {
    where.OR = [
      { fullName: { contains: search } },
      { referenceNo: { contains: search } },
      { entityName: { contains: search } },
    ];
  }

  if (expiring === "true") {
    const now = new Date();
    const in90 = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    where.endDate = { gte: now, lte: in90 };
  }

  try {
    const [total, appointments] = await Promise.all([
      prisma.legalAppointment.count({ where }),
      prisma.legalAppointment.findMany({
        where,
        include: {
          position: { select: { id: true, name: true, code: true, appointmentCategory: true } },
          department: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true, email: true } },
          _count: { select: { documents: true, conflicts: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ]);

    return NextResponse.json({
      data: appointments,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("[legal-appointments GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const body = await req.json();

  const required = ["positionId", "entityName", "fullName", "nationality", "appointmentDate", "effectiveDate", "appointmentType"];
  for (const field of required) {
    if (!body[field]) {
      return NextResponse.json({ error: `${field} is required` }, { status: 400 });
    }
  }

  try {
    const referenceNo = await generateReferenceNo("LA", "legalAppointment");

    const appointment = await prisma.legalAppointment.create({
      data: {
        referenceNo,
        positionId: body.positionId,
        entityName: body.entityName,
        departmentId: body.departmentId || null,
        fullName: body.fullName,
        idNumber: body.idNumber || null,
        passportNumber: body.passportNumber || null,
        nationality: body.nationality,
        gender: body.gender || null,
        race: body.race || null,
        disability: body.disability || null,
        email: body.email || null,
        phone: body.phone || null,
        address: body.address || null,
        taxNumber: body.taxNumber || null,
        employeeNumber: body.employeeNumber || null,
        appointmentDate: new Date(body.appointmentDate),
        effectiveDate: new Date(body.effectiveDate),
        endDate: body.endDate ? new Date(body.endDate) : null,
        termLengthMonths: body.termLengthMonths ? Number(body.termLengthMonths) : null,
        appointmentType: body.appointmentType,
        status: body.status || "DRAFT",
        appointmentAuthority: body.appointmentAuthority || null,
        gazettedDate: body.gazettedDate ? new Date(body.gazettedDate) : null,
        gazetteNumber: body.gazetteNumber || null,
        resolutionRef: body.resolutionRef || null,
        acceptanceDate: body.acceptanceDate ? new Date(body.acceptanceDate) : null,
        consentDate: body.consentDate ? new Date(body.consentDate) : null,
        complianceNotes: body.complianceNotes || null,
        createdById: user.id,
      },
      include: {
        position: { select: { id: true, name: true, code: true } },
        department: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    await writeAuditLog("LegalAppointment", appointment.id, "CREATE", user.id, { referenceNo, status: "DRAFT" });

    return NextResponse.json(appointment, { status: 201 });
  } catch (err) {
    console.error("[legal-appointments POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
