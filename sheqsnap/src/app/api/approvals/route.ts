import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role, ApprovalStatus, ApprovalEntityType } from "@prisma/client";
import { writeAuditLog } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;

  // Only safety officers, managers, admins can view approvals queue
  const allowedRoles: Role[] = [Role.SAFETY_OFFICER, Role.MANAGER, Role.ADMIN];
  if (!allowedRoles.includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const approvals = await prisma.approvalRequest.findMany({
    where: {
      assignedApproverId: user.id,
      status: ApprovalStatus.PENDING,
    },
    include: {
      requestedBy: { select: { id: true, name: true, email: true } },
      assignedApprover: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Enrich with entity details
  const enriched = await Promise.all(
    approvals.map(async (approval) => {
      let entityDetails: Record<string, unknown> = {};
      if (approval.entityType === ApprovalEntityType.NEAR_MISS) {
        const nm = await prisma.nearMiss.findUnique({
          where: { id: approval.entityId },
          select: { referenceNo: true, description: true, severityLevel: true, location: true, dateReported: true },
        });
        entityDetails = nm ?? {};
      } else if (approval.entityType === ApprovalEntityType.INCIDENT) {
        const inc = await prisma.incident.findUnique({
          where: { id: approval.entityId },
          select: { referenceNo: true, description: true, severityLevel: true, location: true, dateOfIncident: true },
        });
        entityDetails = inc ?? {};
      } else if (approval.entityType === ApprovalEntityType.LOG_ENTRY) {
        const log = await prisma.logEntry.findUnique({
          where: { id: approval.entityId },
          select: { referenceNo: true, title: true, logType: true, entryDate: true },
        });
        entityDetails = log ?? {};
      }
      return { ...approval, entityDetails };
    })
  );

  return NextResponse.json(enriched);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;

  const allowedRoles: Role[] = [Role.SAFETY_OFFICER, Role.MANAGER, Role.ADMIN];
  if (!allowedRoles.includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { approvalId, action, rejectionReason } = body as {
    approvalId: string;
    action: "APPROVE" | "REJECT";
    rejectionReason?: string;
  };

  if (!approvalId || !action) {
    return NextResponse.json({ error: "approvalId and action are required" }, { status: 400 });
  }

  const approval = await prisma.approvalRequest.findUnique({
    where: { id: approvalId },
  });

  if (!approval) {
    return NextResponse.json({ error: "Approval request not found" }, { status: 404 });
  }

  if (approval.assignedApproverId !== user.id) {
    return NextResponse.json({ error: "You are not the assigned approver" }, { status: 403 });
  }

  if (approval.status !== ApprovalStatus.PENDING) {
    return NextResponse.json({ error: "Approval request is not pending" }, { status: 400 });
  }

  const newStatus = action === "APPROVE" ? ApprovalStatus.APPROVED : ApprovalStatus.REJECTED;

  const updated = await prisma.approvalRequest.update({
    where: { id: approvalId },
    data: {
      status: newStatus,
      rejectionReason: action === "REJECT" ? (rejectionReason || null) : null,
      decidedAt: new Date(),
    },
  });

  // Update the underlying entity status
  if (action === "APPROVE") {
    if (approval.entityType === ApprovalEntityType.NEAR_MISS) {
      await prisma.nearMiss.update({
        where: { id: approval.entityId },
        data: { status: "SUBMITTED" },
      });
    } else if (approval.entityType === ApprovalEntityType.INCIDENT) {
      await prisma.incident.update({
        where: { id: approval.entityId },
        data: { status: "SUBMITTED" },
      });
    } else if (approval.entityType === ApprovalEntityType.LOG_ENTRY) {
      await prisma.logEntry.update({
        where: { id: approval.entityId },
        data: { status: "ACTIVE", approvedById: user.id, approvedAt: new Date() },
      });
    }
  } else {
    // On reject, revert entity to NEW / DRAFT
    if (approval.entityType === ApprovalEntityType.NEAR_MISS) {
      await prisma.nearMiss.update({
        where: { id: approval.entityId },
        data: { status: "NEW" },
      });
    } else if (approval.entityType === ApprovalEntityType.INCIDENT) {
      await prisma.incident.update({
        where: { id: approval.entityId },
        data: { status: "NEW" },
      });
    } else if (approval.entityType === ApprovalEntityType.LOG_ENTRY) {
      await prisma.logEntry.update({
        where: { id: approval.entityId },
        data: { status: "DRAFT" },
      });
    }
  }

  await writeAuditLog("ApprovalRequest", approvalId, action, user.id, {
    entityType: approval.entityType,
    entityId: approval.entityId,
    rejectionReason: rejectionReason || null,
  });

  return NextResponse.json(updated);
}
