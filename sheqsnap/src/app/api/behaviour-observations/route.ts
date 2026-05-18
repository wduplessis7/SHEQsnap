import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const riskLevel = searchParams.get("riskLevel");
  const safetyCategory = searchParams.get("safetyCategory");
  const location = searchParams.get("location");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const where: Record<string, unknown> = {
    NOT: { status: "DELETED" },
  };
  if (status && status !== "ALL") where.status = status;
  if (riskLevel) where.riskLevel = riskLevel;
  if (safetyCategory) where.safetyCategory = safetyCategory;
  if (location) where.location = { contains: location };
  if (from || to) {
    const dateFilter: Record<string, Date> = {};
    if (from) dateFilter.gte = new Date(from);
    if (to) dateFilter.lte = new Date(to);
    where.observationDate = dateFilter;
  }

  const items = await prisma.behaviourObservation.findMany({
    where,
    include: {
      actions: true,
      _count: { select: { actions: true, evidence: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as { id?: string; name?: string };
  const body = await req.json();

  const {
    actions: actionsPayload,
    safeBehaviours,
    unsafeBehaviours,
    rootCauses,
    ...observationFields
  } = body;

  const observation = await prisma.behaviourObservation.create({
    data: {
      observationDate: new Date(observationFields.observationDate),
      location: observationFields.location,
      site: observationFields.site || null,
      shaft: observationFields.shaft || null,
      plant: observationFields.plant || null,
      observerName: observationFields.observerName,
      observerDepartment: observationFields.observerDepartment || null,
      observerId: user.id || null,
      teamObserved: observationFields.teamObserved || null,
      contractorObserved: observationFields.contractorObserved || null,
      employeeObserved: observationFields.employeeObserved || null,
      workType: observationFields.workType,
      taskDescription: observationFields.taskDescription,
      workContext: observationFields.workContext || null,
      safeBehaviours: Array.isArray(safeBehaviours) ? JSON.stringify(safeBehaviours) : null,
      unsafeBehaviours: Array.isArray(unsafeBehaviours) ? JSON.stringify(unsafeBehaviours) : null,
      hazardsPresent: observationFields.hazardsPresent || null,
      potentialConsequences: observationFields.potentialConsequences || null,
      riskLevel: observationFields.riskLevel || null,
      likelihoodScore: observationFields.likelihoodScore ? Number(observationFields.likelihoodScore) : null,
      impactScore: observationFields.impactScore ? Number(observationFields.impactScore) : null,
      riskScore: observationFields.riskScore ? Number(observationFields.riskScore) : null,
      immediateActionTaken: observationFields.immediateActionTaken || null,
      workStopped: Boolean(observationFields.workStopped),
      supervisorNotified: Boolean(observationFields.supervisorNotified),
      rootCauses: Array.isArray(rootCauses) ? JSON.stringify(rootCauses) : null,
      workerEngaged: Boolean(observationFields.workerEngaged),
      workerFeedback: observationFields.workerFeedback || null,
      safetyCategory: observationFields.safetyCategory || null,
      behaviourType: observationFields.behaviourType || null,
      status: "OPEN",
      createdById: user.id || null,
      actions: {
        create: Array.isArray(actionsPayload)
          ? actionsPayload.map((a: { description: string; responsiblePerson: string; dueDate: string; status?: string }) => ({
              description: a.description,
              responsiblePerson: a.responsiblePerson,
              dueDate: new Date(a.dueDate),
              status: a.status || "OPEN",
            }))
          : [],
      },
    },
    include: { actions: true, evidence: true },
  });

  return NextResponse.json(observation, { status: 201 });
}
