import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;

  const progress = await prisma.onboardingProgress.findUnique({
    where: { userId },
  });

  return NextResponse.json(progress ?? null);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;

  const body = await req.json();
  const { completedSteps, completed } = body as {
    completedSteps: string[];
    completed?: boolean;
  };

  const progress = await prisma.onboardingProgress.upsert({
    where: { userId },
    create: {
      userId,
      completedSteps: JSON.stringify(completedSteps),
      completedAt: completed ? new Date() : null,
    },
    update: {
      completedSteps: JSON.stringify(completedSteps),
      ...(completed ? { completedAt: new Date() } : {}),
    },
  });

  return NextResponse.json(progress);
}
