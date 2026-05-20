import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const change = await prisma.changeRequest.findUnique({ where: { id: params.id } });
  if (!change) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(change);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const updated = await prisma.changeRequest.update({
    where: { id: params.id },
    data: {
      title: body.title,
      changeType: body.changeType,
      description: body.description,
      reason: body.reason,
      riskAssessment: body.riskAssessment || null,
      affectedAreas: body.affectedAreas || null,
      proposedDate: body.proposedDate ? new Date(body.proposedDate) : null,
      implementationDate: body.implementationDate ? new Date(body.implementationDate) : null,
      reviewDate: body.reviewDate ? new Date(body.reviewDate) : null,
      status: body.status,
      approvedByName: body.approvedByName || null,
      approvedAt: body.approvedAt ? new Date(body.approvedAt) : null,
      rejectionReason: body.rejectionReason || null,
      closureNotes: body.closureNotes || null,
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await prisma.changeRequest.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
