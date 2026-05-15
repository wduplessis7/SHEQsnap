export type OnboardingStep = {
  id: string;
  title: string;
  description: string;
  action: string;
  href: string;
  helpSlug?: string;
  icon: string;
};

export type RoleOnboarding = {
  welcomeTitle: string;
  welcomeMessage: string;
  steps: OnboardingStep[];
};

export const onboardingByRole: Record<string, RoleOnboarding> = {
  ADMIN: {
    welcomeTitle: "Welcome to SHEQsnap, Admin!",
    welcomeMessage:
      "As an Administrator, you have full access to configure and manage the system. Let's get your workspace set up so your team can start reporting safely.",
    steps: [
      {
        id: "admin-departments",
        title: "Set up your departments",
        description: "Create the departments or sites in your organisation so reports can be categorised correctly.",
        action: "Set Up Departments",
        href: "/admin/departments",
        icon: "Building2",
      },
      {
        id: "admin-groups",
        title: "Create user groups",
        description: "Group users by team or function to streamline assignment and approvals.",
        action: "Create Groups",
        href: "/admin/groups",
        icon: "Users",
      },
      {
        id: "admin-users",
        title: "Add your team members",
        description: "Invite the people who will be reporting, reviewing, and approving safety records.",
        action: "Add Users",
        href: "/admin/users",
        icon: "UserPlus",
      },
      {
        id: "admin-companies",
        title: "Add contractor companies",
        description: "Register the external companies and contractors who work on your site.",
        action: "Add Companies",
        href: "/admin/companies",
        icon: "HardHat",
      },
      {
        id: "admin-dashboard",
        title: "Explore the dashboard",
        description: "Get an overview of your safety metrics, open actions, and recent activity.",
        action: "View Dashboard",
        href: "/dashboard",
        icon: "LayoutDashboard",
      },
      {
        id: "admin-guide",
        title: "Read the Admin Guide",
        description: "Learn how to configure approvals, manage roles, and customise the system.",
        action: "Read Guide",
        href: "/help/admin-config",
        helpSlug: "admin-config",
        icon: "BookOpen",
      },
    ],
  },

  MANAGER: {
    welcomeTitle: "Welcome to SHEQsnap!",
    welcomeMessage:
      "As a Manager, you have oversight of safety records, approvals, and team performance. Here's how to get started.",
    steps: [
      {
        id: "manager-dashboard",
        title: "Review your dashboard",
        description: "See an overview of open near misses, incidents, and overdue actions assigned to your team.",
        action: "View Dashboard",
        href: "/dashboard",
        icon: "LayoutDashboard",
      },
      {
        id: "manager-near-misses",
        title: "Learn about Near Misses",
        description: "Understand how near miss reports are submitted, reviewed, and closed.",
        action: "Learn More",
        href: "/help/near-misses",
        helpSlug: "near-misses",
        icon: "AlertTriangle",
      },
      {
        id: "manager-incidents",
        title: "Understand Incidents",
        description: "Learn the incident reporting and investigation workflow.",
        action: "Learn More",
        href: "/help/incidents",
        helpSlug: "incidents",
        icon: "FileWarning",
      },
      {
        id: "manager-actions",
        title: "Check the Actions Register",
        description: "Review open corrective actions and ensure they're being progressed.",
        action: "View Actions",
        href: "/actions",
        icon: "CheckSquare",
      },
      {
        id: "manager-reports",
        title: "Review Reports",
        description: "Access analytics and summary reports for your site or department.",
        action: "View Reports",
        href: "/reports",
        icon: "BarChart3",
      },
      {
        id: "manager-approvals",
        title: "Set up approval workflow",
        description: "Understand how approvals work and what happens when you approve or reject a record.",
        action: "Learn More",
        href: "/help/approvals",
        helpSlug: "approvals",
        icon: "ClipboardCheck",
      },
    ],
  },

  SAFETY_OFFICER: {
    welcomeTitle: "Welcome, Safety Officer!",
    welcomeMessage:
      "You're the safety champion. Your role is to capture, review, and manage safety events on site. Let's get you up to speed.",
    steps: [
      {
        id: "so-dashboard",
        title: "Explore your dashboard",
        description: "Your dashboard gives you a real-time view of all safety activity on site.",
        action: "View Dashboard",
        href: "/dashboard",
        icon: "LayoutDashboard",
      },
      {
        id: "so-near-miss",
        title: "Log your first Near Miss",
        description: "Practice submitting a near miss report so you're ready to capture real events.",
        action: "Log Near Miss",
        href: "/near-misses/new",
        icon: "AlertTriangle",
      },
      {
        id: "so-approvals",
        title: "Understand the Approvals queue",
        description: "Review records awaiting your sign-off or action.",
        action: "View Approvals",
        href: "/approvals",
        icon: "ClipboardCheck",
      },
      {
        id: "so-actions",
        title: "Review the Actions Register",
        description: "Track corrective and preventive actions arising from safety events.",
        action: "View Actions",
        href: "/actions",
        icon: "CheckSquare",
      },
      {
        id: "so-reports",
        title: "Explore Reports",
        description: "Generate and review safety performance reports.",
        action: "View Reports",
        href: "/reports",
        icon: "BarChart3",
      },
      {
        id: "so-guide",
        title: "Read the Safety Officer guide",
        description: "Deep-dive into roles, permissions, and best practices.",
        action: "Read Guide",
        href: "/help/roles-permissions",
        helpSlug: "roles-permissions",
        icon: "BookOpen",
      },
    ],
  },

  REPORTER: {
    welcomeTitle: "Welcome to SHEQsnap!",
    welcomeMessage:
      "Your role is to report safety events so we can investigate and improve. You don't need to be an expert — just capture what happened.",
    steps: [
      {
        id: "reporter-overview",
        title: "Welcome to SHEQsnap",
        description: "Learn what SHEQsnap is and how it helps keep everyone safe.",
        action: "Read Overview",
        href: "/help/overview",
        helpSlug: "overview",
        icon: "BookOpen",
      },
      {
        id: "reporter-near-miss-help",
        title: "How to report a Near Miss",
        description: "A near miss is anything that could have caused harm. Learn how to report one.",
        action: "Learn More",
        href: "/help/near-misses",
        helpSlug: "near-misses",
        icon: "AlertTriangle",
      },
      {
        id: "reporter-incident-help",
        title: "How to log an Incident",
        description: "If something did go wrong, here's how to record it correctly.",
        action: "Learn More",
        href: "/help/incidents",
        helpSlug: "incidents",
        icon: "FileWarning",
      },
      {
        id: "reporter-first-near-miss",
        title: "Log your first Near Miss",
        description: "Have a go at submitting a near miss report.",
        action: "Log Near Miss",
        href: "/near-misses/new",
        icon: "Plus",
      },
      {
        id: "reporter-actions",
        title: "Track your assigned actions",
        description: "See any corrective actions assigned to you.",
        action: "View Actions",
        href: "/actions",
        icon: "CheckSquare",
      },
    ],
  },

  CONTRACTOR: {
    welcomeTitle: "Welcome, Contractor!",
    welcomeMessage:
      "You have been granted access to SHEQsnap as a contractor on this site. This guide will help you understand your responsibilities.",
    steps: [
      {
        id: "contractor-overview",
        title: "Welcome to SHEQsnap",
        description: "Understand what SHEQsnap is and why safety reporting matters.",
        action: "Read Overview",
        href: "/help/overview",
        helpSlug: "overview",
        icon: "BookOpen",
      },
      {
        id: "contractor-role",
        title: "Understand your role as a Contractor",
        description: "Learn about your access level and what you can report.",
        action: "Learn More",
        href: "/help/contractors",
        helpSlug: "contractors",
        icon: "HardHat",
      },
      {
        id: "contractor-approvals",
        title: "How approvals work",
        description: "Your submissions are reviewed by a site safety officer before being actioned.",
        action: "Learn More",
        href: "/help/approvals",
        helpSlug: "approvals",
        icon: "ClipboardCheck",
      },
      {
        id: "contractor-first-record",
        title: "Submit your first record",
        description: "Log a near miss or safety observation from your work area.",
        action: "Submit Record",
        href: "/near-misses/new",
        icon: "Plus",
      },
      {
        id: "contractor-logs",
        title: "Check the Log Register",
        description: "View safety files, permits, and toolbox talks relevant to your work.",
        action: "View Logs",
        href: "/logs",
        icon: "BookOpen",
      },
    ],
  },

  VIEWER: {
    welcomeTitle: "Welcome to SHEQsnap!",
    welcomeMessage:
      "You have read-only access to SHEQsnap. You can view safety records and reports but cannot create or modify entries.",
    steps: [
      {
        id: "viewer-dashboard",
        title: "Explore the dashboard",
        description: "Get an overview of safety activity across the organisation.",
        action: "View Dashboard",
        href: "/dashboard",
        icon: "LayoutDashboard",
      },
      {
        id: "viewer-near-misses",
        title: "View Near Misses",
        description: "Browse reported near misses and their current status.",
        action: "View Near Misses",
        href: "/near-misses",
        icon: "AlertTriangle",
      },
      {
        id: "viewer-incidents",
        title: "View Incidents",
        description: "Review recorded incidents and investigations.",
        action: "View Incidents",
        href: "/incidents",
        icon: "FileWarning",
      },
      {
        id: "viewer-reports",
        title: "Explore Reports",
        description: "Access analytics and safety performance data.",
        action: "View Reports",
        href: "/reports",
        icon: "BarChart3",
      },
    ],
  },
};

export function getOnboardingForRole(role: string): RoleOnboarding {
  return (
    onboardingByRole[role] ?? {
      welcomeTitle: "Welcome to SHEQsnap!",
      welcomeMessage: "Explore the system using the navigation on the left.",
      steps: [],
    }
  );
}
