import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const currentUser = session.user as any;
  if (currentUser.role !== Role.ADMIN) return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const body = await req.json();
  const updated = await prisma.group.update({
    where: { id: params.id },
    data: { name: body.name, description: body.description || null },
  });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const currentUser = session.user as any;
  if (currentUser.role !== Role.ADMIN) return NextResponse.json({ error: "Admin only" }, { status: 403 });

  await prisma.group.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  // Add member to group
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const currentUser = session.user as any;
  if (currentUser.role !== Role.ADMIN) return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const body = await req.json();
  await prisma.userGroup.upsert({
    where: { userId_groupId: { userId: body.userId, groupId: params.id } },
    create: { userId: body.userId, groupId: params.id },
    update: {},
  });
  return NextResponse.json({ success: true });
}
