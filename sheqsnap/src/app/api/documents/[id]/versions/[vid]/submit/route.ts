import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/utils";
import { sendEmail } from "@/lib/email";

export async function POST(req: NextRequest, { params }: { params: { id: string; vid: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;

  const version = await prisma.docVersion.findFirst({
    where: { id: params.vid, documentId: params.id },
    include: {
      document: true,
      workflowSteps: { orderBy: { stepOrder: "asc" } },
    },
  });
  if (!version) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (version.status !== "DRAFT") {
    return NextResponse.json({ error: "Version is not in DRAFT state" }, { status: 400 });
  }

  // Update version status
  await prisma.docVersion.update({
    where: { id: params.vid },
    data: { status: "UNDER_REVIEW", isDraft: false },
  });

  // Update parent doc status
  await prisma.document.update({
    where: { id: params.id },
    data: { status: "UNDER_REVIEW" },
  });

  // Notify first pending workflow step assignee
  const firstStep = version.workflowSteps.find(s => s.status === "PENDING");
  if (firstStep?.assignedUserId) {
    const assignee = await prisma.user.findUnique({ where: { id: firstStep.assignedUserId }, select: { email: true, name: true } });
    if (assignee?.email) {
      await sendEmail({
        to: assignee.email,
        subject: `Document review required: ${version.document.title}`,
        html: `<p>Hi ${assignee.name},</p><p>A document has been submitted for your review:</p><p><strong>${version.document.docNumber} — ${version.document.title}</strong> (v${version.versionNumber})</p><p>Please log in to SHEQSnap to review.</p>`,
      }).catch(() => {});
    }
  }

  await writeAuditLog("DocVersion", params.vid, "SUBMIT", user.id, { docId: params.id });

  return NextResponse.json({ ok: true });
}
