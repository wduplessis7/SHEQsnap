import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/utils";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const canManage = ["SAFETY_OFFICER", "MANAGER", "ADMIN"].includes(user.role);
  if (!canManage) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const template = await prisma.checklistTemplate.findUnique({
    where: { id: params.id },
    include: {
      items: { orderBy: { order: "asc" } },
      createdBy: { select: { id: true, name: true } },
    },
  });

  if (!template) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(template);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const isAdmin = user.role === "ADMIN";
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { title, description, category, isActive, items } = body;

  const existing = await prisma.checklistTemplate.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const template = await prisma.$transaction(async (tx) => {
    const updated = await tx.checklistTemplate.update({
      where: { id: params.id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(category !== undefined && { category }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    if (items !== undefined) {
      await tx.checklistTemplateItem.deleteMany({ where: { templateId: params.id } });
      if (items.length > 0) {
        await tx.checklistTemplateItem.createMany({
          data: items.map((item: any) => ({
            templateId: params.id,
            label: item.label,
            type: item.type || "CHECKBOX",
            required: item.required !== undefined ? item.required : true,
            description: item.description || null,
            order: item.order,
          })),
        });
      }
    }

    return tx.checklistTemplate.findUnique({
      where: { id: params.id },
      include: { items: { orderBy: { order: "asc" } } },
    });
  });

  await writeAuditLog("ChecklistTemplate", params.id, "UPDATE", user.id, { title, category, isActive });

  return NextResponse.json(template);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const isAdmin = user.role === "ADMIN";
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const existing = await prisma.checklistTemplate.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.checklistTemplate.update({
    where: { id: params.id },
    data: { isActive: false },
  });

  await writeAuditLog("ChecklistTemplate", params.id, "DELETE", user.id, { isActive: false });

  return NextResponse.json({ success: true });
}
