import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; actionId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  const data: Record<string, unknown> = {};
  if (body.status !== undefined) data.status = body.status;
  if (body.closedNote !== undefined) data.closedNote = body.closedNote;
  if (body.description !== undefined) data.description = body.description;
  if (body.responsiblePerson !== undefined) data.responsiblePerson = body.responsiblePerson;
  if (body.dueDate !== undefined) data.dueDate = new Date(body.dueDate);

  if (body.status === "CLOSED" && !body.closedAt) {
    data.closedAt = new Date();
  } else if (body.closedAt) {
    data.closedAt = new Date(body.closedAt);
  }

  const action = await prisma.behaviourAction.update({
    where: { id: params.actionId },
    data,
  });

  return NextResponse.json(action);
}
