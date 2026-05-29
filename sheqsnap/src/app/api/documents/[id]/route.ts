import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/utils";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const doc = await prisma.document.findUnique({
    where: { id: params.id },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      versions: {
        orderBy: { createdAt: "desc" },
        include: {
          author: { select: { id: true, name: true } },
          workflowSteps: {
            orderBy: { stepOrder: "asc" },
            include: {
              assignedUser: { select: { id: true, name: true } },
              completedBy: { select: { id: true, name: true } },
            },
          },
          _count: { select: { comments: true } },
        },
      },
      _count: { select: { acknowledgements: true } },
    },
  });

  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(doc);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const allowed = ["SAFETY_OFFICER", "MANAGER", "ADMIN"];
  if (!allowed.includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { title, description, category, tags, reviewInterval, nextReviewDate } = body;

  const doc = await prisma.document.update({
    where: { id: params.id },
    data: {
      ...(title       !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(category    !== undefined && { category }),
      ...(tags        !== undefined && { tags }),
      ...(reviewInterval !== undefined && { reviewInterval: reviewInterval ? parseInt(reviewInterval) : null }),
      ...(nextReviewDate !== undefined && { nextReviewDate: nextReviewDate ? new Date(nextReviewDate) : null }),
    },
  });

  await writeAuditLog("Document", doc.id, "UPDATE", user.id, body);

  return NextResponse.json(doc);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.document.update({
    where: { id: params.id },
    data: { status: "ARCHIVED" },
  });

  await writeAuditLog("Document", params.id, "ARCHIVE", user.id, {});

  return NextResponse.json({ ok: true });
}
