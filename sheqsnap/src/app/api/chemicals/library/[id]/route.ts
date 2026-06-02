import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const entry = await (prisma as any).chemicalLibrary.findUnique({
    where: { id: params.id },
    include: {
      _count: { select: { usedInItems: true } },
    },
  });

  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(entry);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  if (user.role !== Role.ADMIN && user.role !== "SAFETY_OFFICER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();

  const existing = await (prisma as any).chemicalLibrary.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updateData: any = {};

  if (body.name !== undefined) updateData.name = body.name;
  if (body.casNumber !== undefined) updateData.casNumber = body.casNumber;
  if (body.formula !== undefined) updateData.formula = body.formula;
  if (body.ghsPictograms !== undefined) updateData.ghsPictograms = JSON.stringify(body.ghsPictograms);
  if (body.hazardClass !== undefined) updateData.hazardClass = body.hazardClass;
  if (body.signalWord !== undefined) updateData.signalWord = body.signalWord;
  if (body.hazardStatements !== undefined) updateData.hazardStatements = JSON.stringify(body.hazardStatements);
  if (body.precautionaryStatements !== undefined) updateData.precautionaryStatements = JSON.stringify(body.precautionaryStatements);
  if (body.pubchemCid !== undefined) updateData.pubchemCid = body.pubchemCid;

  const updated = await (prisma as any).chemicalLibrary.update({
    where: { id: params.id },
    data: updateData,
  });

  return NextResponse.json(updated);
}
