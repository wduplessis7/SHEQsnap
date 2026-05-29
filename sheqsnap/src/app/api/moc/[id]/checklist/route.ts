import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const response = await prisma.mocChecklistResponse.findUnique({
    where: { changeRequestId: params.id },
    include: {
      template: { include: { items: { orderBy: { order: "asc" } } } },
      items: true,
    },
  });

  return NextResponse.json(response);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  // body: { templateId: string, items: { itemId: string, value?: string, passed?: boolean }[], completed: boolean }

  // Delete existing response if templateId changed
  const existing = await prisma.mocChecklistResponse.findUnique({ where: { changeRequestId: params.id } });
  if (existing && existing.templateId !== body.templateId) {
    await prisma.mocChecklistResponse.delete({ where: { changeRequestId: params.id } });
  }

  const response = await prisma.mocChecklistResponse.upsert({
    where: { changeRequestId: params.id },
    create: {
      changeRequestId: params.id,
      templateId: body.templateId,
      completedAt: body.completed ? new Date() : null,
    },
    update: {
      templateId: body.templateId,
      completedAt: body.completed ? new Date() : null,
    },
  });

  // Delete and re-create items
  await prisma.mocChecklistItem.deleteMany({ where: { responseId: response.id } });
  if (body.items && body.items.length > 0) {
    await prisma.mocChecklistItem.createMany({
      data: body.items.map((item: any) => ({
        responseId: response.id,
        itemId: item.itemId,
        value: item.value ?? null,
        passed: item.passed ?? null,
      })),
    });
  }

  // Update ChangeRequest checklistCompleted and checklistTemplateId
  await prisma.changeRequest.update({
    where: { id: params.id },
    data: {
      checklistTemplateId: body.templateId,
      checklistCompleted: !!body.completed,
    },
  });

  return NextResponse.json({ success: true });
}
