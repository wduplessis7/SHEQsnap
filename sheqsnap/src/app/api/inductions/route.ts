import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function computeStatus(expiryDate: Date | null): string {
  if (!expiryDate) return "current";
  const now = new Date();
  const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  if (expiryDate < now) return "expired";
  if (expiryDate <= thirtyDays) return "expiring_soon";
  return "current";
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const inducteeType = searchParams.get("inducteeType");
  const recordType = searchParams.get("recordType");
  const search = searchParams.get("search");

  const where: any = {};
  if (status) where.status = status;
  if (inducteeType) where.inducteeType = inducteeType;
  if (recordType) where.recordType = recordType;
  if (search) {
    where.OR = [
      { inducteeName: { contains: search } },
      { inductionType: { contains: search } },
      { conductedByName: { contains: search } },
      { medicalProvider: { contains: search } },
    ];
  }

  try {
    const inductions = await prisma.induction.findMany({
      where,
      orderBy: { conductedDate: "desc" },
    });

    return NextResponse.json(inductions);
  } catch (err) {
    console.error("[inductions GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  if (!body.inducteeName || !body.inducteeType || !body.inductionType || !body.conductedDate || !body.conductedByName) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const conductedDate = new Date(body.conductedDate);
  let expiryDate: Date | null = null;
  if (body.expiryDate) {
    expiryDate = new Date(body.expiryDate);
  } else if (body.validityMonths) {
    expiryDate = new Date(conductedDate);
    expiryDate.setMonth(expiryDate.getMonth() + Number(body.validityMonths));
  }

  const tempId = Math.random().toString(36).slice(2, 8).toUpperCase();
  const recordType = body.recordType === "medical" ? "medical" : "induction";
  const referenceNo = `${recordType === "medical" ? "MED" : "IND"}-${tempId}`;

  try {
    const induction = await prisma.induction.create({
      data: {
        referenceNo,
        recordType,
        inducteeName: body.inducteeName,
        inducteeType: body.inducteeType,
        inducteeId: body.inducteeId || null,
        inductionType: body.inductionType,
        conductedByName: body.conductedByName,
        conductedById: body.conductedById || null,
        conductedDate,
        expiryDate,
        validityMonths: body.validityMonths ? Number(body.validityMonths) : null,
        status: computeStatus(expiryDate),
        medicalResult: recordType === "medical" ? (body.medicalResult || null) : null,
        medicalProvider: recordType === "medical" ? (body.medicalProvider || null) : null,
        departmentId: body.departmentId || null,
        notes: body.notes || null,
        createdById: (session.user as any)?.id || null,
      },
    });

    return NextResponse.json(induction, { status: 201 });
  } catch (err) {
    console.error("[inductions POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
