import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: { id: string; vid: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const version = await prisma.docVersion.findFirst({
    where: { id: params.vid, documentId: params.id },
    include: {
      author: { select: { id: true, name: true } },
      workflowSteps: {
        orderBy: { stepOrder: "asc" },
        include: {
          assignedUser: { select: { id: true, name: true } },
          completedBy: { select: { id: true, name: true } },
        },
      },
      comments: {
        where: { parentId: null },
        orderBy: { createdAt: "asc" },
        include: {
          author: { select: { id: true, name: true } },
          replies: {
            orderBy: { createdAt: "asc" },
            include: { author: { select: { id: true, name: true } } },
          },
        },
      },
    },
  });

  if (!version) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(version);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string; vid: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const version = await prisma.docVersion.findFirst({ where: { id: params.vid, documentId: params.id } });
  if (!version) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (version.status !== "DRAFT") {
    return NextResponse.json({ error: "Only draft versions can be edited" }, { status: 400 });
  }

  const body = await req.json();
  const { content, changeNotes } = body;

  const updated = await prisma.docVersion.update({
    where: { id: params.vid },
    data: {
      ...(content     !== undefined && { content }),
      ...(changeNotes !== undefined && { changeNotes }),
    },
  });

  return NextResponse.json(updated);
}
