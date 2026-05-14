import { PrismaClient, Role, SeverityLevel, NearMissStatus, IncidentStatus, ActionStatus, ActionPriority, LinkedType } from "@prisma/client";
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

  // Clear existing data
  await prisma.auditLog.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.action.deleteMany();
  await prisma.nearMiss.deleteMany();
  await prisma.incident.deleteMany();
  await prisma.userGroup.deleteMany();
  await prisma.user.deleteMany();
  await prisma.group.deleteMany();
  await prisma.department.deleteMany();

  // Departments
  const depts = await Promise.all([
    prisma.department.create({ data: { name: "Safety", site: "Main Site" } }),
    prisma.department.create({ data: { name: "Operations", site: "Main Site" } }),
    prisma.department.create({ data: { name: "Maintenance", site: "Main Site" } }),
    prisma.department.create({ data: { name: "HR", site: "Head Office" } }),
    prisma.department.create({ data: { name: "Finance", site: "Head Office" } }),
  ]);
  const [safetyDept, opsDept, maintDept, hrDept, financeDept] = depts;
  console.log("Created departments");

  // Groups
  const [safetyTeam, opsTeam, mgmtTeam] = await Promise.all([
    prisma.group.create({ data: { name: "Safety Team", description: "SHEQ Safety Officers and Officers" } }),
    prisma.group.create({ data: { name: "Operations Team", description: "Operations staff and supervisors" } }),
    prisma.group.create({ data: { name: "Management", description: "Management and executive team" } }),
  ]);
  console.log("Created groups");

  // Users
  const hash = async (pwd: string) => bcrypt.hash(pwd, 12);
  const [adminUser, safetyUser, managerUser, reporterUser, viewerUser] = await Promise.all([
    prisma.user.create({
      data: { name: "Admin User", email: "admin@sheqsnap.com", password: await hash("Password123!"), role: Role.ADMIN, departmentId: safetyDept.id, active: true },
    }),
    prisma.user.create({
      data: { name: "Jane Safety", email: "safety@sheqsnap.com", password: await hash("Password123!"), role: Role.SAFETY_OFFICER, departmentId: safetyDept.id, active: true },
    }),
    prisma.user.create({
      data: { name: "Mark Manager", email: "manager@sheqsnap.com", password: await hash("Password123!"), role: Role.MANAGER, departmentId: opsDept.id, active: true },
    }),
    prisma.user.create({
      data: { name: "Tom Reporter", email: "reporter@sheqsnap.com", password: await hash("Password123!"), role: Role.REPORTER, departmentId: maintDept.id, active: true },
    }),
    prisma.user.create({
      data: { name: "Vicky Viewer", email: "viewer@sheqsnap.com", password: await hash("Password123!"), role: Role.VIEWER, departmentId: hrDept.id, active: true },
    }),
  ]);
  console.log("Created users");

  // Group memberships
  await Promise.all([
    prisma.userGroup.create({ data: { userId: adminUser.id, groupId: safetyTeam.id } }),
    prisma.userGroup.create({ data: { userId: safetyUser.id, groupId: safetyTeam.id } }),
    prisma.userGroup.create({ data: { userId: managerUser.id, groupId: mgmtTeam.id } }),
    prisma.userGroup.create({ data: { userId: managerUser.id, groupId: opsTeam.id } }),
    prisma.userGroup.create({ data: { userId: reporterUser.id, groupId: opsTeam.id } }),
  ]);

  // Near Misses
  const nmData = [
    { ref: "NM0001", dept: safetyDept.id, location: "Warehouse Bay 3", desc: "Forklift nearly struck a pedestrian when reversing. No warning signals were activated.", risk: "Vehicle/Traffic", sev: SeverityLevel.HIGH, status: NearMissStatus.UNDER_REVIEW, assigned: safetyUser.id, daysAgo: 5, targetDays: 10 },
    { ref: "NM0002", dept: opsDept.id, location: "Production Line A", desc: "Loose guard on conveyor belt detected during routine inspection.", risk: "Mechanical", sev: SeverityLevel.MEDIUM, status: NearMissStatus.IN_PROGRESS, assigned: managerUser.id, daysAgo: 10, targetDays: 7 },
    { ref: "NM0003", dept: maintDept.id, location: "Electrical Room B", desc: "Exposed wiring found behind panel during maintenance. Area was temporarily unsecured.", risk: "Electrical", sev: SeverityLevel.CRITICAL, status: NearMissStatus.ACTION_REQUIRED, assigned: safetyUser.id, daysAgo: 2, targetDays: 5 },
    { ref: "NM0004", dept: opsDept.id, location: "Loading Dock", desc: "Spill of hydraulic fluid on floor not immediately cleaned, creating slip hazard.", risk: "Slip/Trip/Fall", sev: SeverityLevel.LOW, status: NearMissStatus.CLOSED, assigned: reporterUser.id, daysAgo: 30, targetDays: -5 },
    { ref: "NM0005", dept: safetyDept.id, location: "Chemical Store", desc: "Incompatible chemicals stored in close proximity without proper segregation.", risk: "Chemical", sev: SeverityLevel.HIGH, status: NearMissStatus.SUBMITTED, assigned: safetyUser.id, daysAgo: 3, targetDays: 14 },
    { ref: "NM0006", dept: maintDept.id, location: "Roof Access", desc: "Worker observed without harness while working at height on roof.", risk: "Height", sev: SeverityLevel.CRITICAL, status: NearMissStatus.CLOSED, assigned: managerUser.id, daysAgo: 45, targetDays: -30 },
    { ref: "NM0007", dept: opsDept.id, location: "Cafeteria", desc: "Wet floor sign not placed after mopping, creating slip hazard.", risk: "Housekeeping", sev: SeverityLevel.LOW, status: NearMissStatus.NEW, assigned: null, daysAgo: 1, targetDays: 7 },
    { ref: "NM0008", dept: safetyDept.id, location: "PPE Store", desc: "Expired hard hats found in PPE distribution point.", risk: "PPE", sev: SeverityLevel.MEDIUM, status: NearMissStatus.ACTION_REQUIRED, assigned: safetyUser.id, daysAgo: 7, targetDays: 5 },
    { ref: "NM0009", dept: maintDept.id, location: "Workshop", desc: "Grinding sparks landed near flammable material storage during unplanned work.", risk: "Fire", sev: SeverityLevel.HIGH, status: NearMissStatus.UNDER_REVIEW, assigned: safetyUser.id, daysAgo: 4, targetDays: 10 },
    { ref: "NM0010", dept: opsDept.id, location: "Packing Area", desc: "Heavy box fell from unsecured shelf narrowly missing worker.", risk: "Manual Handling", sev: SeverityLevel.MEDIUM, status: NearMissStatus.IN_PROGRESS, assigned: managerUser.id, daysAgo: 8, targetDays: 14 },
  ];

  const nearMisses = [];
  for (const nm of nmData) {
    const now = new Date();
    const dateReported = new Date(now.getTime() - nm.daysAgo * 24 * 60 * 60 * 1000);
    const targetClose = new Date(now.getTime() + nm.targetDays * 24 * 60 * 60 * 1000);
    const created = await prisma.nearMiss.create({
      data: {
        referenceNo: nm.ref,
        dateReported,
        reportedById: reporterUser.id,
        departmentId: nm.dept,
        location: nm.location,
        description: nm.desc,
        riskCategory: nm.risk,
        severityLevel: nm.sev,
        immediateAction: "Area secured immediately. Supervisor notified.",
        status: nm.status,
        assignedUserId: nm.assigned,
        targetCloseDate: targetClose,
        actualCloseDate: nm.status === NearMissStatus.CLOSED ? new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000) : null,
      },
    });
    nearMisses.push(created);
  }
  console.log("Created near misses");

  // Incidents
  const incData = [
    { ref: "INC0001", dept: opsDept.id, location: "Assembly Line 2", type: "First Aid", desc: "Worker cut hand on sharp metal edge while assembling parts. First aid administered.", injury: "Cut/Laceration", sev: SeverityLevel.LOW, status: IncidentStatus.CLOSED, daysAgo: 60 },
    { ref: "INC0002", dept: maintDept.id, location: "Boiler Room", type: "Medical Treatment", desc: "Maintenance technician suffered burns to forearm from steam pipe.", injury: "Burn", sev: SeverityLevel.MEDIUM, status: IncidentStatus.CLOSED, daysAgo: 45 },
    { ref: "INC0003", dept: opsDept.id, location: "Warehouse", type: "Lost Time Injury", desc: "Worker slipped on wet floor and fractured wrist. Away from work for 3 weeks.", injury: "Fracture", sev: SeverityLevel.HIGH, status: IncidentStatus.IN_PROGRESS, daysAgo: 20 },
    { ref: "INC0004", dept: safetyDept.id, location: "Parking Lot", type: "Property Damage", desc: "Company vehicle struck by another vehicle in parking lot. Significant damage.", injury: "None", sev: SeverityLevel.MEDIUM, status: IncidentStatus.UNDER_REVIEW, daysAgo: 15 },
    { ref: "INC0005", dept: maintDept.id, location: "Chemical Storage", type: "Environmental", desc: "Chemical spill leaked to drainage system. Environmental authority notified.", injury: "None", sev: SeverityLevel.CRITICAL, status: IncidentStatus.ACTION_REQUIRED, daysAgo: 10 },
    { ref: "INC0006", dept: opsDept.id, location: "Production Floor", type: "First Aid", desc: "Worker caught finger in machine guard. Minor laceration treated on site.", injury: "Cut/Laceration", sev: SeverityLevel.LOW, status: IncidentStatus.CLOSED, daysAgo: 90 },
    { ref: "INC0007", dept: safetyDept.id, location: "Office Building", type: "Medical Treatment", desc: "Employee developed symptoms of chemical exposure after incorrect mixing of cleaning products.", injury: "Chemical Exposure", sev: SeverityLevel.HIGH, status: IncidentStatus.IN_PROGRESS, daysAgo: 5 },
    { ref: "INC0008", dept: opsDept.id, location: "Roof", type: "Lost Time Injury", desc: "Worker fell from height approximately 2 meters. Multiple injuries. Full investigation underway.", injury: "Fracture", sev: SeverityLevel.CRITICAL, status: IncidentStatus.UNDER_REVIEW, daysAgo: 7 },
  ];

  const incidents = [];
  for (const inc of incData) {
    const now = new Date();
    const dateOfIncident = new Date(now.getTime() - inc.daysAgo * 24 * 60 * 60 * 1000);
    const dueDate = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    const created = await prisma.incident.create({
      data: {
        referenceNo: inc.ref,
        dateOfIncident,
        dateReported: dateOfIncident,
        reportedById: reporterUser.id,
        departmentId: inc.dept,
        location: inc.location,
        incidentType: inc.type,
        description: inc.desc,
        personsInvolved: "Employee (details on file)",
        injuryType: inc.injury,
        severityLevel: inc.sev,
        rootCause: "Under investigation",
        immediateAction: "First aid provided. Area secured. Incident reported to management.",
        status: inc.status,
        assignedUserId: safetyUser.id,
        dueDate,
        closureDate: inc.status === IncidentStatus.CLOSED ? new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000) : null,
        investigationNotes: (inc.status as string) !== "NEW" ? "Initial investigation complete. Final report pending." : null,
      },
    });
    incidents.push(created);
  }
  console.log("Created incidents");

  // Actions
  const now = new Date();
  const actionData = [
    { ref: "ACT0001", linkedType: LinkedType.NEAR_MISS, nmIdx: 0, desc: "Install audible and visual reverse warning on all forklifts", owner: managerUser.id, priority: ActionPriority.HIGH, dueDays: 14, status: ActionStatus.IN_PROGRESS },
    { ref: "ACT0002", linkedType: LinkedType.NEAR_MISS, nmIdx: 0, desc: "Demarcate pedestrian walkways in all warehouse areas with yellow paint", owner: safetyUser.id, priority: ActionPriority.HIGH, dueDays: 21, status: ActionStatus.OPEN },
    { ref: "ACT0003", linkedType: LinkedType.NEAR_MISS, nmIdx: 1, desc: "Replace damaged conveyor belt guard. Do not operate machine until guard is replaced.", owner: reporterUser.id, priority: ActionPriority.CRITICAL, dueDays: 2, status: ActionStatus.COMPLETED },
    { ref: "ACT0004", linkedType: LinkedType.NEAR_MISS, nmIdx: 2, desc: "Rectify exposed wiring in electrical room B. Conduct full electrical audit.", owner: managerUser.id, priority: ActionPriority.CRITICAL, dueDays: 3, status: ActionStatus.IN_PROGRESS, escalation: true },
    { ref: "ACT0005", linkedType: LinkedType.NEAR_MISS, nmIdx: 4, desc: "Review chemical storage layout. Implement proper segregation per SDS requirements.", owner: safetyUser.id, priority: ActionPriority.HIGH, dueDays: 10, status: ActionStatus.OPEN },
    { ref: "ACT0006", linkedType: LinkedType.NEAR_MISS, nmIdx: 7, desc: "Replace all expired PPE. Implement monthly PPE inspection procedure.", owner: safetyUser.id, priority: ActionPriority.MEDIUM, dueDays: 7, status: ActionStatus.OPEN },
    { ref: "ACT0007", linkedType: LinkedType.NEAR_MISS, nmIdx: 8, desc: "Enforce hot work permit system. Brief all maintenance staff.", owner: managerUser.id, priority: ActionPriority.HIGH, dueDays: 5, status: ActionStatus.IN_PROGRESS },
    { ref: "ACT0008", linkedType: LinkedType.INCIDENT, incIdx: 2, desc: "Install non-slip matting in all wet areas. Increase housekeeping frequency.", owner: managerUser.id, priority: ActionPriority.HIGH, dueDays: 14, status: ActionStatus.OPEN },
    { ref: "ACT0009", linkedType: LinkedType.INCIDENT, incIdx: 4, desc: "Conduct environmental impact assessment. Remediate affected drainage.", owner: safetyUser.id, priority: ActionPriority.CRITICAL, dueDays: 7, status: ActionStatus.IN_PROGRESS, escalation: true },
    { ref: "ACT0010", linkedType: LinkedType.INCIDENT, incIdx: 6, desc: "Retrain all staff on chemical handling procedures. Update MSDS records.", owner: safetyUser.id, priority: ActionPriority.HIGH, dueDays: 14, status: ActionStatus.OPEN },
    { ref: "ACT0011", linkedType: LinkedType.INCIDENT, incIdx: 7, desc: "Inspect all roof access points. Install fall arrest systems on all elevated work areas.", owner: managerUser.id, priority: ActionPriority.CRITICAL, dueDays: -3, status: ActionStatus.OPEN, escalation: true },
    { ref: "ACT0012", linkedType: LinkedType.OTHER, desc: "Conduct quarterly safety walk with management team", owner: safetyUser.id, priority: ActionPriority.LOW, dueDays: 30, status: ActionStatus.OPEN },
    { ref: "ACT0013", linkedType: LinkedType.OTHER, desc: "Update emergency evacuation plan and conduct drill", owner: safetyUser.id, priority: ActionPriority.MEDIUM, dueDays: -7, status: ActionStatus.OPEN },
    { ref: "ACT0014", linkedType: LinkedType.OTHER, desc: "Review and update risk register for all departments", owner: adminUser.id, priority: ActionPriority.MEDIUM, dueDays: 45, status: ActionStatus.OPEN },
    { ref: "ACT0015", linkedType: LinkedType.INCIDENT, incIdx: 0, desc: "Update first aid kit contents and training records", owner: safetyUser.id, priority: ActionPriority.LOW, dueDays: 30, status: ActionStatus.COMPLETED },
  ];

  for (const act of actionData) {
    const dueDate = new Date(now.getTime() + act.dueDays * 24 * 60 * 60 * 1000);
    await prisma.action.create({
      data: {
        referenceNo: act.ref,
        linkedType: act.linkedType,
        nearMissId: act.linkedType === LinkedType.NEAR_MISS && act.nmIdx !== undefined ? nearMisses[act.nmIdx].id : null,
        incidentId: act.linkedType === LinkedType.INCIDENT && act.incIdx !== undefined ? incidents[act.incIdx].id : null,
        description: act.desc,
        ownerId: act.owner,
        priority: act.priority,
        dueDate,
        status: act.status,
        escalationFlag: act.escalation || false,
        completionNotes: act.status === ActionStatus.COMPLETED ? "Action completed successfully. Verified by safety officer." : null,
        dateCompleted: act.status === ActionStatus.COMPLETED ? new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000) : null,
      },
    });
  }
  console.log("Created actions");

  // Add some audit logs
  await Promise.all([
    prisma.auditLog.create({ data: { entityType: "NearMiss", entityId: nearMisses[0].id, action: "UPDATE", changedById: safetyUser.id, changes: JSON.stringify({ previous: { status: "NEW" }, updated: { status: "UNDER_REVIEW" } }) } }),
    prisma.auditLog.create({ data: { entityType: "Incident", entityId: incidents[0].id, action: "UPDATE", changedById: safetyUser.id, changes: JSON.stringify({ previous: { status: "NEW" }, updated: { status: "CLOSED" } }) } }),
  ]);

  // Add some comments
  await Promise.all([
    prisma.comment.create({ data: { body: "Initial investigation confirmed. Forwarding to safety officer for review.", authorId: managerUser.id, nearMissId: nearMisses[0].id } }),
    prisma.comment.create({ data: { body: "Safety officer review complete. Assigning corrective actions.", authorId: safetyUser.id, nearMissId: nearMisses[0].id } }),
    prisma.comment.create({ data: { body: "Incident investigation initiated. Root cause analysis underway.", authorId: safetyUser.id, incidentId: incidents[2].id } }),
  ]);

  console.log("Seeding complete!");
  console.log("\nDemo users:");
  console.log("  admin@sheqsnap.com   / Password123! (Admin)");
  console.log("  safety@sheqsnap.com  / Password123! (Safety Officer)");
  console.log("  manager@sheqsnap.com / Password123! (Manager)");
  console.log("  reporter@sheqsnap.com/ Password123! (Reporter)");
  console.log("  viewer@sheqsnap.com  / Password123! (Viewer)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
