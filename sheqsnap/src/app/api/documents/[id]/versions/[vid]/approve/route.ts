import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/utils";

export async function POST(req: NextRequest, { params }: { params: { id: string; vid: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const allowed = ["SAFETY_OFFICER", "MANAGER", "ADMIN"];
  if (!allowed.includes(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { note } = body;

  const version = await prisma.docVersion.findFirst({
    where: { id: params.vid, documentId: params.id },
    include: {
      document: true,
      workflowSteps: { orderBy: { stepOrder: "asc" } },
    },
  });
  if (!version) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (version.status !== "UNDER_REVIEW") {
    return NextResponse.json({ error: "Version is not under review" }, { status: 400 });
  }

  // Find the current pending step matching this user's role
  const pendingStep = version.workflowSteps.find(
    s => s.status === "PENDING" && (s.assignedRole === user.role || s.assignedUserId === user.id)
  );
  if (!pendingStep) {
    return NextResponse.json({ error: "No pending step assigned to your role" }, { status: 400 });
  }

  // Mark this step done
  await prisma.docWorkflowStep.update({
    where: { id: pendingStep.id },
    data: { status: "APPROVED", completedAt: new Date(), completedById: user.id, note: note || null },
  });

  // Check if all steps are now approved
  const remainingSteps = version.workflowSteps.filter(
    s => s.id !== pendingStep.id && s.status === "PENDING"
  );

  if (remainingSteps.length === 0) {
    // All approved — mark version as APPROVED
    await prisma.docVersion.update({ where: { id: params.vid }, data: { status: "APPROVED" } });
    await prisma.document.update({ where: { id: params.id }, data: { status: "APPROVED" } });
  }

  await writeAuditLog("DocVersion", params.vid, "APPROVE_STEP", user.id, { stepId: pendingStep.id, note });

  return NextResponse.json({ ok: true, allApproved: remainingSteps.length === 0 });
}
