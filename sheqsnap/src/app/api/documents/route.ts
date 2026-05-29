import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/utils";
import { DocType, DocStatus } from "@prisma/client";

async function generateDocNumber(type: DocType): Promise<string> {
  const prefix = type === "POLICY" ? "POL" : type === "PROCEDURE" ? "PRO" : "OPG";
  const year = new Date().getFullYear();
  const count = await prisma.document.count({ where: { type, docNumber: { startsWith: `${prefix}-${year}-` } } });
  return `${prefix}-${year}-${String(count + 1).padStart(3, "0")}`;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type     = searchParams.get("type");
  const status   = searchParams.get("status");
  const category = searchParams.get("category");
  const search   = searchParams.get("search");
  const page     = parseInt(searchParams.get("page") || "1");
  const limit    = parseInt(searchParams.get("limit") || "20");

  const where: any = {};
  if (type)   where.type   = type as DocType;
  if (status) where.status = status as DocStatus;
  if (category) where.category = category;
  if (search) {
    where.OR = [
      { title:     { contains: search } },
      { docNumber: { contains: search } },
      { category:  { contains: search } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.document.findMany({
      where,
      include: {
        owner: { select: { id: true, name: true } },
        versions: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true, versionNumber: true, status: true, updatedAt: true,
            author: { select: { id: true, name: true } },
          },
        },
        _count: { select: { versions: true, acknowledgements: true } },
      },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.document.count({ where }),
  ]);

  return NextResponse.json({ items, total, page, limit });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const allowed = ["SAFETY_OFFICER", "MANAGER", "ADMIN"];
  if (!allowed.includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { title, type, description, category, tags, reviewInterval } = body;

  if (!title || !type) {
    return NextResponse.json({ error: "title and type are required" }, { status: 400 });
  }

  const docNumber = await generateDocNumber(type as DocType);

  const doc = await prisma.document.create({
    data: {
      docNumber,
      type: type as DocType,
      title,
      description: description || null,
      category: category || null,
      tags: tags || null,
      ownerId: user.id,
      status: DocStatus.DRAFT,
      reviewInterval: reviewInterval ? parseInt(reviewInterval) : null,
    },
  });

  // Create initial draft version
  const version = await prisma.docVersion.create({
    data: {
      documentId: doc.id,
      versionNumber: "0.1-draft",
      majorVersion: 0,
      minorVersion: 1,
      isDraft: true,
      content: JSON.stringify({ type: "doc", content: [] }),
      authorId: user.id,
      status: DocStatus.DRAFT,
    },
  });

  // Create default workflow steps based on document type
  const steps = getDefaultWorkflow(type as DocType);
  await prisma.docWorkflowStep.createMany({
    data: steps.map((s, i) => ({
      docVersionId: version.id,
      stepOrder: i + 1,
      action: s.action as any,
      assignedRole: s.role,
    })),
  });

  await writeAuditLog("Document", doc.id, "CREATE", user.id, { docNumber, type, title });

  return NextResponse.json({ ...doc, latestVersionId: version.id }, { status: 201 });
}

function getDefaultWorkflow(type: DocType) {
  if (type === "ONE_PAGER") {
    return [{ action: "APPROVE", role: "SAFETY_OFFICER" }];
  }
  if (type === "PROCEDURE") {
    return [
      { action: "REVIEW",  role: "SAFETY_OFFICER" },
      { action: "APPROVE", role: "MANAGER" },
    ];
  }
  // POLICY
  return [
    { action: "REVIEW",  role: "SAFETY_OFFICER" },
    { action: "REVIEW",  role: "MANAGER" },
    { action: "APPROVE", role: "ADMIN" },
  ];
}
