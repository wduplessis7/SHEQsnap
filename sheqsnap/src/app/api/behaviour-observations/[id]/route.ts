import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const observation = await prisma.behaviourObservation.findUnique({
    where: { id: params.id },
    include: { actions: true, evidence: true },
  });

  if (!observation) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (observation.status === "DELETED") return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(observation);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  const {
    actions: _actions,
    evidence: _evidence,
    safeBehaviours,
    unsafeBehaviours,
    rootCauses,
    ...fields
  } = body;

  const observation = await prisma.behaviourObservation.update({
    where: { id: params.id },
    data: {
      observationDate: fields.observationDate ? new Date(fields.observationDate) : undefined,
      location: fields.location,
      site: fields.site || null,
      shaft: fields.shaft || null,
      plant: fields.plant || null,
      observerName: fields.observerName,
      observerDepartment: fields.observerDepartment || null,
      teamObserved: fields.teamObserved || null,
      contractorObserved: fields.contractorObserved || null,
      employeeObserved: fields.employeeObserved || null,
      workType: fields.workType,
      taskDescription: fields.taskDescription,
      workContext: fields.workContext || null,
      safeBehaviours: Array.isArray(safeBehaviours) ? JSON.stringify(safeBehaviours) : null,
      unsafeBehaviours: Array.isArray(unsafeBehaviours) ? JSON.stringify(unsafeBehaviours) : null,
      hazardsPresent: fields.hazardsPresent || null,
      potentialConsequences: fields.potentialConsequences || null,
      riskLevel: fields.riskLevel || null,
      likelihoodScore: fields.likelihoodScore ? Number(fields.likelihoodScore) : null,
      impactScore: fields.impactScore ? Number(fields.impactScore) : null,
      riskScore: fields.riskScore ? Number(fields.riskScore) : null,
      immediateActionTaken: fields.immediateActionTaken || null,
      workStopped: Boolean(fields.workStopped),
      supervisorNotified: Boolean(fields.supervisorNotified),
      rootCauses: Array.isArray(rootCauses) ? JSON.stringify(rootCauses) : null,
      workerEngaged: Boolean(fields.workerEngaged),
      workerFeedback: fields.workerFeedback || null,
      safetyCategory: fields.safetyCategory || null,
      behaviourType: fields.behaviourType || null,
      status: fields.status || undefined,
    },
    include: { actions: true, evidence: true },
  });

  return NextResponse.json(observation);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.behaviourObservation.update({
    where: { id: params.id },
    data: { status: "DELETED" },
  });

  return NextResponse.json({ success: true });
}
