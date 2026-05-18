import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  if (!body.description || !body.responsiblePerson || !body.dueDate) {
    return NextResponse.json({ error: "description, responsiblePerson and dueDate are required" }, { status: 400 });
  }

  const action = await prisma.behaviourAction.create({
    data: {
      observationId: params.id,
      description: body.description,
      responsiblePerson: body.responsiblePerson,
      dueDate: new Date(body.dueDate),
      status: body.status || "OPEN",
    },
  });

  return NextResponse.json(action, { status: 201 });
}
