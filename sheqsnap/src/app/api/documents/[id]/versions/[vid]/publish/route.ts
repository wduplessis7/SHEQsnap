import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/utils";

export async function POST(req: NextRequest, { params }: { params: { id: string; vid: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const allowed = ["MANAGER", "ADMIN"];
  if (!allowed.includes(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const version = await prisma.docVersion.findFirst({
    where: { id: params.vid, documentId: params.id },
    include: { document: { include: { versions: { where: { status: "PUBLISHED" } } } } },
  });
  if (!version) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (version.status !== "APPROVED") {
    return NextResponse.json({ error: "Version must be APPROVED before publishing" }, { status: 400 });
  }

  const now = new Date();

  // Archive all previously published versions
  const prevPublished = version.document.versions.filter(v => v.id !== params.vid);
  if (prevPublished.length > 0) {
    await prisma.docVersion.updateMany({
      where: { id: { in: prevPublished.map(v => v.id) } },
      data: { status: "ARCHIVED", archivedAt: now },
    });
  }

  // Publish this version — clean version number (strip "-draft" suffix)
  const cleanVersion = `${version.majorVersion}.${version.minorVersion}`;
  await prisma.docVersion.update({
    where: { id: params.vid },
    data: { status: "PUBLISHED", isDraft: false, versionNumber: cleanVersion, publishedAt: now },
  });

  // Compute next review date if interval set
  let nextReviewDate: Date | undefined;
  if (version.document.reviewInterval) {
    nextReviewDate = new Date(now);
    nextReviewDate.setMonth(nextReviewDate.getMonth() + version.document.reviewInterval);
  }

  await prisma.document.update({
    where: { id: params.id },
    data: {
      status: "PUBLISHED",
      currentVersionId: params.vid,
      ...(nextReviewDate && { nextReviewDate }),
    },
  });

  await writeAuditLog("DocVersion", params.vid, "PUBLISH", user.id, { versionNumber: cleanVersion });

  return NextResponse.json({ ok: true, versionNumber: cleanVersion });
}
