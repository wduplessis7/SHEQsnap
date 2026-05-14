import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const body = await req.json();

  if (!body.body?.trim()) {
    return NextResponse.json({ error: "Comment body is required" }, { status: 400 });
  }

  const comment = await prisma.comment.create({
    data: {
      body: body.body.trim(),
      authorId: user.id,
      nearMissId: body.nearMissId || null,
      incidentId: body.incidentId || null,
      actionId: body.actionId || null,
    },
    include: {
      author: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(comment, { status: 201 });
}
