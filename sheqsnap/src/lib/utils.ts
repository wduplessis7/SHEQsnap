import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, isAfter, parseISO } from "date-fns";
import { prisma } from "./prisma";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "dd MMM yyyy");
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "dd MMM yyyy HH:mm");
}

export function isOverdue(dueDate: Date | string | null | undefined, status: string): boolean {
  if (!dueDate) return false;
  const closedStatuses = ["COMPLETED", "CANCELLED", "CLOSED"];
  if (closedStatuses.includes(status)) return false;
  const d = typeof dueDate === "string" ? parseISO(dueDate) : dueDate;
  return isAfter(new Date(), d);
}

export async function generateReferenceNo(prefix: string, model: "nearMiss" | "incident" | "action" | "logEntry" | "legalAppointment" | "chemical"): Promise<string> {
  let count = 0;
  if (model === "nearMiss") {
    count = await prisma.nearMiss.count();
  } else if (model === "incident") {
    count = await prisma.incident.count();
  } else if (model === "logEntry") {
    count = await prisma.logEntry.count();
  } else if (model === "legalAppointment") {
    count = await prisma.legalAppointment.count();
  } else if (model === "chemical") {
    count = await (prisma as any).chemical.count();
  } else {
    count = await prisma.action.count();
  }
  return `${prefix}${String(count + 1).padStart(4, "0")}`;
}

export const SEVERITY_COLORS = {
  LOW: "bg-green-100 text-green-800",
  MEDIUM: "bg-yellow-100 text-yellow-800",
  HIGH: "bg-orange-100 text-orange-800",
  CRITICAL: "bg-red-100 text-red-800",
};

export const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-800",
  PENDING_APPROVAL: "bg-orange-100 text-orange-800",
  SUBMITTED: "bg-purple-100 text-purple-800",
  UNDER_REVIEW: "bg-indigo-100 text-indigo-800",
  ACTION_REQUIRED: "bg-orange-100 text-orange-800",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800",
  CLOSED: "bg-gray-100 text-gray-800",
  CANCELLED: "bg-red-100 text-red-800",
  OPEN: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-green-100 text-green-800",
  OVERDUE: "bg-red-100 text-red-800",
};

export const RISK_CATEGORY_GROUPS: { group: string; items: string[] }[] = [
  {
    group: "HR",
    items: ["Bullying / Harassment", "Fatigue", "Labour Relations", "Staffing / Competency", "Welfare"],
  },
  {
    group: "Safety",
    items: ["Confined Space", "Electrical", "Explosives / Blasting", "Fall from Height", "Fire / Explosion", "Housekeeping", "Lifting / Rigging", "Machinery / Equipment", "Manual Handling", "PPE", "Slip / Trip / Fall", "Struck By / Against", "Vehicle / Traffic"],
  },
  {
    group: "Health",
    items: ["Chemical Exposure", "Dust / Airborne Contaminants", "Ergonomics", "Noise / Vibration", "Occupational Disease", "Radiation", "Temperature Extremes"],
  },
  {
    group: "Environment",
    items: ["Air Pollution / Emissions", "Land Contamination", "Spill / Leak", "Waste Management", "Water Pollution", "Wildlife / Ecological Impact"],
  },
  {
    group: "Quality",
    items: ["Customer Complaint", "Document / Record Error", "Non-Conformance", "Process Deviation", "Product Defect"],
  },
  {
    group: "Asset / Maintenance",
    items: ["Corrosion / Deterioration", "Equipment Failure", "Infrastructure Damage", "Planned Maintenance Overdue", "Statutory Inspection Due"],
  },
];

export const RISK_CATEGORIES = RISK_CATEGORY_GROUPS.flatMap((g) => g.items);

export const INCIDENT_TYPES = ["Safety", "Health", "Environment", "Quality", "Multiple"];

export const IMPACT_TYPES_BY_INCIDENT: Record<string, string[]> = {
  Safety: ["Near Miss", "First Aid Case", "Medical Treatment Case", "Lost Time Injury", "Permanent Disability", "Fatality", "Property Damage", "None"],
  Health: ["Occupational Illness", "Disease / Infection", "Chemical Exposure", "Noise-Induced Hearing Loss", "Mental Health / Stress", "Ergonomic Injury", "None"],
  Environment: ["Spill / Leak", "Air Emission", "Water Pollution", "Land Contamination", "Waste Non-Compliance", "Wildlife / Ecological Impact", "None"],
  Quality: ["Product Defect", "Process Non-Conformance", "Customer Complaint", "Document Error", "None"],
  Multiple: ["See description", "None"],
};

export const INJURY_TYPES = [
  "None",
  "Cut/Laceration",
  "Bruise/Contusion",
  "Fracture",
  "Burn",
  "Sprain/Strain",
  "Eye Injury",
  "Hearing Loss",
  "Chemical Exposure",
  "Fatality",
  "Other",
];

export async function writeAuditLog(
  entityType: string,
  entityId: string,
  action: string,
  changedById: string,
  changes: object
) {
  await prisma.auditLog.create({
    data: {
      entityType,
      entityId,
      action,
      changedById,
      changes: JSON.stringify(changes),
    },
  });
}
