import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const canManage = ["MANAGER", "ADMIN"].includes(user.role);

  const submission = await prisma.checklistSubmission.findUnique({
    where: { id: params.id },
    include: {
      responses: {
        include: {
          templateItem: {
            select: { id: true, label: true, type: true, required: true, description: true, order: true },
          },
        },
        orderBy: { templateItem: { order: "asc" } },
      },
      submittedBy: { select: { id: true, name: true, email: true } },
      assignment: {
        include: {
          template: { select: { id: true, title: true, category: true } },
          schedule: { select: { id: true, recurrence: true } },
        },
      },
    },
  });

  if (!submission) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!canManage && submission.submittedById !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(submission);
}
