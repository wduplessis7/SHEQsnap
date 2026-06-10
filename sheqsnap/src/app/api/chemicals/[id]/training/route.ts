import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const trainings = await prisma.chemicalTraining.findMany({
    where: { chemicalItemId: params.id },
    include: { attendees: true },
    orderBy: { trainingDate: "desc" },
  });

  return NextResponse.json(trainings);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const body = await req.json();

  const { trainingDate, trainerName, location, duration, notes, attendees } = body;

  if (!trainingDate || !trainerName) {
    return NextResponse.json({ error: "trainingDate and trainerName are required" }, { status: 400 });
  }

  const chemical = await prisma.chemicalItem.findUnique({ where: { id: params.id } });
  if (!chemical) return NextResponse.json({ error: "Chemical not found" }, { status: 404 });

  const training = await prisma.chemicalTraining.create({
    data: {
      chemicalItemId: params.id,
      trainingDate: new Date(trainingDate),
      trainerName,
      location: location || null,
      duration: duration || null,
      notes: notes || null,
      createdById: user.id,
      attendees: {
        create: (attendees || []).map((a: any) => ({
          attendeeName: a.attendeeName,
          attendeeType: a.attendeeType || "employee",
        })),
      },
    },
    include: { attendees: true },
  });

  return NextResponse.json(training, { status: 201 });
}
