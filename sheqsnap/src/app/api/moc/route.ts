import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const changeType = searchParams.get("changeType");
  const search = searchParams.get("search");

  const where: any = {};
  if (status) where.status = status;
  if (changeType) where.changeType = changeType;
  if (search) {
    where.OR = [
      { title: { contains: search } },
      { description: { contains: search } },
      { requestedByName: { contains: search } },
      { referenceNo: { contains: search } },
    ];
  }

  const changes = await prisma.changeRequest.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(changes);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  if (!body.title || !body.changeType || !body.description || !body.reason) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const tempId = Math.random().toString(36).slice(2, 8).toUpperCase();
  const referenceNo = `MOC-${tempId}`;

  const change = await prisma.changeRequest.create({
    data: {
      referenceNo,
      title: body.title,
      changeType: body.changeType,
      description: body.description,
      reason: body.reason,
      riskAssessment: body.riskAssessment || null,
      affectedAreas: body.affectedAreas || null,
      proposedDate: body.proposedDate ? new Date(body.proposedDate) : null,
      implementationDate: body.implementationDate ? new Date(body.implementationDate) : null,
      reviewDate: body.reviewDate ? new Date(body.reviewDate) : null,
      status: body.status || "draft",
      requestedByName: body.requestedByName || (session.user as any)?.name || "Unknown",
      requestedById: (session.user as any)?.id || null,
    },
  });

  return NextResponse.json(change, { status: 201 });
}
