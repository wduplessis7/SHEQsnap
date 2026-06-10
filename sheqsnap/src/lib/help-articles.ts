export interface HelpArticle {
  slug: string;
  title: string;
  description: string;
  category: "Modules" | "Administration" | "Reference";
  icon: string;
  order: number;
  filename: string; // actual .md filename in src/content/help/
}

export const helpArticles: HelpArticle[] = [
  {
    slug: "near-misses",
    title: "Near Misses",
    description: "How to report, manage, and resolve near-miss incidents.",
    category: "Modules",
    icon: "AlertTriangle",
    order: 1,
    filename: "Near-Misses.md",
  },
  {
    slug: "incidents",
    title: "Incidents",
    description: "Logging and tracking workplace incidents from report to closure.",
    category: "Modules",
    icon: "FileWarning",
    order: 2,
    filename: "Incidents.md",
  },
  {
    slug: "actions",
    title: "Actions Register",
    description: "Assign, track, and close corrective actions across the organisation.",
    category: "Modules",
    icon: "CheckSquare",
    order: 3,
    filename: "Actions.md",
  },
  {
    slug: "approvals",
    title: "Approvals Workflow",
    description: "Review and approve submitted near misses and incidents.",
    category: "Modules",
    icon: "ClipboardCheck",
    order: 4,
    filename: "Approvals.md",
  },
  {
    slug: "reports",
    title: "Reports & Exports",
    description: "Generate safety reports, charts, and export data to PDF or Excel.",
    category: "Modules",
    icon: "BarChart3",
    order: 5,
    filename: "Reports-and-Exports.md",
  },
  {
    slug: "behaviour-observations",
    title: "Behaviour Observations",
    description: "Record and manage Behaviour-Based Safety (BBS) observations on site.",
    category: "Modules",
    icon: "Eye",
    order: 6,
    filename: "Behaviour-Observations.md",
  },
  {
    slug: "toolbox-talks",
    title: "Toolbox Talks",
    description: "Generate AI-powered pre-shift safety briefings based on recent incidents and near misses.",
    category: "Modules",
    icon: "MessageSquare",
    order: 7,
    filename: "Toolbox-Talks.md",
  },
  {
    slug: "ai-intelligence",
    title: "AI Intelligence",
    description: "AI-powered safety analysis, risk forecasting, and toolbox talk generation.",
    category: "Modules",
    icon: "Brain",
    order: 8,
    filename: "AI-Intelligence.md",
  },
  {
    slug: "license-manager",
    title: "License Manager",
    description: "Track licences, permits, legal appointments, and certifications with expiry notifications.",
    category: "Modules",
    icon: "FileCheck",
    order: 9,
    filename: "License-Manager.md",
  },
  {
    slug: "inductions",
    title: "Inductions & Training",
    description: "Track employee and contractor inductions, validity periods, and expiry dates.",
    category: "Modules",
    icon: "GraduationCap",
    order: 10,
    filename: "Inductions.md",
  },
  {
    slug: "moc",
    title: "Management of Change (MOC)",
    description: "Raise, track, and approve changes to processes, equipment, documents, and personnel.",
    category: "Modules",
    icon: "GitPullRequest",
    order: 11,
    filename: "MOC.md",
  },
  {
    slug: "contractors",
    title: "Contractor Management",
    description: "Manage contractor access, roles, and safety compliance.",
    category: "Modules",
    icon: "HardHat",
    order: 12,
    filename: "Contractor-Management.md",
  },
  {
    slug: "admin-config",
    title: "Admin Configuration",
    description: "Configure companies, departments, users, and system settings.",
    category: "Administration",
    icon: "Settings",
    order: 1,
    filename: "Admin-Configuration.md",
  },
  {
    slug: "audit-trail",
    title: "Audit Trail & Compliance",
    description: "View system audit logs and ensure regulatory compliance.",
    category: "Reference",
    icon: "Shield",
    order: 1,
    filename: "Audit-Trail.md",
  },
];

export const categories = [
  "Modules",
  "Administration",
  "Reference",
] as const;

export function getArticleBySlug(slug: string): HelpArticle | undefined {
  return helpArticles.find((a) => a.slug === slug);
}

export function getArticlesByCategory(
  category: string
): HelpArticle[] {
  return helpArticles
    .filter((a) => a.category === category)
    .sort((a, b) => a.order - b.order);
}

export function getPrevNextArticles(slug: string): {
  prev: HelpArticle | null;
  next: HelpArticle | null;
} {
  const index = helpArticles.findIndex((a) => a.slug === slug);
  return {
    prev: index > 0 ? helpArticles[index - 1] : null,
    next: index < helpArticles.length - 1 ? helpArticles[index + 1] : null,
  };
}
