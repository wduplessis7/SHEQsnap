export interface HelpArticle {
  slug: string;
  title: string;
  description: string;
  category: "Getting Started" | "Modules" | "Administration" | "Reference";
  icon: string;
  order: number;
  filename: string; // actual .md filename in src/content/help/
}

export const helpArticles: HelpArticle[] = [
  {
    slug: "overview",
    title: "SHEQsnap Overview",
    description: "An introduction to SHEQsnap and what the system does.",
    category: "Getting Started",
    icon: "BookOpen",
    order: 1,
    filename: "Home.md",
  },
  {
    slug: "getting-started",
    title: "Getting Started",
    description: "Step-by-step guide to setting up and using SHEQsnap for the first time.",
    category: "Getting Started",
    icon: "Rocket",
    order: 2,
    filename: "Getting-Started.md",
  },
  {
    slug: "roles-permissions",
    title: "User Roles & Permissions",
    description: "Understand the different user roles and what each can access.",
    category: "Getting Started",
    icon: "Users",
    order: 3,
    filename: "User-Roles-and-Permissions.md",
  },
  {
    slug: "dashboard",
    title: "Dashboard Guide",
    description: "Navigate the dashboard and understand the key metrics and widgets.",
    category: "Getting Started",
    icon: "LayoutDashboard",
    order: 4,
    filename: "Dashboard.md",
  },
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
    slug: "log-register",
    title: "Log Register",
    description: "Record and manage operational safety logs and entries.",
    category: "Modules",
    icon: "ClipboardList",
    order: 4,
    filename: "Log-Register.md",
  },
  {
    slug: "approvals",
    title: "Approvals Workflow",
    description: "Review and approve submitted near misses and incidents.",
    category: "Modules",
    icon: "ClipboardCheck",
    order: 5,
    filename: "Approvals.md",
  },
  {
    slug: "contractors",
    title: "Contractor Management",
    description: "Manage contractor access, roles, and safety compliance.",
    category: "Modules",
    icon: "HardHat",
    order: 6,
    filename: "Contractor-Management.md",
  },
  {
    slug: "reports",
    title: "Reports & Exports",
    description: "Generate safety reports and export data to PDF or Excel.",
    category: "Modules",
    icon: "BarChart3",
    order: 7,
    filename: "Reports-and-Exports.md",
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
  "Getting Started",
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
