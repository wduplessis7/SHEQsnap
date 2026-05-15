import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/utils";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;

  const assignment = await prisma.checklistAssignment.findUnique({
    where: { id: params.id },
    include: {
      template: {
        include: { items: true },
      },
    },
  });

  if (!assignment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (assignment.assignedToUserId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (assignment.status === "SUBMITTED") {
    return NextResponse.json({ error: "Assignment already submitted" }, { status: 400 });
  }

  const body = await req.json();
  const { notes, responses } = body;

  if (!responses || !Array.isArray(responses)) {
    return NextResponse.json({ error: "responses array is required" }, { status: 400 });
  }

  // Validate required items have responses
  const requiredItems = assignment.template.items.filter((item) => item.required);
  const respondedItemIds = new Set(responses.map((r: any) => r.templateItemId));

  const missingRequired = requiredItems.filter((item) => !respondedItemIds.has(item.id));
  if (missingRequired.length > 0) {
    return NextResponse.json(
      {
        error: "Missing responses for required items",
        missingItems: missingRequired.map((i) => ({ id: i.id, label: i.label })),
      },
      { status: 400 }
    );
  }

  const now = new Date();

  const submission = await prisma.$transaction(async (tx) => {
    const created = await tx.checklistSubmission.create({
      data: {
        assignmentId: params.id,
        submittedById: user.id,
        notes: notes || null,
        submittedAt: now,
      },
    });

    if (responses.length > 0) {
      await tx.checklistItemResponse.createMany({
        data: responses.map((r: any) => ({
          submissionId: created.id,
          templateItemId: r.templateItemId,
          value: r.value || null,
          passed: r.passed !== undefined ? r.passed : null,
          photoPath: r.photoPath || null,
        })),
      });
    }

    await tx.checklistAssignment.update({
      where: { id: params.id },
      data: {
        status: "SUBMITTED",
        submittedAt: now,
      },
    });

    return tx.checklistSubmission.findUnique({
      where: { id: created.id },
      include: {
        responses: {
          include: { templateItem: true },
        },
        submittedBy: { select: { id: true, name: true } },
      },
    });
  });

  await writeAuditLog("ChecklistSubmission", submission!.id, "CREATE", user.id, {
    assignmentId: params.id,
    responseCount: responses.length,
  });

  return NextResponse.json(submission, { status: 201 });
}
