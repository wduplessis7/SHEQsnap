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

  try {
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

    // Group entity IDs by type for batched lookups
    const nearMissIds = approvals.filter(a => a.entityType === ApprovalEntityType.NEAR_MISS).map(a => a.entityId);
    const incidentIds = approvals.filter(a => a.entityType === ApprovalEntityType.INCIDENT).map(a => a.entityId);
    const logEntryIds = approvals.filter(a => a.entityType === ApprovalEntityType.LOG_ENTRY).map(a => a.entityId);

    const [nearMissRows, incidentRows, logEntryRows] = await Promise.all([
      nearMissIds.length > 0
        ? prisma.nearMiss.findMany({ where: { id: { in: nearMissIds } }, select: { id: true, referenceNo: true, description: true, severityLevel: true, location: true, dateReported: true } })
        : [],
      incidentIds.length > 0
        ? prisma.incident.findMany({ where: { id: { in: incidentIds } }, select: { id: true, referenceNo: true, description: true, severityLevel: true, location: true, dateOfIncident: true } })
        : [],
      logEntryIds.length > 0
        ? prisma.logEntry.findMany({ where: { id: { in: logEntryIds } }, select: { id: true, referenceNo: true, title: true, logType: true, entryDate: true } })
        : [],
    ]);

    const nearMissMap = Object.fromEntries(nearMissRows.map(({ id, ...rest }) => [id, rest]));
    const incidentMap = Object.fromEntries(incidentRows.map(({ id, ...rest }) => [id, rest]));
    const logEntryMap = Object.fromEntries(logEntryRows.map(({ id, ...rest }) => [id, rest]));

    const enriched = approvals.map((approval) => {
      let entityDetails: Record<string, unknown> = {};
      if (approval.entityType === ApprovalEntityType.NEAR_MISS) {
        entityDetails = nearMissMap[approval.entityId] ?? {};
      } else if (approval.entityType === ApprovalEntityType.INCIDENT) {
        entityDetails = incidentMap[approval.entityId] ?? {};
      } else if (approval.entityType === ApprovalEntityType.LOG_ENTRY) {
        entityDetails = logEntryMap[approval.entityId] ?? {};
      }
      return { ...approval, entityDetails };
    });

    // Also include MOC ChangeRequests pending approval for this user
    const pendingMocs = await prisma.changeRequest.findMany({
      where: {
        approvedById: user.id,
        status: "pending_approval",
      },
      orderBy: { createdAt: "desc" },
    });

    const mocItems = pendingMocs.map((moc) => ({
      id: `moc:${moc.id}`,
      entityType: "MOC",
      entityId: moc.id,
      status: "PENDING",
      createdAt: moc.createdAt,
      requestedBy: { id: moc.requestedById, name: moc.requestedByName },
      assignedApprover: { id: user.id, name: user.name },
      entityDetails: {
        referenceNo: moc.referenceNo,
        title: moc.title,
        description: moc.description,
        changeType: moc.changeType,
        dateReported: moc.createdAt,
      },
    }));

    return NextResponse.json([...enriched, ...mocItems]);
  } catch (err) {
    console.error("[approvals GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
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

  try {
    // Handle MOC approvals (id prefixed with "moc:")
    if (approvalId.startsWith("moc:")) {
      const mocId = approvalId.slice(4);
      const moc = await prisma.changeRequest.findUnique({ where: { id: mocId } });
      if (!moc) return NextResponse.json({ error: "MOC not found" }, { status: 404 });
      if (moc.approvedById !== user.id) return NextResponse.json({ error: "You are not the assigned approver" }, { status: 403 });
      if (moc.status !== "pending_approval") return NextResponse.json({ error: "MOC is not pending approval" }, { status: 400 });

      const updated = await prisma.changeRequest.update({
        where: { id: mocId },
        data: action === "APPROVE"
          ? { status: "approved", approvedByName: user.name, approvedAt: new Date() }
          : { status: "rejected", rejectionReason: rejectionReason || null },
      });

      await writeAuditLog("ChangeRequest", mocId, action, user.id, { rejectionReason: rejectionReason || null });
      return NextResponse.json(updated);
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
  } catch (err) {
    console.error("[approvals POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
