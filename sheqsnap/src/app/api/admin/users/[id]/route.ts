import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const currentUser = session.user as any;
  if (currentUser.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const body = await req.json();
  const updateData: any = {
    name: body.name,
    email: body.email,
    role: body.role,
    departmentId: body.departmentId || null,
    active: body.active,
  };

  if (body.password) {
    updateData.password = await bcrypt.hash(body.password, 12);
  }

  const updated = await prisma.user.update({
    where: { id: params.id },
    data: updateData,
    include: { department: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ ...updated, password: undefined });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const currentUser = session.user as any;
  if (currentUser.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  // Soft delete - deactivate instead of deleting
  await prisma.user.update({
    where: { id: params.id },
    data: { active: false },
  });

  return NextResponse.json({ success: true });
}
