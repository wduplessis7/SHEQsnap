import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";
import { format } from "date-fns";

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

  const [nearMisses, incidents, actions] = await Promise.all([
    prisma.nearMiss.findMany({
      where: {
        ...deptFilter,
        ...(Object.keys(dateFilter).length ? { dateReported: dateFilter } : {}),
      },
      include: {
        reportedBy: { select: { name: true } },
        department: { select: { name: true } },
        assignedUser: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.incident.findMany({
      where: {
        ...deptFilter,
        ...(Object.keys(dateFilter).length ? { dateOfIncident: dateFilter } : {}),
      },
      include: {
        reportedBy: { select: { name: true } },
        department: { select: { name: true } },
        assignedUser: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.action.findMany({
      include: {
        owner: { select: { name: true } },
        linkedNearMiss: { select: { referenceNo: true } },
        linkedIncident: { select: { referenceNo: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const wb = XLSX.utils.book_new();

  // Near Misses sheet
  const nmData = nearMisses.map((nm) => ({
    "Reference No": nm.referenceNo,
    "Date Reported": format(nm.dateReported, "dd/MM/yyyy"),
    "Reported By": nm.reportedBy.name,
    Department: nm.department?.name || "",
    Location: nm.location,
    Description: nm.description,
    "Risk Category": nm.riskCategory,
    Severity: nm.severityLevel,
    Status: nm.status,
    "Assigned To": nm.assignedUser?.name || "",
    "Target Close Date": nm.targetCloseDate ? format(nm.targetCloseDate, "dd/MM/yyyy") : "",
    "Actual Close Date": nm.actualCloseDate ? format(nm.actualCloseDate, "dd/MM/yyyy") : "",
    "Immediate Action": nm.immediateAction || "",
  }));
  const nmWs = XLSX.utils.json_to_sheet(nmData);
  XLSX.utils.book_append_sheet(wb, nmWs, "Near Misses");

  // Incidents sheet
  const incData = incidents.map((inc) => ({
    "Reference No": inc.referenceNo,
    "Date of Incident": format(inc.dateOfIncident, "dd/MM/yyyy"),
    "Date Reported": format(inc.dateReported, "dd/MM/yyyy"),
    "Reported By": inc.reportedBy.name,
    Department: inc.department?.name || "",
    Location: inc.location,
    "Incident Type": inc.incidentType,
    Description: inc.description,
    "Persons Involved": inc.personsInvolved || "",
    "Injury Type": inc.injuryType || "",
    Severity: inc.severityLevel,
    "Root Cause": inc.rootCause || "",
    Status: inc.status,
    "Assigned To": inc.assignedUser?.name || "",
    "Due Date": inc.dueDate ? format(inc.dueDate, "dd/MM/yyyy") : "",
    "Closure Date": inc.closureDate ? format(inc.closureDate, "dd/MM/yyyy") : "",
    "Investigation Notes": inc.investigationNotes || "",
  }));
  const incWs = XLSX.utils.json_to_sheet(incData);
  XLSX.utils.book_append_sheet(wb, incWs, "Incidents");

  // Actions sheet
  const actData = actions.map((act) => ({
    "Reference No": act.referenceNo,
    "Linked Type": act.linkedType,
    "Linked Record": act.linkedNearMiss?.referenceNo || act.linkedIncident?.referenceNo || "",
    Description: act.description,
    Owner: act.owner.name,
    Priority: act.priority,
    "Due Date": act.dueDate ? format(act.dueDate, "dd/MM/yyyy") : "",
    Status: act.status,
    "Escalation Flag": act.escalationFlag ? "Yes" : "No",
    "Completion Notes": act.completionNotes || "",
    "Date Completed": act.dateCompleted ? format(act.dateCompleted, "dd/MM/yyyy") : "",
  }));
  const actWs = XLSX.utils.json_to_sheet(actData);
  XLSX.utils.book_append_sheet(wb, actWs, "Actions");

  const buffer = XLSX.write(wb, { bookType: "xlsx", type: "buffer" });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="sheqsnap-report-${format(new Date(), "yyyy-MM-dd")}.xlsx"`,
    },
  });
}
