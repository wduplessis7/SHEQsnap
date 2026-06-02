import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateReferenceNo, writeAuditLog } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search");
  const isHazardousParam = searchParams.get("isHazardous");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");

  const where: any = { deletedAt: null };

  if (search) {
    where.OR = [
      { productName: { contains: search } },
      { tradeName: { contains: search } },
      { referenceNo: { contains: search } },
    ];
  }

  if (isHazardousParam !== null) {
    where.isHazardous = isHazardousParam === "true";
  }

  const [items, total] = await Promise.all([
    (prisma as any).chemicalItem.findMany({
      where,
      include: {
        addedBy: { select: { id: true, name: true } },
        _count: { select: { components: true, sdsDocuments: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    (prisma as any).chemicalItem.count({ where }),
  ]);

  return NextResponse.json({ items, total, page, limit });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const body = await req.json();

  const referenceNo = await generateReferenceNo("CHEM", "chemicalItem");

  const item = await (prisma as any).chemicalItem.create({
    data: {
      referenceNo,
      productName: body.productName,
      tradeName: body.tradeName || null,
      manufacturer: body.manufacturer || null,
      supplier: body.supplier || null,
      physicalState: body.physicalState || null,
      colour: body.colour || null,
      odour: body.odour || null,
      flashPoint: body.flashPoint || null,
      boilingPoint: body.boilingPoint || null,
      unNumber: body.unNumber || null,
      mhiThreshold: body.mhiThreshold || null,
      mhiQuantityOnSite: body.mhiQuantityOnSite || null,
      isHazardous: body.isHazardous !== undefined ? body.isHazardous : true,
      emergencyContact: body.emergencyContact || null,
      poisonCentre: body.poisonCentre || null,
      notes: body.notes || null,
      addedById: user.id,
    },
    include: {
      addedBy: { select: { id: true, name: true } },
    },
  });

  await writeAuditLog("ChemicalItem", item.id, "CREATE", user.id, { referenceNo });

  return NextResponse.json(item, { status: 201 });
}
