/**
 * Daily random SHEQ data insert — runs via cron until 2026-06-03
 * DATABASE_URL="file:./prisma/prod.db" npx tsx prisma/daily-insert.ts
 */
import { PrismaClient, SeverityLevel, NearMissStatus, IncidentStatus, ActionStatus, ActionPriority, LinkedType } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import path from "path";

// Stop after 2026-06-03
const END_DATE = new Date("2026-06-04T00:00:00Z");
if (new Date() >= END_DATE) {
  console.log("Daily insert schedule ended (past 2026-06-03). Exiting.");
  process.exit(0);
}

const rawUrl = process.env.DATABASE_URL ?? `file:./dev.db`;
const dbUrl = rawUrl.startsWith("file:./") || rawUrl.startsWith("file:../")
  ? `file:${path.resolve(rawUrl.replace(/^file:/, ""))}`
  : rawUrl;
const adapter = new PrismaLibSql({ url: dbUrl });
const prisma = new PrismaClient({ adapter });

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function daysFromNow(n: number) {
  return new Date(Date.now() + n * 86400000);
}
function daysAgo(n: number) {
  return new Date(Date.now() - n * 86400000);
}

async function main() {
  console.log(`[${new Date().toISOString()}] Running daily insert...`);

  // Fetch live user IDs
  const users = await prisma.user.findMany({ where: { active: true }, select: { id: true, email: true } });
  if (users.length === 0) { console.error("No users found — aborting."); process.exit(1); }

  const byEmail = (e: string) => users.find(u => u.email.includes(e))?.id ?? users[0].id;
  const adminId    = byEmail("admin");
  const safetyId   = byEmail("safety");
  const managerId  = byEmail("manager");
  const reporterId = byEmail("reporter");
  const allIds     = users.map(u => u.id);

  // Fetch existing near misses and incidents to link actions to
  const nmIds = (await prisma.nearMiss.findMany({ select: { id: true }, take: 20, orderBy: { createdAt: "desc" } })).map(r => r.id);
  const incIds = (await prisma.incident.findMany({ select: { id: true }, take: 20, orderBy: { createdAt: "desc" } })).map(r => r.id);

  const LOCATIONS = [
    "Warehouse Bay 3", "Production Line A", "Electrical Room B", "Loading Dock",
    "Chemical Store", "Roof Access", "Workshop", "Packing Area", "Cafeteria",
    "Boiler Room", "Pump Station", "Control Room", "Parking Lot", "Maintenance Bay",
    "Storage Yard", "Admin Block", "Conveyor Belt 2", "Substation", "Fire Pump Room",
  ];
  const RISK_CATS = ["Vehicle/Traffic", "Mechanical", "Electrical", "Slip/Trip/Fall", "Chemical", "Height", "Housekeeping", "PPE", "Fire", "Manual Handling", "Noise", "Ergonomics"];
  const INC_TYPES = ["First Aid", "Medical Treatment", "Lost Time Injury", "Property Damage", "Environmental", "Near Miss Escalation"];
  const INJURY_TYPES = ["Cut/Laceration", "Burn", "Fracture", "Strain/Sprain", "Chemical Exposure", "Bruising", "Eye Injury", "None"];
  const NM_DESCS = [
    "Unsecured load on racking nearly fell on passing worker.",
    "Worker observed not wearing required hearing protection in designated zone.",
    "Faulty electrical socket sparking in break room.",
    "Spill of lubricating oil on stairwell steps not cleaned promptly.",
    "Inadequate lighting in stairwell B — bulb replaced but issue was present for 2 days.",
    "Compressed air line found with crack near coupling — potential blowout risk.",
    "Forklift operating in pedestrian zone without spotter during busy shift.",
    "Emergency shower station found blocked by stored materials.",
    "Contractor working without induction badge on site.",
    "Overhead crane limit switch not functioning correctly — reported by operator.",
    "Fire extinguisher monthly inspection tag missing in warehouse section C.",
    "Worker caught hair in rotating shaft — no injury but safety guard was missing.",
    "Improper stacking of chemical drums in Zone B — unstable configuration.",
    "Hot work carried out without valid permit — discovered during routine walkthrough.",
    "Safety data sheet not available at point of use for new cleaning chemical.",
  ];
  const INC_DESCS = [
    "Worker slipped on wet surface in ablution block. Minor bruising to knee. First aid applied.",
    "Employee reported repetitive strain injury from sustained manual handling task.",
    "Finger trapped in press when guard was bypassed. Laceration requiring sutures.",
    "Chemical splash to eyes during decanting operation. Eye wash administered. Medical referral.",
    "Vehicle reversing in yard struck site fence. No injury. Significant property damage.",
    "Worker struck by swinging load from crane. Bruised shoulder. LTI — 5 days off.",
    "Electrical fault in control panel caused minor arc flash. PPE prevented injury.",
    "Worker inhaled dust from cutting operation — no respiratory protection. Medical observation.",
  ];
  const OBS_TASKS = [
    "Operating forklift in warehouse", "Manual handling of heavy drums", "Working at height on scaffolding",
    "Welding in workshop bay", "Chemical handling during production", "Loading/unloading delivery trucks",
    "Electrical panel maintenance", "Operating grinder without face shield", "Stacking pallets in storage area",
  ];
  const SAFE_BEHAVIOURS = [
    ["Wearing all required PPE", "Following correct procedure"],
    ["Housekeeping maintained around work area", "Correct tool selected for task"],
    ["Harness correctly fitted and anchored", "Buddy system followed"],
    ["LOTO correctly applied", "Pre-task inspection completed"],
    ["Good communication with team members", "Awareness of surrounding hazards demonstrated"],
  ];
  const UNSAFE_BEHAVIOURS = [
    ["PPE removed during task completion"],
    ["Shortcut taken bypassing isolation procedure"],
    ["Work area not barricaded as per standard"],
    ["Task started without toolbox talk"],
    ["Phone used while operating equipment"],
    ["Incorrect manual lifting technique observed"],
  ];

  let inserted = 0;

  // ── Near Misses (1–3) ──────────────────────────────────────────────────────
  const nmCount = rand(1, 3);
  for (let i = 0; i < nmCount; i++) {
    const sev = pick([SeverityLevel.LOW, SeverityLevel.MEDIUM, SeverityLevel.HIGH, SeverityLevel.CRITICAL]);
    const status = pick([NearMissStatus.NEW, NearMissStatus.UNDER_REVIEW, NearMissStatus.IN_PROGRESS, NearMissStatus.ACTION_REQUIRED]);
    const suffix = Math.random().toString(36).slice(2, 7).toUpperCase();
    const nm = await prisma.nearMiss.create({
      data: {
        referenceNo: `NM-${suffix}`,
        dateReported: daysAgo(rand(0, 2)),
        reportedById: pick([reporterId, safetyId, managerId]),
        location: pick(LOCATIONS),
        description: pick(NM_DESCS),
        riskCategory: pick(RISK_CATS),
        severityLevel: sev,
        immediateAction: pick(["Area secured and supervisor notified.", "Work stopped and reviewed.", "Hazard isolated pending corrective action."]),
        status,
        assignedUserId: pick([safetyId, managerId, null as any]),
        targetCloseDate: daysFromNow(rand(5, 21)),
      },
    });
    nmIds.push(nm.id);
    inserted++;
  }

  // ── Incidents (0–2) ────────────────────────────────────────────────────────
  const incCount = rand(0, 2);
  for (let i = 0; i < incCount; i++) {
    const sev = pick([SeverityLevel.LOW, SeverityLevel.MEDIUM, SeverityLevel.HIGH]);
    const status = pick([IncidentStatus.NEW, IncidentStatus.UNDER_REVIEW, IncidentStatus.IN_PROGRESS]);
    const suffix = Math.random().toString(36).slice(2, 7).toUpperCase();
    const inc = await prisma.incident.create({
      data: {
        referenceNo: `INC-${suffix}`,
        dateOfIncident: daysAgo(rand(0, 3)),
        dateReported: daysAgo(rand(0, 1)),
        reportedById: pick([reporterId, safetyId]),
        location: pick(LOCATIONS),
        incidentType: pick(INC_TYPES),
        description: pick(INC_DESCS),
        injuryType: pick(INJURY_TYPES),
        severityLevel: sev,
        immediateAction: "First aid provided. Area secured. Management notified.",
        status,
        assignedUserId: safetyId,
        dueDate: daysFromNow(14),
      },
    });
    incIds.push(inc.id);
    inserted++;
  }

  // ── Actions (1–4) ─────────────────────────────────────────────────────────
  const actCount = rand(1, 4);
  const ACTION_DESCS = [
    "Conduct refresher training on {risk} hazard awareness for all site personnel.",
    "Repair and replace defective safety guard in {location}.",
    "Update risk assessment for {location} to reflect current hazard.",
    "Conduct toolbox talk on {risk} with all shift workers.",
    "Install additional warning signage at {location}.",
    "Review and update emergency response procedure for {risk} incidents.",
    "Perform monthly PPE inspection and replace expired items.",
    "Brief supervisors on recent near miss trends and required interventions.",
    "Implement job rotation to reduce ergonomic strain on packing team.",
    "Schedule independent safety audit of {location}.",
  ];
  for (let i = 0; i < actCount; i++) {
    const suffix = Math.random().toString(36).slice(2, 7).toUpperCase();
    const linkedType = pick([LinkedType.NEAR_MISS, LinkedType.NEAR_MISS, LinkedType.INCIDENT, LinkedType.OTHER]);
    const descTemplate = pick(ACTION_DESCS);
    const desc = descTemplate.replace("{risk}", pick(RISK_CATS)).replace("{location}", pick(LOCATIONS));
    await prisma.action.create({
      data: {
        referenceNo: `ACT-${suffix}`,
        linkedType,
        nearMissId: linkedType === LinkedType.NEAR_MISS && nmIds.length > 0 ? pick(nmIds) : null,
        incidentId: linkedType === LinkedType.INCIDENT && incIds.length > 0 ? pick(incIds) : null,
        description: desc,
        ownerId: pick([safetyId, managerId, adminId]),
        priority: pick([ActionPriority.LOW, ActionPriority.MEDIUM, ActionPriority.HIGH, ActionPriority.CRITICAL]),
        dueDate: daysFromNow(rand(3, 30)),
        status: pick([ActionStatus.OPEN, ActionStatus.IN_PROGRESS]),
      },
    });
    inserted++;
  }

  // ── Behaviour Observation (0–2) ────────────────────────────────────────────
  const obsCount = rand(0, 2);
  for (let i = 0; i < obsCount; i++) {
    const risk = pick(["LOW", "MEDIUM", "HIGH"]);
    const likelihood = rand(1, 4);
    const impact = rand(2, 5);
    await prisma.behaviourObservation.create({
      data: {
        observationDate: daysAgo(rand(0, 2)),
        location: pick(LOCATIONS),
        site: "Main Site",
        observerName: pick(["Jane Safety", "Mark Manager", "Tom Reporter"]),
        observerId: pick([safetyId, managerId, reporterId]),
        teamObserved: pick(["Production Team A", "Maintenance Crew", "Warehouse Team", "Packing Team"]),
        workType: pick(["ROUTINE", "NON_ROUTINE", "MAINTENANCE"]),
        taskDescription: pick(OBS_TASKS),
        safeBehaviours: JSON.stringify(pick(SAFE_BEHAVIOURS)),
        unsafeBehaviours: JSON.stringify(pick(UNSAFE_BEHAVIOURS)),
        hazardsPresent: `${pick(RISK_CATS)} risk identified during observation.`,
        potentialConsequences: pick(["Minor injury", "Lost time injury", "Medical treatment required", "Significant property damage"]),
        riskLevel: risk,
        likelihoodScore: likelihood,
        impactScore: impact,
        riskScore: likelihood * impact,
        immediateActionTaken: pick(["Verbal reminder given on the spot.", "Work stopped and corrected.", "Supervisor notified and briefed worker."]),
        workStopped: Math.random() < 0.3,
        supervisorNotified: Math.random() < 0.5,
        rootCauses: JSON.stringify(pick([["Complacency", "Lack of supervision"], ["Time pressure", "Inadequate training"], ["Peer influence", "Habit"]])),
        workerEngaged: true,
        workerFeedback: pick(["Worker acknowledged the observation and agreed to change behaviour.", "Worker was receptive and noted the risk.", "Worker committed to following the correct procedure going forward."]),
        safetyCategory: pick(["PPE", "HOUSEKEEPING", "EQUIPMENT", "PROCEDURE", "ENVIRONMENT", "ERGONOMICS"]),
        status: pick(["OPEN", "OPEN", "IN_PROGRESS", "CLOSED"]),
        createdById: pick([safetyId, managerId]),
      },
    });
    inserted++;
  }

  // ── Induction (0–1, 50% chance) ────────────────────────────────────────────
  if (Math.random() < 0.5) {
    const INDUCTEE_NAMES = ["Site Worker A", "Contractor B", "New Employee C", "Visitor D", "Trainee E", "External Auditor F"];
    const INDUCTION_TYPES = ["Site Safety", "Fire & Emergency", "PPE", "Chemical Handling", "Equipment", "Environmental"];
    const suffix = Math.random().toString(36).slice(2, 7).toUpperCase();
    await prisma.induction.create({
      data: {
        referenceNo: `IND-${suffix}`,
        inducteeName: pick(INDUCTEE_NAMES),
        inducteeType: pick(["employee", "contractor"]),
        inductionType: pick(INDUCTION_TYPES),
        conductedByName: pick(["Jane Safety", "Mark Manager"]),
        conductedById: pick([safetyId, managerId]),
        conductedDate: daysAgo(rand(0, 2)),
        expiryDate: daysFromNow(rand(90, 365)),
        validityMonths: pick([6, 12, 24]),
        status: "current",
        createdById: safetyId,
      },
    });
    inserted++;
  }

  // ── License (0–1, 40% chance) ──────────────────────────────────────────────
  if (Math.random() < 0.4) {
    const LIC_TYPES = ["Forklift Operator", "Scaffolding Erection", "First Aid Level 1", "Fire Fighting Level 1", "Rigging & Slinging", "Confined Space Entry", "Working at Heights", "Explosive Actuated Tools"];
    const NAMES = ["Site Worker A", "Contractor B", "Tom Reporter", "New Staff Member", "John Operator"];
    const expiryDays = rand(-10, 400);
    const status = expiryDays < 0 ? "expired" : expiryDays < 30 ? "expiring_soon" : "active";
    const suffix = Math.random().toString(36).slice(2, 7).toUpperCase();
    await prisma.license.create({
      data: {
        holderName: pick(NAMES),
        holderType: pick(["employee", "contractor"]),
        licenseType: pick(LIC_TYPES),
        licenseNumber: `LIC-${suffix}`,
        issuedDate: daysAgo(rand(90, 730)),
        expiryDate: daysFromNow(expiryDays),
        status,
      },
    });
    inserted++;
  }

  // ── MOC / Change Request (0–1, 30% chance) ────────────────────────────────
  if (Math.random() < 0.3) {
    const CHANGE_TYPES = ["Process", "Equipment / Plant", "Document / Procedure", "Personnel", "Temporary Change"];
    const MOC_TITLES = [
      "Update shift handover procedure for night shift",
      "Replace ageing pump unit in Zone C",
      "Introduce daily pre-task risk assessment form",
      "Temporary change to PPE requirements during heatwave",
      "Update emergency contact list for revised management structure",
      "Install additional ventilation in confined space B",
      "Revise chemical handling SOP following supplier change",
      "Introduce buddy system for lone workers on afternoon shift",
    ];
    const suffix = Math.random().toString(36).slice(2, 7).toUpperCase();
    await prisma.changeRequest.create({
      data: {
        referenceNo: `MOC-${suffix}`,
        title: pick(MOC_TITLES),
        changeType: pick(CHANGE_TYPES),
        description: "Change initiated following recent safety review. Full details on file.",
        reason: "Identified as a corrective action from recent safety incident or risk assessment.",
        status: pick(["draft", "draft", "pending_approval"]),
        requestedByName: pick(["Jane Safety", "Mark Manager", "Admin User"]),
        requestedById: pick([safetyId, managerId, adminId]),
        proposedDate: daysFromNow(rand(3, 14)),
      },
    });
    inserted++;
  }

  console.log(`[${new Date().toISOString()}] Done — inserted ${inserted} records.`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
