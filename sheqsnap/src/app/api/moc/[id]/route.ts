import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const change = await prisma.changeRequest.findUnique({ where: { id: params.id } });
    if (!change) return NextResponse.json({ error: "Not found" }, { status: 404 });

    let assignedApproverName: string | null = null;
    if (change.approvedById) {
      const approver = await prisma.user.findUnique({
        where: { id: change.approvedById },
        select: { name: true },
      });
      assignedApproverName = approver?.name ?? null;
    }

    return NextResponse.json({ ...change, assignedApproverName });
  } catch (err) {
    console.error("[moc/[id] GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const change = await prisma.changeRequest.findUnique({ where: { id: params.id }, select: { requestedById: true, approvedById: true } });
  if (!change) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();

  const isAdmin = user.role === "ADMIN";
  const isCreator = change.requestedById === user.id;
  const isAssignedApprover = change.approvedById !== null && change.approvedById === user.id;
  const touchingApprovalFields = ["APPROVED", "REJECTED"].includes(body.status) || body.approvedByName !== undefined || body.approvedAt !== undefined || body.rejectionReason !== undefined;

  if (touchingApprovalFields && !isAdmin && !isAssignedApprover) {
    return NextResponse.json({ error: "Only the assigned approver or admin can approve/reject" }, { status: 403 });
  }
  if (!touchingApprovalFields && !isAdmin && !isCreator) {
    return NextResponse.json({ error: "Only the creator or admin can edit this MOC" }, { status: 403 });
  }

  try {
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
        ...(body.approverId !== undefined && { approvedById: body.approverId || null }),
        approvedByName: body.approvedByName || null,
        approvedAt: body.approvedAt ? new Date(body.approvedAt) : null,
        rejectionReason: body.rejectionReason || null,
        closureNotes: body.closureNotes || null,
      },
    });
    return NextResponse.json(updated);
  } catch (err) {
    console.error("[moc/[id] PUT]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Admin only" }, { status: 403 });
  try {
    await prisma.changeRequest.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[moc/[id] DELETE]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
