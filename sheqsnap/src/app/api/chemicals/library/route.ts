import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search");

  const where: any = {};

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { casNumber: { contains: search } },
    ];
  }

  const entries = await (prisma as any).chemicalLibrary.findMany({
    where,
    orderBy: { name: "asc" },
  });

  return NextResponse.json(entries);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;

  if (user.role !== Role.ADMIN && user.role !== Role.SAFETY_OFFICER) {
    return NextResponse.json({ error: "Admin or Safety Officer only" }, { status: 403 });
  }

  const body = await req.json();

  const entry = await (prisma as any).chemicalLibrary.create({
    data: {
      name: body.name,
      casNumber: body.casNumber || null,
      formula: body.formula || null,
      ghsPictograms: JSON.stringify(body.ghsPictograms || []),
      hazardClass: body.hazardClass || null,
      signalWord: body.signalWord || null,
      hazardStatements: JSON.stringify(body.hazardStatements || []),
      precautionaryStatements: JSON.stringify(body.precautionaryStatements || []),
      pubchemCid: body.pubchemCid || null,
    },
  });

  return NextResponse.json(entry, { status: 201 });
}
