import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const in90 = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  const in180 = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);

  // Fetch all active appointments for grouping / diversity
  const [activeAppointments, expiringNext180Raw, complianceRaw, totals] = await Promise.all([
    prisma.legalAppointment.findMany({
      where: { status: "ACTIVE", deletedAt: null },
      include: {
        position: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
      },
    }),
    prisma.legalAppointment.findMany({
      where: {
        status: "ACTIVE",
        deletedAt: null,
        endDate: { gte: now, lte: in180 },
      },
      include: {
        position: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
      },
      orderBy: { endDate: "asc" },
    }),
    prisma.legalAppointment.findMany({
      where: {
        status: { in: ["ACTIVE", "DRAFT"] },
        deletedAt: null,
      },
      include: {
        position: true,
        documents: { select: { id: true, documentType: true } },
        conflicts: { select: { id: true } },
      },
    }),
    prisma.legalAppointment.groupBy({
      by: ["status"],
      where: { deletedAt: null },
      _count: { id: true },
    }),
  ]);

  // ── Group active by entity / department / position ──────────────────────────
  const entityMap = new Map<string, number>();
  const deptMap = new Map<string, number>();
  const posMap = new Map<string, number>();

  for (const a of activeAppointments) {
    entityMap.set(a.entityName, (entityMap.get(a.entityName) ?? 0) + 1);
    const deptName = a.department?.name ?? "No Department";
    deptMap.set(deptName, (deptMap.get(deptName) ?? 0) + 1);
    const posName = a.position?.name ?? "Unknown Position";
    posMap.set(posName, (posMap.get(posName) ?? 0) + 1);
  }

  const sortDesc = (m: Map<string, number>) =>
    Array.from(m.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ entityName: name, departmentName: name, positionName: name, count }));

  const activeByEntity = Array.from(entityMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([entityName, count]) => ({ entityName, count }));

  const activeByDepartment = Array.from(deptMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([departmentName, count]) => ({ departmentName, count }));

  const activeByPosition = Array.from(posMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([positionName, count]) => ({ positionName, count }));

  void sortDesc; // unused helper — kept for brevity above

  // ── Expiring windows ─────────────────────────────────────────────────────────
  const expiringNext30 = expiringNext180Raw.filter((a) => a.endDate && a.endDate <= in30);
  const expiringNext90 = expiringNext180Raw.filter((a) => a.endDate && a.endDate <= in90);
  const expiringNext180 = expiringNext180Raw;

  // ── Compliance issues ────────────────────────────────────────────────────────
  const complianceIssues = complianceRaw
    .map((a) => {
      const docTypes = new Set((a.documents || []).map((d) => d.documentType));
      const hasAcceptance = docTypes.has("ACCEPTANCE_LETTER");
      const missingAcceptance = !hasAcceptance;

      const missingVetting =
        !!a.position?.requiresBackgroundCheck && !docTypes.has("SECURITY_CLEARANCE");

      const missingDeclaration =
        !!a.position?.requiresDeclarationOfInterest &&
        !docTypes.has("DISCLOSURE_FORM") &&
        !docTypes.has("DECLARATION_OF_INTERESTS") &&
        (a.conflicts?.length ?? 0) === 0;

      const missingResolution =
        !!a.position?.requiresResolution && !a.resolutionRef;

      const hasIssue =
        missingAcceptance || missingVetting || missingDeclaration || missingResolution;

      if (!hasIssue) return null;

      return {
        id: a.id,
        referenceNo: a.referenceNo,
        fullName: a.fullName,
        entityName: a.entityName,
        positionName: a.position?.name ?? "—",
        status: a.status,
        missingAcceptance,
        missingVetting,
        missingDeclaration,
        missingResolution,
      };
    })
    .filter(Boolean);

  // ── Diversity summary ────────────────────────────────────────────────────────
  const genderMap = new Map<string, number>();
  const raceMap = new Map<string, number>();
  const nationalityMap = new Map<string, number>();
  const disabilityMap = new Map<string, number>();

  for (const a of activeAppointments) {
    const g = a.gender || "Not disclosed";
    const r = a.race || "Not disclosed";
    const n = a.nationality || "Not disclosed";
    const d = a.disability || "Not disclosed";
    genderMap.set(g, (genderMap.get(g) ?? 0) + 1);
    raceMap.set(r, (raceMap.get(r) ?? 0) + 1);
    nationalityMap.set(n, (nationalityMap.get(n) ?? 0) + 1);
    disabilityMap.set(d, (disabilityMap.get(d) ?? 0) + 1);
  }

  const mapToArr = (m: Map<string, number>) =>
    Array.from(m.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([label, count]) => ({ label, count }));

  const diversitySummary = {
    gender: mapToArr(genderMap),
    race: mapToArr(raceMap),
    nationality: mapToArr(nationalityMap),
    disability: mapToArr(disabilityMap),
  };

  // ── Totals ───────────────────────────────────────────────────────────────────
  const getCount = (status: string) =>
    totals.find((t) => t.status === status)?._count?.id ?? 0;

  return NextResponse.json({
    activeByEntity,
    activeByDepartment,
    activeByPosition,
    expiringNext30,
    expiringNext90,
    expiringNext180,
    complianceIssues,
    diversitySummary,
    totals: {
      active: getCount("ACTIVE"),
      draft: getCount("DRAFT"),
      expiring90: expiringNext90.length,
      terminated: getCount("TERMINATED"),
    },
  });
}
