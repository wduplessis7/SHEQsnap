import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const departmentId = searchParams.get("departmentId");

  const dateFilter: any = {};
  if (from) dateFilter.gte = new Date(from);
  if (to) dateFilter.lte = new Date(to);
  const deptFilter = departmentId ? { departmentId } : {};

  const [
    totalNearMisses,
    totalIncidents,
    openActions,
    overdueActions,
    recentNearMisses,
    recentIncidents,
    criticalActions,
  ] = await Promise.all([
    prisma.nearMiss.count({ where: deptFilter }),
    prisma.incident.count({ where: deptFilter }),
    prisma.action.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    prisma.action.count({
      where: { dueDate: { lt: new Date() }, status: { notIn: ["COMPLETED", "CANCELLED"] } },
    }),
    prisma.nearMiss.findMany({
      where: deptFilter,
      include: {
        reportedBy: { select: { name: true } },
        department: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.incident.findMany({
      where: deptFilter,
      include: {
        reportedBy: { select: { name: true } },
        department: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.action.findMany({
      where: {
        priority: { in: ["HIGH", "CRITICAL"] },
        status: { notIn: ["COMPLETED", "CANCELLED"] },
      },
      include: { owner: { select: { name: true } } },
      orderBy: { dueDate: "asc" },
      take: 10,
    }),
  ]);

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, pageWidth, 40, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("SHEQsnap", 20, 18);
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text("Safety Management System - Monthly Report", 20, 28);
  doc.text(`Generated: ${format(new Date(), "dd MMMM yyyy")}`, 20, 36);

  doc.setTextColor(0, 0, 0);

  // KPI Summary
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Executive Summary", 20, 55);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const kpis = [
    ["Total Near Misses", String(totalNearMisses)],
    ["Total Incidents", String(totalIncidents)],
    ["Open Actions", String(openActions)],
    ["Overdue Actions", String(overdueActions)],
  ];

  autoTable(doc, {
    startY: 60,
    head: [["Metric", "Count"]],
    body: kpis,
    theme: "grid",
    headStyles: { fillColor: [37, 99, 235] },
    columnStyles: { 1: { halign: "center", fontStyle: "bold" } },
    margin: { left: 20, right: 20 },
  });

  // Recent Near Misses
  const nmY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Recent Near Misses", 20, nmY);

  autoTable(doc, {
    startY: nmY + 5,
    head: [["Ref", "Date", "Department", "Severity", "Status"]],
    body: recentNearMisses.map((nm) => [
      nm.referenceNo,
      format(nm.dateReported, "dd/MM/yyyy"),
      nm.department?.name || "N/A",
      nm.severityLevel,
      nm.status,
    ]),
    theme: "striped",
    headStyles: { fillColor: [37, 99, 235] },
    margin: { left: 20, right: 20 },
    styles: { fontSize: 8 },
  });

  // Recent Incidents
  const incY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Recent Incidents", 20, incY);

  autoTable(doc, {
    startY: incY + 5,
    head: [["Ref", "Date", "Type", "Severity", "Status"]],
    body: recentIncidents.map((inc) => [
      inc.referenceNo,
      format(inc.dateOfIncident, "dd/MM/yyyy"),
      inc.incidentType,
      inc.severityLevel,
      inc.status,
    ]),
    theme: "striped",
    headStyles: { fillColor: [37, 99, 235] },
    margin: { left: 20, right: 20 },
    styles: { fontSize: 8 },
  });

  // Critical Actions
  if (criticalActions.length > 0) {
    const actY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("High Priority Actions", 20, actY);

    autoTable(doc, {
      startY: actY + 5,
      head: [["Ref", "Description", "Owner", "Priority", "Due Date", "Status"]],
      body: criticalActions.map((act) => [
        act.referenceNo,
        act.description.substring(0, 40) + (act.description.length > 40 ? "..." : ""),
        act.owner.name,
        act.priority,
        act.dueDate ? format(act.dueDate, "dd/MM/yyyy") : "N/A",
        act.status,
      ]),
      theme: "striped",
      headStyles: { fillColor: [220, 38, 38] },
      margin: { left: 20, right: 20 },
      styles: { fontSize: 8 },
    });
  }

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(
    "This report is confidential and intended for authorized personnel only.",
    pageWidth / 2,
    doc.internal.pageSize.getHeight() - 10,
    { align: "center" }
  );

  const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

  return new NextResponse(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="sheqsnap-report-${format(new Date(), "yyyy-MM-dd")}.pdf"`,
    },
  });
}
