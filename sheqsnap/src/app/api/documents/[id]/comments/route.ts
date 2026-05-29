import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const vid = searchParams.get("versionId");

  const comments = await prisma.docComment.findMany({
    where: {
      docVersion: { documentId: params.id },
      ...(vid && { docVersionId: vid }),
      parentId: null,
    },
    orderBy: { createdAt: "asc" },
    include: {
      author: { select: { id: true, name: true } },
      replies: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { id: true, name: true } } },
      },
    },
  });

  return NextResponse.json(comments);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const body = await req.json();
  const { docVersionId, content, parentId, isReviewNote } = body;

  if (!docVersionId || !content) {
    return NextResponse.json({ error: "docVersionId and content are required" }, { status: 400 });
  }

  const comment = await prisma.docComment.create({
    data: {
      docVersionId,
      authorId: user.id,
      content,
      parentId: parentId || null,
      isReviewNote: isReviewNote ?? false,
    },
    include: {
      author: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(comment, { status: 201 });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const body = await req.json();
  const { commentId, resolved } = body;

  const comment = await prisma.docComment.findUnique({ where: { id: commentId } });
  if (!comment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.docComment.update({
    where: { id: commentId },
    data: {
      resolvedAt: resolved ? new Date() : null,
      resolvedById: resolved ? user.id : null,
    },
  });

  return NextResponse.json(updated);
}
