import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const appointment = await prisma.legalAppointment.findUnique({ where: { id: params.id } });
  if (!appointment) return NextResponse.json({ error: "Appointment not found" }, { status: 404 });

  const conflicts = await prisma.conflictOfInterest.findMany({
    where: { appointmentId: params.id },
    include: {
      reviewedBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(conflicts);
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const appointment = await prisma.legalAppointment.findUnique({ where: { id: params.id } });
  if (!appointment) return NextResponse.json({ error: "Appointment not found" }, { status: 404 });

  const body = await req.json();

  if (!body.declarationType) {
    return NextResponse.json({ error: "declarationType is required" }, { status: 400 });
  }
  if (!body.description) {
    return NextResponse.json({ error: "description is required" }, { status: 400 });
  }

  const conflict = await prisma.conflictOfInterest.create({
    data: {
      appointmentId: params.id,
      declarationType: body.declarationType,
      entityName: body.entityName || null,
      description: body.description,
      interestValue: body.interestValue || null,
      relationshipType: body.relationshipType || null,
      managementPlan: body.managementPlan || null,
      status: "DISCLOSED",
    },
    include: {
      reviewedBy: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(conflict, { status: 201 });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;

  const { searchParams } = new URL(req.url);
  const conflictId = searchParams.get("conflictId");

  if (!conflictId) return NextResponse.json({ error: "conflictId query param is required" }, { status: 400 });

  const body = await req.json();
  const allowedStatuses = ["MANAGED", "RESOLVED"];
  if (!body.status || !allowedStatuses.includes(body.status)) {
    return NextResponse.json({ error: "status must be MANAGED or RESOLVED" }, { status: 400 });
  }

  const conflict = await prisma.conflictOfInterest.findUnique({ where: { id: conflictId } });
  if (!conflict) return NextResponse.json({ error: "Conflict not found" }, { status: 404 });
  if (conflict.appointmentId !== params.id) {
    return NextResponse.json({ error: "Conflict does not belong to this appointment" }, { status: 403 });
  }

  const updated = await prisma.conflictOfInterest.update({
    where: { id: conflictId },
    data: {
      status: body.status,
      reviewedById: user.id,
      reviewedAt: new Date(),
      managementPlan: body.managementPlan !== undefined ? body.managementPlan || null : undefined,
    },
    include: {
      reviewedBy: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(updated);
}
