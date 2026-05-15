import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/utils";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const isAdmin = user.role === "ADMIN";
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const source = await prisma.checklistTemplate.findUnique({
    where: { id: params.id },
    include: { items: { orderBy: { order: "asc" } } },
  });

  if (!source) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const newTemplate = await prisma.$transaction(async (tx) => {
    const created = await tx.checklistTemplate.create({
      data: {
        title: `${source.title} (Copy)`,
        description: source.description,
        category: source.category,
        isActive: source.isActive,
        createdById: user.id,
      },
    });

    if (source.items.length > 0) {
      await tx.checklistTemplateItem.createMany({
        data: source.items.map((item) => ({
          templateId: created.id,
          label: item.label,
          type: item.type,
          required: item.required,
          description: item.description,
          order: item.order,
        })),
      });
    }

    return tx.checklistTemplate.findUnique({
      where: { id: created.id },
      include: { items: { orderBy: { order: "asc" } } },
    });
  });

  await writeAuditLog("ChecklistTemplate", newTemplate!.id, "CREATE", user.id, {
    duplicatedFrom: params.id,
    title: newTemplate!.title,
  });

  return NextResponse.json(newTemplate, { status: 201 });
}
