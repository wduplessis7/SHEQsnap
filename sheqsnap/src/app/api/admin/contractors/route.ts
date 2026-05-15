import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const allowedRoles: Role[] = [Role.ADMIN, Role.MANAGER, Role.SAFETY_OFFICER];
  if (!allowedRoles.includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const contractors = await prisma.user.findMany({
    where: { role: Role.CONTRACTOR },
    include: {
      department: { select: { id: true, name: true } },
      company: { select: { id: true, name: true } },
      responsiblePerson: { select: { id: true, name: true, email: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(
    contractors.map((u) => ({ ...u, password: undefined }))
  );
}
