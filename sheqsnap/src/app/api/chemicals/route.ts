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
      { name: { contains: search } },
      { tradeName: { contains: search } },
      { casNumber: { contains: search } },
      { referenceNo: { contains: search } },
    ];
  }

  if (isHazardousParam !== null) {
    where.isHazardous = isHazardousParam === "true";
  }

  const [items, total] = await Promise.all([
    (prisma as any).chemical.findMany({
      where,
      include: {
        addedBy: { select: { id: true, name: true } },
        _count: { select: { sdsDocuments: true, locations: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    (prisma as any).chemical.count({ where }),
  ]);

  return NextResponse.json({ items, total, page, limit });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const body = await req.json();

  const referenceNo = await generateReferenceNo("CHEM", "chemical");

  const chemical = await (prisma as any).chemical.create({
    data: {
      referenceNo,
      name: body.name,
      tradeName: body.tradeName || null,
      casNumber: body.casNumber || null,
      formula: body.formula || null,
      manufacturer: body.manufacturer || null,
      supplier: body.supplier || null,
      ghsPictograms: body.ghsPictograms ? JSON.stringify(body.ghsPictograms) : "[]",
      hazardClass: body.hazardClass || null,
      signalWord: body.signalWord || null,
      hazardStatements: body.hazardStatements ? JSON.stringify(body.hazardStatements) : "[]",
      precautionaryStatements: body.precautionaryStatements ? JSON.stringify(body.precautionaryStatements) : "[]",
      flashPoint: body.flashPoint || null,
      boilingPoint: body.boilingPoint || null,
      physicalState: body.physicalState || null,
      colour: body.colour || null,
      odour: body.odour || null,
      isHazardous: body.isHazardous !== undefined ? body.isHazardous : true,
      unNumber: body.unNumber || null,
      mhiThreshold: body.mhiThreshold || null,
      mhiQuantityOnSite: body.mhiQuantityOnSite || null,
      pubchemCid: body.pubchemCid || null,
      emergencyContact: body.emergencyContact || null,
      poisonCentre: body.poisonCentre || null,
      notes: body.notes || null,
      addedById: user.id,
    },
    include: {
      addedBy: { select: { id: true, name: true } },
    },
  });

  await writeAuditLog("Chemical", chemical.id, "CREATE", user.id, { referenceNo });

  return NextResponse.json(chemical, { status: 201 });
}
