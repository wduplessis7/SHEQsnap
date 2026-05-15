import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const canManage = ["MANAGER", "ADMIN"].includes(user.role);

  const assignment = await prisma.checklistAssignment.findUnique({
    where: { id: params.id },
    include: {
      template: {
        include: {
          items: { orderBy: { order: "asc" } },
        },
      },
      assignedToUser: { select: { id: true, name: true, email: true } },
      schedule: { select: { id: true, recurrence: true, dueTime: true } },
      submission: {
        include: {
          responses: {
            include: {
              templateItem: true,
            },
          },
          submittedBy: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!assignment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!canManage && assignment.assignedToUserId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(assignment);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;

  const assignment = await prisma.checklistAssignment.findUnique({
    where: { id: params.id },
  });

  if (!assignment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (assignment.assignedToUserId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updated = await prisma.checklistAssignment.update({
    where: { id: params.id },
    data: { status: "IN_PROGRESS" },
  });

  return NextResponse.json(updated);
}
