import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const templates = await prisma.checklistTemplate.findMany({
    where: { category: "MOC", isActive: true },
    include: { items: { orderBy: { order: "asc" } } },
    orderBy: { title: "asc" },
  });

  return NextResponse.json(templates);
}
