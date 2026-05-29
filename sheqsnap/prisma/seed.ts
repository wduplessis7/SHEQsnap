import {
  PrismaClient,
  Role,
  SeverityLevel,
  NearMissStatus,
  IncidentStatus,
  ActionStatus,
  ActionPriority,
  LinkedType,
  LogType,
  LogEntryStatus,
  ApprovalStatus,
  ApprovalEntityType,
  ChecklistItemType,
} from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import bcrypt from "bcryptjs";
import path from "path";

const rawUrl = process.env.DATABASE_URL ?? `file:./dev.db`;
const dbUrl =
  rawUrl.startsWith("file:./") || rawUrl.startsWith("file:../")
    ? `file:${path.resolve(rawUrl.replace(/^file:/, ""))}`
    : rawUrl;
const adapter = new PrismaLibSql({ url: dbUrl });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // Clear all data in dependency order
  await prisma.mocChecklistItem.deleteMany();
  await prisma.mocChecklistResponse.deleteMany();
  await prisma.mocNotification.deleteMany();
  await prisma.changeRequest.deleteMany();
  await prisma.checklistItemResponse.deleteMany();
  await prisma.checklistSubmission.deleteMany();
  await prisma.checklistAssignment.deleteMany();
  await prisma.checklistSchedule.deleteMany();
  await prisma.checklistTemplateItem.deleteMany();
  await prisma.checklistTemplate.deleteMany();
  await prisma.induction.deleteMany();
  await prisma.license.deleteMany();
  await prisma.behaviourAction.deleteMany();
  await prisma.observationEvidence.deleteMany();
  await prisma.behaviourObservation.deleteMany();
  await prisma.onboardingProgress.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.logAttachment.deleteMany();
  await prisma.logEntry.deleteMany();
  await prisma.approvalRequest.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.action.deleteMany();
  await prisma.nearMiss.deleteMany();
  await prisma.incident.deleteMany();
  await prisma.userGroup.deleteMany();
  await prisma.user.deleteMany();
  await prisma.company.deleteMany();
  await prisma.group.deleteMany();
  await prisma.department.deleteMany();

  // ── Departments ──────────────────────────────────────────────────────────────
  const [safetyDept, opsDept, maintDept, hrDept] = await Promise.all([
    prisma.department.create({ data: { name: "Safety", site: "Main Site" } }),
    prisma.department.create({ data: { name: "Operations", site: "Main Site" } }),
    prisma.department.create({ data: { name: "Maintenance", site: "Main Site" } }),
    prisma.department.create({ data: { name: "HR", site: "Head Office" } }),
  ]);
  console.log("Created departments");

  // ── Groups ───────────────────────────────────────────────────────────────────
  const [safetyTeam, opsTeam, mgmtTeam] = await Promise.all([
    prisma.group.create({ data: { name: "Safety Team", description: "SHEQ Safety Officers and Officers" } }),
    prisma.group.create({ data: { name: "Operations Team", description: "Operations staff and supervisors" } }),
    prisma.group.create({ data: { name: "Management", description: "Management and executive team" } }),
  ]);
  console.log("Created groups");

  // ── Users ────────────────────────────────────────────────────────────────────
  const hash = async (pwd: string) => bcrypt.hash(pwd, 12);
  const [adminUser, safetyUser, managerUser, reporterUser, viewerUser] = await Promise.all([
    prisma.user.create({ data: { name: "Admin User", email: "admin@sheqsnap.com", password: await hash("Password123!"), role: Role.ADMIN, departmentId: safetyDept.id, active: true, mocApprover: true } }),
    prisma.user.create({ data: { name: "Jane Safety", email: "safety@sheqsnap.com", password: await hash("Password123!"), role: Role.SAFETY_OFFICER, departmentId: safetyDept.id, active: true, mocApprover: true } }),
    prisma.user.create({ data: { name: "Mark Manager", email: "manager@sheqsnap.com", password: await hash("Password123!"), role: Role.MANAGER, departmentId: opsDept.id, active: true, mocApprover: false } }),
    prisma.user.create({ data: { name: "Tom Reporter", email: "reporter@sheqsnap.com", password: await hash("Password123!"), role: Role.REPORTER, departmentId: maintDept.id, active: true, mocApprover: false } }),
    prisma.user.create({ data: { name: "Vicky Viewer", email: "viewer@sheqsnap.com", password: await hash("Password123!"), role: Role.VIEWER, departmentId: hrDept.id, active: true, mocApprover: false } }),
  ]);
  console.log("Created internal users");

  const abcCompany = await prisma.company.create({
    data: { name: "ABC Construction", registrationNo: "2023/012345/07", contactName: "Bob Builder", contactEmail: "bob@abcconstruction.co.za", contactPhone: "+27 11 555 1234", siteId: safetyDept.id, responsiblePersonId: safetyUser.id, active: true },
  });

  const contractorUser = await prisma.user.create({
    data: { name: "Contractor User", email: "contractor@sheqsnap.com", password: await hash("Password123!"), role: Role.CONTRACTOR, departmentId: safetyDept.id, companyId: abcCompany.id, responsiblePersonId: safetyUser.id, active: true, mocApprover: false },
  });

  await Promise.all([
    prisma.userGroup.create({ data: { userId: adminUser.id, groupId: safetyTeam.id } }),
    prisma.userGroup.create({ data: { userId: safetyUser.id, groupId: safetyTeam.id } }),
    prisma.userGroup.create({ data: { userId: managerUser.id, groupId: mgmtTeam.id } }),
    prisma.userGroup.create({ data: { userId: managerUser.id, groupId: opsTeam.id } }),
    prisma.userGroup.create({ data: { userId: reporterUser.id, groupId: opsTeam.id } }),
  ]);

  // ── Near Misses ──────────────────────────────────────────────────────────────
  const now = new Date();
  const nmData = [
    { ref: "NM-0001", dept: safetyDept.id, location: "Warehouse Bay 3", desc: "Forklift nearly struck a pedestrian when reversing. No warning signals were activated.", risk: "Vehicle/Traffic", sev: SeverityLevel.HIGH, status: NearMissStatus.UNDER_REVIEW, assigned: safetyUser.id, daysAgo: 5, targetDays: 10 },
    { ref: "NM-0002", dept: opsDept.id, location: "Production Line A", desc: "Loose guard on conveyor belt detected during routine inspection.", risk: "Mechanical", sev: SeverityLevel.MEDIUM, status: NearMissStatus.IN_PROGRESS, assigned: managerUser.id, daysAgo: 10, targetDays: 7 },
    { ref: "NM-0003", dept: maintDept.id, location: "Electrical Room B", desc: "Exposed wiring found behind panel during maintenance. Area was temporarily unsecured.", risk: "Electrical", sev: SeverityLevel.CRITICAL, status: NearMissStatus.ACTION_REQUIRED, assigned: safetyUser.id, daysAgo: 2, targetDays: 5 },
    { ref: "NM-0004", dept: opsDept.id, location: "Loading Dock", desc: "Spill of hydraulic fluid on floor not immediately cleaned, creating slip hazard.", risk: "Slip/Trip/Fall", sev: SeverityLevel.LOW, status: NearMissStatus.CLOSED, assigned: reporterUser.id, daysAgo: 30, targetDays: -5 },
    { ref: "NM-0005", dept: safetyDept.id, location: "Chemical Store", desc: "Incompatible chemicals stored in close proximity without proper segregation.", risk: "Chemical", sev: SeverityLevel.HIGH, status: NearMissStatus.SUBMITTED, assigned: safetyUser.id, daysAgo: 3, targetDays: 14 },
    { ref: "NM-0006", dept: maintDept.id, location: "Roof Access", desc: "Worker observed without harness while working at height on roof.", risk: "Height", sev: SeverityLevel.CRITICAL, status: NearMissStatus.CLOSED, assigned: managerUser.id, daysAgo: 45, targetDays: -30 },
    { ref: "NM-0007", dept: opsDept.id, location: "Cafeteria", desc: "Wet floor sign not placed after mopping, creating slip hazard.", risk: "Housekeeping", sev: SeverityLevel.LOW, status: NearMissStatus.NEW, assigned: null as string | null, daysAgo: 1, targetDays: 7 },
    { ref: "NM-0008", dept: safetyDept.id, location: "PPE Store", desc: "Expired hard hats found in PPE distribution point.", risk: "PPE", sev: SeverityLevel.MEDIUM, status: NearMissStatus.ACTION_REQUIRED, assigned: safetyUser.id, daysAgo: 7, targetDays: 5 },
    { ref: "NM-0009", dept: maintDept.id, location: "Workshop", desc: "Grinding sparks landed near flammable material storage during unplanned work.", risk: "Fire", sev: SeverityLevel.HIGH, status: NearMissStatus.UNDER_REVIEW, assigned: safetyUser.id, daysAgo: 4, targetDays: 10 },
    { ref: "NM-0010", dept: opsDept.id, location: "Packing Area", desc: "Heavy box fell from unsecured shelf narrowly missing worker.", risk: "Manual Handling", sev: SeverityLevel.MEDIUM, status: NearMissStatus.IN_PROGRESS, assigned: managerUser.id, daysAgo: 8, targetDays: 14 },
  ];

  const nearMisses = [];
  for (const nm of nmData) {
    const created = await prisma.nearMiss.create({
      data: {
        referenceNo: nm.ref, dateReported: new Date(now.getTime() - nm.daysAgo * 86400000), reportedById: reporterUser.id,
        departmentId: nm.dept, location: nm.location, description: nm.desc, riskCategory: nm.risk, severityLevel: nm.sev,
        immediateAction: "Area secured immediately. Supervisor notified.", status: nm.status, assignedUserId: nm.assigned,
        targetCloseDate: new Date(now.getTime() + nm.targetDays * 86400000),
        actualCloseDate: nm.status === NearMissStatus.CLOSED ? new Date(now.getTime() - 3 * 86400000) : null,
      },
    });
    nearMisses.push(created);
  }

  const contractorNm = await prisma.nearMiss.create({
    data: {
      referenceNo: "NM-0011", dateReported: new Date(), reportedById: contractorUser.id, departmentId: safetyDept.id,
      location: "Construction Site A", description: "Contractor worker nearly struck by falling debris from scaffolding.",
      riskCategory: "Height", severityLevel: SeverityLevel.HIGH, immediateAction: "Area cordoned off. Site supervisor notified.",
      status: NearMissStatus.PENDING_APPROVAL,
    },
  });
  await prisma.approvalRequest.create({
    data: { entityType: ApprovalEntityType.NEAR_MISS, entityId: contractorNm.id, requestedById: contractorUser.id, assignedApproverId: safetyUser.id, status: ApprovalStatus.PENDING },
  });
  console.log("Created near misses");

  // ── Incidents ────────────────────────────────────────────────────────────────
  const incData = [
    { ref: "INC-0001", dept: opsDept.id, location: "Assembly Line 2", type: "First Aid", desc: "Worker cut hand on sharp metal edge while assembling parts. First aid administered.", injury: "Cut/Laceration", sev: SeverityLevel.LOW, status: IncidentStatus.CLOSED, daysAgo: 60 },
    { ref: "INC-0002", dept: maintDept.id, location: "Boiler Room", type: "Medical Treatment", desc: "Maintenance technician suffered burns to forearm from steam pipe.", injury: "Burn", sev: SeverityLevel.MEDIUM, status: IncidentStatus.CLOSED, daysAgo: 45 },
    { ref: "INC-0003", dept: opsDept.id, location: "Warehouse", type: "Lost Time Injury", desc: "Worker slipped on wet floor and fractured wrist. Away from work for 3 weeks.", injury: "Fracture", sev: SeverityLevel.HIGH, status: IncidentStatus.IN_PROGRESS, daysAgo: 20 },
    { ref: "INC-0004", dept: safetyDept.id, location: "Parking Lot", type: "Property Damage", desc: "Company vehicle struck by another vehicle in parking lot. Significant damage.", injury: "None", sev: SeverityLevel.MEDIUM, status: IncidentStatus.UNDER_REVIEW, daysAgo: 15 },
    { ref: "INC-0005", dept: maintDept.id, location: "Chemical Storage", type: "Environmental", desc: "Chemical spill leaked to drainage system. Environmental authority notified.", injury: "None", sev: SeverityLevel.CRITICAL, status: IncidentStatus.ACTION_REQUIRED, daysAgo: 10 },
    { ref: "INC-0006", dept: opsDept.id, location: "Production Floor", type: "First Aid", desc: "Worker caught finger in machine guard. Minor laceration treated on site.", injury: "Cut/Laceration", sev: SeverityLevel.LOW, status: IncidentStatus.CLOSED, daysAgo: 90 },
    { ref: "INC-0007", dept: safetyDept.id, location: "Office Building", type: "Medical Treatment", desc: "Employee developed symptoms of chemical exposure after incorrect mixing of cleaning products.", injury: "Chemical Exposure", sev: SeverityLevel.HIGH, status: IncidentStatus.IN_PROGRESS, daysAgo: 5 },
    { ref: "INC-0008", dept: opsDept.id, location: "Roof", type: "Lost Time Injury", desc: "Worker fell from height approximately 2 meters. Multiple injuries. Full investigation underway.", injury: "Fracture", sev: SeverityLevel.CRITICAL, status: IncidentStatus.UNDER_REVIEW, daysAgo: 7 },
  ];

  const incidents = [];
  for (const inc of incData) {
    const dateOfIncident = new Date(now.getTime() - inc.daysAgo * 86400000);
    const created = await prisma.incident.create({
      data: {
        referenceNo: inc.ref, dateOfIncident, dateReported: dateOfIncident, reportedById: reporterUser.id,
        departmentId: inc.dept, location: inc.location, incidentType: inc.type, description: inc.desc,
        personsInvolved: "Employee (details on file)", injuryType: inc.injury, severityLevel: inc.sev,
        rootCause: "Under investigation", immediateAction: "First aid provided. Area secured. Incident reported to management.",
        status: inc.status, assignedUserId: safetyUser.id, dueDate: new Date(now.getTime() + 14 * 86400000),
        closureDate: inc.status === IncidentStatus.CLOSED ? new Date(now.getTime() - 5 * 86400000) : null,
        investigationNotes: inc.status !== IncidentStatus.NEW ? "Initial investigation complete. Final report pending." : null,
      },
    });
    incidents.push(created);
  }
  console.log("Created incidents");

  // ── Actions ──────────────────────────────────────────────────────────────────
  const actionData: any[] = [
    { ref: "ACT-0001", linkedType: LinkedType.NEAR_MISS, nmIdx: 0, desc: "Install audible and visual reverse warning on all forklifts", owner: managerUser.id, priority: ActionPriority.HIGH, dueDays: 14, status: ActionStatus.IN_PROGRESS },
    { ref: "ACT-0002", linkedType: LinkedType.NEAR_MISS, nmIdx: 0, desc: "Demarcate pedestrian walkways in all warehouse areas with yellow paint", owner: safetyUser.id, priority: ActionPriority.HIGH, dueDays: 21, status: ActionStatus.OPEN },
    { ref: "ACT-0003", linkedType: LinkedType.NEAR_MISS, nmIdx: 1, desc: "Replace damaged conveyor belt guard. Do not operate machine until guard is replaced.", owner: reporterUser.id, priority: ActionPriority.CRITICAL, dueDays: 2, status: ActionStatus.COMPLETED },
    { ref: "ACT-0004", linkedType: LinkedType.NEAR_MISS, nmIdx: 2, desc: "Rectify exposed wiring in electrical room B. Conduct full electrical audit.", owner: managerUser.id, priority: ActionPriority.CRITICAL, dueDays: 3, status: ActionStatus.IN_PROGRESS, escalation: true },
    { ref: "ACT-0005", linkedType: LinkedType.NEAR_MISS, nmIdx: 4, desc: "Review chemical storage layout. Implement proper segregation per SDS requirements.", owner: safetyUser.id, priority: ActionPriority.HIGH, dueDays: 10, status: ActionStatus.OPEN },
    { ref: "ACT-0006", linkedType: LinkedType.NEAR_MISS, nmIdx: 7, desc: "Replace all expired PPE. Implement monthly PPE inspection procedure.", owner: safetyUser.id, priority: ActionPriority.MEDIUM, dueDays: 7, status: ActionStatus.OPEN },
    { ref: "ACT-0007", linkedType: LinkedType.NEAR_MISS, nmIdx: 8, desc: "Enforce hot work permit system. Brief all maintenance staff.", owner: managerUser.id, priority: ActionPriority.HIGH, dueDays: 5, status: ActionStatus.IN_PROGRESS },
    { ref: "ACT-0008", linkedType: LinkedType.INCIDENT, incIdx: 2, desc: "Install non-slip matting in all wet areas. Increase housekeeping frequency.", owner: managerUser.id, priority: ActionPriority.HIGH, dueDays: 14, status: ActionStatus.OPEN },
    { ref: "ACT-0009", linkedType: LinkedType.INCIDENT, incIdx: 4, desc: "Conduct environmental impact assessment. Remediate affected drainage.", owner: safetyUser.id, priority: ActionPriority.CRITICAL, dueDays: 7, status: ActionStatus.IN_PROGRESS, escalation: true },
    { ref: "ACT-0010", linkedType: LinkedType.INCIDENT, incIdx: 6, desc: "Retrain all staff on chemical handling procedures. Update MSDS records.", owner: safetyUser.id, priority: ActionPriority.HIGH, dueDays: 14, status: ActionStatus.OPEN },
    { ref: "ACT-0011", linkedType: LinkedType.INCIDENT, incIdx: 7, desc: "Inspect all roof access points. Install fall arrest systems on all elevated work areas.", owner: managerUser.id, priority: ActionPriority.CRITICAL, dueDays: -3, status: ActionStatus.OPEN, escalation: true },
    { ref: "ACT-0012", linkedType: LinkedType.OTHER, desc: "Conduct quarterly safety walk with management team", owner: safetyUser.id, priority: ActionPriority.LOW, dueDays: 30, status: ActionStatus.OPEN },
    { ref: "ACT-0013", linkedType: LinkedType.OTHER, desc: "Update emergency evacuation plan and conduct drill", owner: safetyUser.id, priority: ActionPriority.MEDIUM, dueDays: -7, status: ActionStatus.OPEN },
    { ref: "ACT-0014", linkedType: LinkedType.OTHER, desc: "Review and update risk register for all departments", owner: adminUser.id, priority: ActionPriority.MEDIUM, dueDays: 45, status: ActionStatus.OPEN },
    { ref: "ACT-0015", linkedType: LinkedType.INCIDENT, incIdx: 0, desc: "Update first aid kit contents and training records", owner: safetyUser.id, priority: ActionPriority.LOW, dueDays: 30, status: ActionStatus.COMPLETED },
  ];

  for (const act of actionData) {
    await prisma.action.create({
      data: {
        referenceNo: act.ref, linkedType: act.linkedType,
        nearMissId: act.linkedType === LinkedType.NEAR_MISS && act.nmIdx != null ? nearMisses[act.nmIdx].id : null,
        incidentId: act.linkedType === LinkedType.INCIDENT && act.incIdx != null ? incidents[act.incIdx].id : null,
        description: act.desc, ownerId: act.owner, priority: act.priority,
        dueDate: new Date(now.getTime() + act.dueDays * 86400000), status: act.status,
        escalationFlag: act.escalation || false,
        completionNotes: act.status === ActionStatus.COMPLETED ? "Action completed successfully. Verified by safety officer." : null,
        dateCompleted: act.status === ActionStatus.COMPLETED ? new Date(now.getTime() - 2 * 86400000) : null,
      },
    });
  }
  console.log("Created actions");

  // ── Log Entries ──────────────────────────────────────────────────────────────
  const logData: any[] = [
    { ref: "LOG-0001", title: "Monthly Safety Inspection - Main Site", type: LogType.INSPECTION, dept: safetyDept.id, company: null, desc: "Routine monthly safety inspection. 12 observations noted, 3 requiring immediate attention.", status: LogEntryStatus.ACTIVE, daysAgo: 7, uploader: safetyUser.id, approver: adminUser.id },
    { ref: "LOG-0002", title: "Toolbox Talk - Working at Heights", type: LogType.TOOLBOX_TALK, dept: opsDept.id, company: null, desc: "Toolbox talk with 15 employees on safe working at height procedures, PPE, and fall arrest systems.", status: LogEntryStatus.ACTIVE, daysAgo: 14, uploader: safetyUser.id, approver: adminUser.id },
    { ref: "LOG-0003", title: "Safety Committee Meeting Minutes - Q1", type: LogType.MEETING_MINUTES, dept: safetyDept.id, company: null, desc: "Quarterly safety committee meeting. Agenda: incident review, action status, near miss trends.", status: LogEntryStatus.ACTIVE, daysAgo: 30, uploader: managerUser.id, approver: adminUser.id },
    { ref: "LOG-0004", title: "ABC Construction Safety File 2026", type: LogType.SAFETY_FILE, dept: safetyDept.id, company: abcCompany.id, desc: "Annual safety file from ABC Construction covering mandatory documentation and risk assessments.", status: LogEntryStatus.PENDING_APPROVAL, daysAgo: 2, uploader: contractorUser.id, approver: null },
    { ref: "LOG-0005", title: "Hot Work Permit - Boiler Room Repair", type: LogType.PERMIT, dept: maintDept.id, company: abcCompany.id, desc: "Hot work permit for welding in boiler room. Valid 3 days. Fire watch assigned.", status: LogEntryStatus.ACTIVE, daysAgo: 5, uploader: safetyUser.id, approver: managerUser.id },
    { ref: "LOG-0006", title: "Incident Log - May 2026", type: LogType.INCIDENT_LOG, dept: safetyDept.id, company: null, desc: "Monthly incident log summary May 2026. Total incidents: 2, near misses: 5, first aid cases: 1.", status: LogEntryStatus.DRAFT, daysAgo: 1, uploader: safetyUser.id, approver: null },
  ];

  const logEntries = [];
  for (const log of logData) {
    const entryDate = new Date(now.getTime() - log.daysAgo * 86400000);
    const created = await prisma.logEntry.create({
      data: {
        referenceNo: log.ref, title: log.title, logType: log.type, companyId: log.company,
        departmentId: log.dept, entryDate, description: log.desc, uploadedById: log.uploader,
        status: log.status, approvedById: log.approver,
        approvedAt: log.approver ? new Date(now.getTime() - (log.daysAgo - 1) * 86400000) : null,
      },
    });
    logEntries.push(created);
  }
  await prisma.approvalRequest.create({
    data: { entityType: ApprovalEntityType.LOG_ENTRY, entityId: logEntries[3].id, requestedById: contractorUser.id, assignedApproverId: safetyUser.id, status: ApprovalStatus.PENDING },
  });
  console.log("Created log entries");

  // ── Checklist Templates ──────────────────────────────────────────────────────
  await prisma.checklistTemplate.create({
    data: {
      title: "Site Safety Inspection Checklist", description: "Standard monthly site safety inspection.", category: "Inspection", isActive: true, createdById: safetyUser.id,
      items: { create: [
        { order: 1, label: "Are all walkways clear of obstructions?", type: ChecklistItemType.YES_NO, required: true },
        { order: 2, label: "Is PPE available and in good condition at all stations?", type: ChecklistItemType.YES_NO, required: true },
        { order: 3, label: "Are fire extinguishers in date and accessible?", type: ChecklistItemType.YES_NO, required: true },
        { order: 4, label: "Are emergency exits unobstructed and clearly marked?", type: ChecklistItemType.YES_NO, required: true },
        { order: 5, label: "Are chemicals properly labelled and stored?", type: ChecklistItemType.YES_NO, required: true },
        { order: 6, label: "Overall site safety rating (1–5)", type: ChecklistItemType.RATING, required: true },
        { order: 7, label: "Additional observations or notes", type: ChecklistItemType.TEXT, required: false },
      ]},
    },
  });

  await prisma.checklistTemplate.create({
    data: {
      title: "Toolbox Talk Attendance Register", description: "Pre-shift toolbox talk attendance confirmation.", category: "Toolbox Talk", isActive: true, createdById: safetyUser.id,
      items: { create: [
        { order: 1, label: "Topic of today's toolbox talk", type: ChecklistItemType.TEXT, required: true },
        { order: 2, label: "Were all attendees present and signed attendance register?", type: ChecklistItemType.YES_NO, required: true },
        { order: 3, label: "Were questions raised and answered?", type: ChecklistItemType.YES_NO, required: true },
        { order: 4, label: "Any action items arising?", type: ChecklistItemType.TEXT, required: false },
      ]},
    },
  });

  const mocTemplate = await prisma.checklistTemplate.create({
    data: {
      title: "MOC Pre-Implementation Checklist", description: "Mandatory checklist before a MOC can be submitted for approval.", category: "MOC", isActive: true, createdById: adminUser.id,
      items: { create: [
        { order: 1, label: "Has a risk assessment been completed for this change?", type: ChecklistItemType.YES_NO, required: true },
        { order: 2, label: "Have all affected parties been identified?", type: ChecklistItemType.YES_NO, required: true },
        { order: 3, label: "Have relevant procedures and work instructions been updated?", type: ChecklistItemType.YES_NO, required: true },
        { order: 4, label: "Has training been planned for affected personnel?", type: ChecklistItemType.YES_NO, required: true },
        { order: 5, label: "Have regulatory / legal compliance requirements been checked?", type: ChecklistItemType.YES_NO, required: true },
        { order: 6, label: "Has the emergency response plan been reviewed for impact?", type: ChecklistItemType.YES_NO, required: true },
        { order: 7, label: "List any outstanding concerns or conditions for approval", type: ChecklistItemType.TEXT, required: false },
      ]},
    },
    include: { items: true },
  });
  console.log("Created checklist templates");

  // ── Licenses ─────────────────────────────────────────────────────────────────
  const licData: any[] = [
    { holder: "Tom Reporter", holderType: "employee", type: "Forklift Operator", number: "FL-2024-001", issued: -365, expiry: 30, status: "expiring_soon" },
    { holder: "Jane Safety", holderType: "employee", type: "SAMTRAC Certificate", number: "SAM-2022-456", issued: -730, expiry: 180, status: "active" },
    { holder: "Mark Manager", holderType: "employee", type: "First Aid Level 2", number: "FA2-2023-789", issued: -180, expiry: 545, status: "active" },
    { holder: "Bob Builder", holderType: "contractor", type: "Scaffolding Erection", number: "SCAF-2023-123", issued: -400, expiry: -5, status: "expired" },
    { holder: "Tom Reporter", holderType: "employee", type: "Confined Space Entry", number: "CSE-2024-002", issued: -200, expiry: 165, status: "active" },
    { holder: "Contractor User", holderType: "contractor", type: "Working at Heights", number: "WAH-2025-001", issued: -90, expiry: 275, status: "active" },
    { holder: "Jane Safety", holderType: "employee", type: "Fire Fighting Level 1", number: "FF1-2023-321", issued: -500, expiry: 10, status: "expiring_soon" },
    { holder: "Admin User", holderType: "employee", type: "HIRA Facilitator", number: "HIRA-2024-100", issued: -120, expiry: 245, status: "active" },
  ];
  for (const lic of licData) {
    await prisma.license.create({ data: { holderName: lic.holder, holderType: lic.holderType, licenseType: lic.type, licenseNumber: lic.number, issuedDate: new Date(now.getTime() + lic.issued * 86400000), expiryDate: new Date(now.getTime() + lic.expiry * 86400000), status: lic.status } });
  }
  console.log("Created licenses");

  // ── Inductions ───────────────────────────────────────────────────────────────
  const indData: any[] = [
    { ref: "IND-0001", name: "Tom Reporter", type: "employee", inductionType: "Site Safety", conductor: "Jane Safety", conductorId: safetyUser.id, daysAgo: 180, months: 12, status: "current" },
    { ref: "IND-0002", name: "Tom Reporter", type: "employee", inductionType: "Fire & Emergency", conductor: "Jane Safety", conductorId: safetyUser.id, daysAgo: 180, months: 12, status: "current" },
    { ref: "IND-0003", name: "Contractor User", type: "contractor", inductionType: "Site Safety", conductor: "Jane Safety", conductorId: safetyUser.id, daysAgo: 5, months: 6, status: "current" },
    { ref: "IND-0004", name: "Bob Builder", type: "contractor", inductionType: "Site Safety", conductor: "Mark Manager", conductorId: managerUser.id, daysAgo: 200, months: 6, status: "expired" },
    { ref: "IND-0005", name: "Vicky Viewer", type: "employee", inductionType: "PPE", conductor: "Jane Safety", conductorId: safetyUser.id, daysAgo: 90, months: 24, status: "current" },
    { ref: "IND-0006", name: "Mark Manager", type: "employee", inductionType: "Chemical Handling", conductor: "Jane Safety", conductorId: safetyUser.id, daysAgo: 60, months: 12, status: "current" },
    { ref: "IND-0007", name: "External Worker 1", type: "contractor", inductionType: "Site Safety", conductor: "Jane Safety", conductorId: safetyUser.id, daysAgo: 160, months: 6, status: "expiring_soon" },
  ];
  for (const ind of indData) {
    const conductedDate = new Date(now.getTime() - ind.daysAgo * 86400000);
    await prisma.induction.create({ data: { referenceNo: ind.ref, inducteeName: ind.name, inducteeType: ind.type, inductionType: ind.inductionType, conductedByName: ind.conductor, conductedById: ind.conductorId, conductedDate, expiryDate: new Date(conductedDate.getTime() + ind.months * 30 * 86400000), validityMonths: ind.months, status: ind.status, departmentId: safetyDept.id, createdById: safetyUser.id } });
  }
  console.log("Created inductions");

  // ── Behaviour Observations ───────────────────────────────────────────────────
  const obs1 = await prisma.behaviourObservation.create({
    data: {
      observationDate: new Date(now.getTime() - 2 * 86400000), location: "Warehouse Bay 3", site: "Main Site",
      observerName: "Jane Safety", observerDepartment: "Safety", observerId: safetyUser.id, teamObserved: "Warehouse Team",
      workType: "ROUTINE", taskDescription: "Loading and unloading of pallets from delivery trucks",
      safeBehaviours: JSON.stringify(["Wearing correct PPE", "Following safe lifting technique"]),
      unsafeBehaviours: JSON.stringify(["Not using spotter when reversing forklift"]),
      hazardsPresent: "Collision risk between forklift and pedestrians", potentialConsequences: "Serious injury or fatality",
      riskLevel: "HIGH", likelihoodScore: 3, impactScore: 5, riskScore: 15,
      immediateActionTaken: "Stopped work, reminded operator of spotter requirement", workStopped: true, supervisorNotified: true,
      rootCauses: JSON.stringify(["Lack of supervision", "Complacency"]), workerEngaged: true,
      workerFeedback: "Operator acknowledged the risk and agreed to use spotter", safetyCategory: "PROCEDURE",
      status: "IN_PROGRESS", createdById: safetyUser.id,
    },
  });
  await prisma.behaviourAction.create({
    data: { observationId: obs1.id, description: "Implement formal spotter procedure and conduct refresher training for all forklift operators", responsiblePerson: "Mark Manager", dueDate: new Date(now.getTime() + 14 * 86400000), status: "OPEN" },
  });

  await prisma.behaviourObservation.create({
    data: {
      observationDate: new Date(now.getTime() - 7 * 86400000), location: "Production Line A", site: "Main Site",
      observerName: "Mark Manager", observerDepartment: "Operations", observerId: managerUser.id, teamObserved: "Production Team A",
      workType: "ROUTINE", taskDescription: "Operating packaging machinery",
      safeBehaviours: JSON.stringify(["Machine guards in place", "Operating at correct speed"]),
      unsafeBehaviours: JSON.stringify(["PPE not worn consistently"]),
      hazardsPresent: "Hand entrapment in machinery", potentialConsequences: "Lost time injury",
      riskLevel: "MEDIUM", likelihoodScore: 2, impactScore: 4, riskScore: 8,
      immediateActionTaken: "Reinforced PPE requirements on the spot", workStopped: false, supervisorNotified: false,
      rootCauses: JSON.stringify(["Peer pressure", "Inconvenience of PPE"]), workerEngaged: true,
      workerFeedback: "Worker agreed to wear PPE consistently", safetyCategory: "PPE",
      status: "CLOSED", createdById: managerUser.id,
    },
  });

  await prisma.behaviourObservation.create({
    data: {
      observationDate: new Date(now.getTime() - 14 * 86400000), location: "Electrical Room B", site: "Main Site",
      observerName: "Tom Reporter", observerDepartment: "Maintenance", observerId: reporterUser.id, teamObserved: "Maintenance Crew",
      workType: "MAINTENANCE", taskDescription: "Routine electrical panel maintenance",
      safeBehaviours: JSON.stringify(["Lockout tagout followed correctly"]),
      unsafeBehaviours: JSON.stringify(["Working in confined space without gas test"]),
      hazardsPresent: "Toxic gas accumulation in confined space", potentialConsequences: "Asphyxiation",
      riskLevel: "HIGH", likelihoodScore: 2, impactScore: 5, riskScore: 10,
      immediateActionTaken: "Stopped work. Arranged gas test before resuming.", workStopped: true, supervisorNotified: true,
      rootCauses: JSON.stringify(["Inadequate procedure", "Assumption of safety without testing"]), workerEngaged: true,
      workerFeedback: "Team briefed on confined space entry requirements", safetyCategory: "PROCEDURE",
      status: "CLOSED", createdById: reporterUser.id,
    },
  });
  console.log("Created behaviour observations");

  // ── MOC Change Requests ──────────────────────────────────────────────────────
  const mocItems = mocTemplate.items;

  const moc1 = await prisma.changeRequest.create({
    data: {
      referenceNo: "MOC-0001", title: "Replace Hydraulic Press Model H-200 with H-400", changeType: "Equipment / Plant",
      description: "Replace the ageing hydraulic press (Model H-200) in Production Bay 2 with the newer H-400 model. The H-400 offers improved safety features including automatic guard lock, pressure relief valve, and emergency stop integration.",
      reason: "Current H-200 unit is 12 years old. Three near-misses in the past 6 months. H-400 meets current ISO 4413 standards.",
      riskAssessment: "Primary risks during installation: electrical isolation, mechanical stability. Mitigation: permit to work, qualified technician contracted.",
      affectedAreas: "Production Bay 2, Maintenance, Quality Control",
      proposedDate: new Date(now.getTime() - 30 * 86400000), implementationDate: new Date(now.getTime() - 14 * 86400000), reviewDate: new Date(now.getTime() + 60 * 86400000),
      status: "approved", requestedByName: "Mark Manager", requestedById: managerUser.id,
      approvedByName: "Jane Safety", approvedById: safetyUser.id, approvedAt: new Date(now.getTime() - 20 * 86400000),
      checklistTemplateId: mocTemplate.id, checklistCompleted: true,
    },
  });
  await prisma.mocChecklistResponse.create({
    data: {
      changeRequestId: moc1.id, templateId: mocTemplate.id, completedAt: new Date(now.getTime() - 25 * 86400000),
      items: { create: mocItems.map((item) => ({ itemId: item.id, passed: item.type === "YES_NO" ? true : null, value: item.type === "TEXT" ? "No outstanding concerns — all pre-conditions met." : null })) },
    },
  });
  await prisma.mocNotification.createMany({ data: [
    { changeRequestId: moc1.id, type: "internal", userId: safetyUser.id, firstName: "Jane", lastName: "Safety", email: "safety@sheqsnap.com", notifiedAt: new Date(now.getTime() - 25 * 86400000) },
    { changeRequestId: moc1.id, type: "internal", userId: managerUser.id, firstName: "Mark", lastName: "Manager", email: "manager@sheqsnap.com", notifiedAt: new Date(now.getTime() - 25 * 86400000) },
    { changeRequestId: moc1.id, type: "external", firstName: "Bob", lastName: "Builder", company: "ABC Construction", email: "bob@abcconstruction.co.za", phone: "+27 11 555 1234", notifiedAt: new Date(now.getTime() - 25 * 86400000) },
  ]});

  const moc2 = await prisma.changeRequest.create({
    data: {
      referenceNo: "MOC-0002", title: "Update Chemical Storage Layout — Zone C Reorganisation", changeType: "Process",
      description: "Reorganise the chemical storage in Zone C to improve segregation of incompatible chemicals. Follows near miss NM-0005.",
      reason: "Near miss NM-0005 identified a critical risk. SDS requirements mandate proper segregation. OHS Act Regulation 5 compliance.",
      riskAssessment: "Risk of chemical reaction during transition. Mitigation: trained chemical handler to oversee, one container at a time.",
      affectedAreas: "Chemical Storage Zone C, Health & Safety",
      proposedDate: new Date(now.getTime() + 7 * 86400000),
      status: "pending_approval", requestedByName: "Jane Safety", requestedById: safetyUser.id,
      approvedById: safetyUser.id, checklistTemplateId: mocTemplate.id, checklistCompleted: true,
    },
  });
  await prisma.mocChecklistResponse.create({
    data: {
      changeRequestId: moc2.id, templateId: mocTemplate.id, completedAt: new Date(now.getTime() - 2 * 86400000),
      items: { create: mocItems.map((item) => ({ itemId: item.id, passed: item.type === "YES_NO" ? true : null, value: item.type === "TEXT" ? "Awaiting sign-off from department head." : null })) },
    },
  });
  await prisma.mocNotification.createMany({ data: [
    { changeRequestId: moc2.id, type: "internal", userId: adminUser.id, firstName: "Admin", lastName: "User", email: "admin@sheqsnap.com", notifiedAt: new Date(now.getTime() - 2 * 86400000) },
    { changeRequestId: moc2.id, type: "external", firstName: "Regulatory", lastName: "Officer", company: "DoL Inspection", discussedTelephonically: true },
  ]});

  await prisma.changeRequest.create({
    data: {
      referenceNo: "MOC-0003", title: "Introduce Remote Work Policy for Office Staff", changeType: "Personnel",
      description: "Implement a formal remote work policy allowing office-based employees to work from home up to 2 days per week.",
      reason: "Employee wellbeing initiative and business continuity planning. Reduces commute-related risk.",
      affectedAreas: "HR, Finance, IT, All office-based departments",
      status: "draft", requestedByName: "Admin User", requestedById: adminUser.id,
    },
  });

  await prisma.changeRequest.create({
    data: {
      referenceNo: "MOC-0004", title: "Install CCTV in Warehouse and Chemical Storage Areas", changeType: "Equipment / Plant",
      description: "Installation of 8 CCTV cameras across warehouse, loading dock, and chemical storage areas for safety monitoring.",
      reason: "Improved incident investigation capability, deterrent effect on unsafe behaviours, insurance requirement.",
      riskAssessment: "Privacy considerations addressed per POPIA. Camera placement avoids private areas.",
      affectedAreas: "Warehouse, Loading Dock, Chemical Storage, Security",
      proposedDate: new Date(now.getTime() - 90 * 86400000), implementationDate: new Date(now.getTime() - 45 * 86400000), reviewDate: new Date(now.getTime() + 90 * 86400000),
      status: "implemented", requestedByName: "Admin User", requestedById: adminUser.id,
      approvedByName: "Jane Safety", approvedById: safetyUser.id, approvedAt: new Date(now.getTime() - 80 * 86400000),
      checklistTemplateId: mocTemplate.id, checklistCompleted: true,
    },
  });
  console.log("Created MOC change requests");

  // ── Comments & Audit Logs ────────────────────────────────────────────────────
  await Promise.all([
    prisma.comment.create({ data: { body: "Initial investigation confirmed. Forwarding to safety officer for review.", authorId: managerUser.id, nearMissId: nearMisses[0].id } }),
    prisma.comment.create({ data: { body: "Safety officer review complete. Assigning corrective actions.", authorId: safetyUser.id, nearMissId: nearMisses[0].id } }),
    prisma.comment.create({ data: { body: "Incident investigation initiated. Root cause analysis underway.", authorId: safetyUser.id, incidentId: incidents[2].id } }),
  ]);
  await Promise.all([
    prisma.auditLog.create({ data: { entityType: "NearMiss", entityId: nearMisses[0].id, action: "UPDATE", changedById: safetyUser.id, changes: JSON.stringify({ previous: { status: "NEW" }, updated: { status: "UNDER_REVIEW" } }) } }),
    prisma.auditLog.create({ data: { entityType: "Incident", entityId: incidents[0].id, action: "UPDATE", changedById: safetyUser.id, changes: JSON.stringify({ previous: { status: "NEW" }, updated: { status: "CLOSED" } }) } }),
  ]);

  console.log("\n✅  Seeding complete!");
  console.log("\nDemo credentials (all passwords: Password123!):");
  console.log("  admin@sheqsnap.com       → Admin         (MOC Approver ✓)");
  console.log("  safety@sheqsnap.com      → Safety Officer (MOC Approver ✓)");
  console.log("  manager@sheqsnap.com     → Manager");
  console.log("  reporter@sheqsnap.com    → Reporter");
  console.log("  viewer@sheqsnap.com      → Viewer");
  console.log("  contractor@sheqsnap.com  → Contractor (ABC Construction)");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
