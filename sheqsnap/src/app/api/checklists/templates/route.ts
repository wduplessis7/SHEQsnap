import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const canManage = ["SAFETY_OFFICER", "MANAGER", "ADMIN"].includes(user.role);
  if (!canManage) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search");
  const isActive = searchParams.get("isActive");
  const category = searchParams.get("category");

  const where: any = {};
  if (search) {
    where.OR = [
      { title: { contains: search } },
      { description: { contains: search } },
    ];
  }
  if (isActive !== null && isActive !== undefined) {
    where.isActive = isActive === "true";
  }
  if (category) where.category = category;

  const [items, total] = await Promise.all([
    prisma.checklistTemplate.findMany({
      where,
      include: {
        _count: { select: { items: true } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.checklistTemplate.count({ where }),
  ]);

  return NextResponse.json({ items, total });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const isAdmin = user.role === "ADMIN";
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { title, description, category, items } = body;

  if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });

  const template = await prisma.$transaction(async (tx) => {
    const created = await tx.checklistTemplate.create({
      data: {
        title,
        description: description || null,
        category: category || "General",
        createdById: user.id,
      },
    });

    if (items && items.length > 0) {
      await tx.checklistTemplateItem.createMany({
        data: items.map((item: any) => ({
          templateId: created.id,
          label: item.label,
          type: item.type || "CHECKBOX",
          required: item.required !== undefined ? item.required : true,
          description: item.description || null,
          order: item.order,
        })),
      });
    }

    return tx.checklistTemplate.findUnique({
      where: { id: created.id },
      include: { items: { orderBy: { order: "asc" } } },
    });
  });

  await writeAuditLog("ChecklistTemplate", template!.id, "CREATE", user.id, { title, category });

  return NextResponse.json(template, { status: 201 });
}
