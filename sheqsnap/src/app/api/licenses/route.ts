import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const holderType = searchParams.get("holderType");
  const status = searchParams.get("status");
  const search = searchParams.get("search");

  const where: any = {};
  if (holderType) where.holderType = holderType;
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { holderName: { contains: search } },
      { licenseType: { contains: search } },
      { licenseNumber: { contains: search } },
    ];
  }

  const licenses = await prisma.license.findMany({
    where,
    orderBy: { expiryDate: "asc" },
  });

  return NextResponse.json(licenses);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  if (!body.holderName || !body.holderType || !body.licenseType || !body.expiryDate) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const expiryDate = new Date(body.expiryDate);
  const now = new Date();
  const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  let status = "active";
  if (expiryDate < now) {
    status = "expired";
  } else if (expiryDate <= thirtyDays) {
    status = "expiring_soon";
  }

  const license = await prisma.license.create({
    data: {
      holderName: body.holderName,
      holderType: body.holderType,
      licenseType: body.licenseType,
      licenseNumber: body.licenseNumber || null,
      issuedDate: body.issuedDate ? new Date(body.issuedDate) : null,
      expiryDate,
      status,
      notes: body.notes || null,
    },
  });

  return NextResponse.json(license, { status: 201 });
}
