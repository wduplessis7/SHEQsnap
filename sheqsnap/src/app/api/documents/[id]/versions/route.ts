import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DocStatus } from "@prisma/client";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const versions = await prisma.docVersion.findMany({
    where: { documentId: params.id },
    orderBy: { createdAt: "desc" },
    include: {
      author: { select: { id: true, name: true } },
      workflowSteps: {
        orderBy: { stepOrder: "asc" },
        include: {
          assignedUser: { select: { id: true, name: true } },
          completedBy: { select: { id: true, name: true } },
        },
      },
      _count: { select: { comments: true } },
    },
  });

  return NextResponse.json(versions);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const allowed = ["SAFETY_OFFICER", "MANAGER", "ADMIN"];
  if (!allowed.includes(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const doc = await prisma.document.findUnique({
    where: { id: params.id },
    include: {
      versions: { where: { status: { in: [DocStatus.PUBLISHED, DocStatus.APPROVED] } }, orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { changeNotes, isMajor } = body;

  // Derive next version number from last published
  const lastPublished = doc.versions[0];
  let major = lastPublished ? lastPublished.majorVersion : 1;
  let minor = lastPublished ? lastPublished.minorVersion : 0;
  if (!lastPublished) {
    major = 1; minor = 0;
  } else if (isMajor) {
    major = major + 1; minor = 0;
  } else {
    minor = minor + 1;
  }

  const versionNumber = `${major}.${minor}-draft`;

  const version = await prisma.docVersion.create({
    data: {
      documentId: params.id,
      versionNumber,
      majorVersion: major,
      minorVersion: minor,
      isDraft: true,
      content: lastPublished?.content ?? JSON.stringify({ type: "doc", content: [] }),
      changeNotes: changeNotes || null,
      authorId: user.id,
      status: DocStatus.DRAFT,
    },
  });

  // Copy workflow steps from doc type default
  const steps = getDefaultWorkflow(doc.type);
  await prisma.docWorkflowStep.createMany({
    data: steps.map((s, i) => ({
      docVersionId: version.id,
      stepOrder: i + 1,
      action: s.action as any,
      assignedRole: s.role,
    })),
  });

  return NextResponse.json(version, { status: 201 });
}

function getDefaultWorkflow(type: string) {
  if (type === "ONE_PAGER") return [{ action: "APPROVE", role: "SAFETY_OFFICER" }];
  if (type === "PROCEDURE") return [{ action: "REVIEW", role: "SAFETY_OFFICER" }, { action: "APPROVE", role: "MANAGER" }];
  return [{ action: "REVIEW", role: "SAFETY_OFFICER" }, { action: "REVIEW", role: "MANAGER" }, { action: "APPROVE", role: "ADMIN" }];
}
