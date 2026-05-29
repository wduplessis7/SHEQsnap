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

  if (!note) return NextResponse.json({ error: "A reason is required when requesting changes" }, { status: 400 });

  const version = await prisma.docVersion.findFirst({
    where: { id: params.vid, documentId: params.id },
    include: { workflowSteps: { orderBy: { stepOrder: "asc" } }, document: true },
  });
  if (!version) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const pendingStep = version.workflowSteps.find(
    s => s.status === "PENDING" && (s.assignedRole === user.role || s.assignedUserId === user.id)
  );
  if (!pendingStep) return NextResponse.json({ error: "No pending step for your role" }, { status: 400 });

  await prisma.docWorkflowStep.update({
    where: { id: pendingStep.id },
    data: { status: "CHANGES_REQUESTED", completedAt: new Date(), completedById: user.id, note },
  });

  // Reset all subsequent steps back to PENDING
  const laterSteps = version.workflowSteps.filter(s => s.stepOrder > pendingStep.stepOrder);
  if (laterSteps.length > 0) {
    await prisma.docWorkflowStep.updateMany({
      where: { id: { in: laterSteps.map(s => s.id) } },
      data: { status: "PENDING", completedAt: null, completedById: null },
    });
  }

  // Return version to DRAFT
  await prisma.docVersion.update({ where: { id: params.vid }, data: { status: "DRAFT", isDraft: true } });
  await prisma.document.update({ where: { id: params.id }, data: { status: "DRAFT" } });

  await writeAuditLog("DocVersion", params.vid, "REJECT", user.id, { note });

  return NextResponse.json({ ok: true });
}
