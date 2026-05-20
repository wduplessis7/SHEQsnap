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

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const induction = await prisma.induction.findUnique({ where: { id: params.id } });
  if (!induction) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(induction);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const conductedDate = body.conductedDate ? new Date(body.conductedDate) : undefined;
  let expiryDate: Date | null = null;
  if (body.expiryDate) {
    expiryDate = new Date(body.expiryDate);
  } else if (body.validityMonths && conductedDate) {
    expiryDate = new Date(conductedDate);
    expiryDate.setMonth(expiryDate.getMonth() + Number(body.validityMonths));
  }

  const updated = await prisma.induction.update({
    where: { id: params.id },
    data: {
      inducteeName: body.inducteeName,
      inducteeType: body.inducteeType,
      inductionType: body.inductionType,
      conductedByName: body.conductedByName,
      conductedDate,
      expiryDate,
      validityMonths: body.validityMonths ? Number(body.validityMonths) : null,
      status: computeStatus(expiryDate),
      departmentId: body.departmentId || null,
      notes: body.notes || null,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await prisma.induction.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
