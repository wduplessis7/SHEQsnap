"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  AlertTriangle,
  FileWarning,
  CheckSquare,
  BarChart3,
  Settings,
  Shield,
  BookOpen,
  ClipboardCheck,
  ClipboardList,
  Building2,
  HardHat,
  HelpCircle,
  X,
  FileCheck,
  Eye,
  Rocket,
  GraduationCap,
  GitPullRequest,
  Scale,
  CreditCard,
  FlaskConical,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

interface NavItemDef {
  href: string;
  label: string;
  icon: React.ComponentType<any>;
  exact?: boolean;
  comingSoon?: boolean;
  /** License module slug. Omit = always visible (base or admin). */
  module?: string;
}

interface NavGroup {
  heading: string;
  items: NavItemDef[];
}

interface SidebarProps {
  onClose?: () => void;
  initialModules?: string[];
}

export function Sidebar({ onClose, initialModules }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role;
  const isAdmin = userRole === "ADMIN";
  const isContractor = userRole === "CONTRACTOR";
  const isApprover = ["SAFETY_OFFICER", "MANAGER", "ADMIN"].includes(userRole);

  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [licenseAlerts, setLicenseAlerts] = useState(0);
  const [activeModules, setActiveModules] = useState<string[]>(
    initialModules ?? ["actions", "near-misses", "observations", "incidents"]
  );

  useEffect(() => {
    if (!isApprover) return;
    const fetchCount = async () => {
      try {
        const res = await fetch("/api/approvals");
        if (res.ok) {
          const data = await res.json();
          setPendingApprovals(Array.isArray(data) ? data.length : 0);
        }
      } catch {
        // ignore
      }
    };
    fetchCount();
    const interval = setInterval(fetchCount, 60000);
    return () => clearInterval(interval);
  }, [isApprover]);

  useEffect(() => {
    const fetchLicenseAlerts = async () => {
      try {
        const res = await fetch("/api/licenses/expiring");
        if (res.ok) {
          const data = await res.json();
          setLicenseAlerts(data.summary?.totalAlerts || 0);
        }
      } catch {
        // ignore
      }
    };
    fetchLicenseAlerts();
    const interval = setInterval(fetchLicenseAlerts, 300000);
  }, []);


  const hasModule = (slug: string) =>
    activeModules.includes("all") || activeModules.includes(slug);

  const navGroups: NavGroup[] = [
    {
      heading: "Safety",
      items: [
        { href: "/actions", label: "Actions", icon: CheckSquare },
        { href: "/observations", label: "Observations", icon: Eye },
        { href: "/near-misses", label: "Near Misses", icon: AlertTriangle },
        { href: "/incidents", label: "Incidents", icon: FileWarning },
        { href: "/inductions", label: "Inductions", icon: GraduationCap, module: "inductions" },
        { href: "/logs", label: "Log Register", icon: BookOpen },
      ],
    },
    {
      heading: "Quality",
      items: [
        { href: "/licenses", label: "Licenses", icon: FileCheck, module: "licenses" },
        { href: "/chemicals", label: "MSDS", icon: FlaskConical, module: "chemicals" },
        ...(!isContractor ? [{ href: "/checklists", label: "Checklists", icon: ClipboardList, module: "checklists" }] : []),
      ],
    },
    {
      heading: "Management",
      items: [
        ...(isApprover ? [{ href: "/approvals", label: "Approvals", icon: ClipboardCheck }] : []),
        ...(!isContractor ? [{ href: "/reports", label: "Reports", icon: BarChart3, module: "reports" }] : []),
        { href: "/moc", label: "MOC", icon: GitPullRequest, module: "moc" },
        { href: "/legal-appointments", label: "Legal Appointments", icon: Scale, module: "legal_appointments" },
      ],
    },
  ];

  const adminItems: NavItemDef[] = [
    { href: "/admin", label: "Admin", icon: Settings, exact: true },
    { href: "/admin/companies", label: "Companies", icon: Building2 },
    { href: "/admin/contractors", label: "Contractors", icon: HardHat },
    { href: "/admin/checklists", label: "Checklist Mgmt", icon: ClipboardCheck },
    { href: "/admin/platform-license", label: "Platform License", icon: CreditCard },
    { href: "/admin/legal-positions", label: "Legal Positions", icon: BookOpen },
  ];

  function NavLink({
    href,
    label,
    icon: Icon,
    badge,
    exact,
    comingSoon,
  }: {
    href: string;
    label: string;
    icon: React.ComponentType<any>;
    badge?: number;
    exact?: boolean;
    comingSoon?: boolean;
  }) {
    const isActive = !comingSoon && (exact
      ? pathname === href
      : pathname === href || pathname.startsWith(href + "/"));

    if (comingSoon) {
      return (
        <div className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 cursor-default select-none">
          <Icon className="h-5 w-5 shrink-0" />
          <span className="flex-1">{label}</span>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-700 bg-[#2A2A2A] rounded px-1.5 py-0.5">Soon</span>
        </div>
      );
    }

    return (
      <Link
        href={href}
        onClick={onClose}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
          isActive
            ? "bg-[#FFFC41] text-[#1A1A1A] font-semibold"
            : "text-gray-400 hover:bg-[#2A2A2A] hover:text-white"
        )}
      >
        <Icon className="h-5 w-5 shrink-0" />
        <span className="flex-1">{label}</span>
        {badge != null && badge > 0 && (
          <span className="ml-auto inline-flex items-center justify-center rounded-full bg-orange-500 text-white text-xs font-bold min-w-[18px] h-[18px] px-1">
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </Link>
    );
  }

  function SectionHeading({ label }: { label: string }) {
    return (
      <div className="mt-5 mb-1.5 px-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
          {label}
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-[#1A1A1A] text-white">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 px-4 lg:px-6 border-b border-[#2A2A2A]">
        <Shield className="h-8 w-8 text-[#FFFC41] shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex flex-col">
            <span className="text-lg font-extrabold leading-tight tracking-tight">
              <span style={{ color: '#FFFC41' }}>SHEQ</span>
              <span className="text-white">Snap</span>
            </span>
            <span className="text-[10px] leading-tight font-medium" style={{ color: '#9CA3AF' }}>
              <span style={{ color: '#FFFC41' }}>Spot it.</span>{' '}
              <span className="text-white">Snap it.</span>{' '}
              <span style={{ color: '#4CAF50' }}>Stop it.</span>
            </span>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden ml-2 p-1 rounded-md text-gray-400 hover:text-white hover:bg-[#2A2A2A] transition-colors"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto">
        {/* Dashboard — always visible */}
        <NavLink href="/dashboard" label="Dashboard" icon={LayoutDashboard} />

        {/* Grouped sections — filtered by license */}
        {navGroups.map((group) => {
          const visibleItems = group.items.filter(
            (item) => !item.module || hasModule(item.module)
          );
          if (visibleItems.length === 0) return null;
          const showHeading = !["Management", "Safety", "Health & Environment"].includes(group.heading);
          return (
            <div key={group.heading}>
              {showHeading && <SectionHeading label={group.heading} />}
              <div className="space-y-0.5">
                {visibleItems.map((item) => (
                  <NavLink
                    key={item.href + item.label}
                    {...item}
                    badge={
                      item.href === "/licenses" && licenseAlerts > 0 ? licenseAlerts :
                      item.href === "/approvals" && pendingApprovals > 0 ? pendingApprovals :
                      undefined
                    }
                  />
                ))}
              </div>
            </div>
          );
        })}

        {/* Admin section — always visible to admins */}
        {isAdmin && (
          <div>
            <SectionHeading label="Administration" />
            <div className="space-y-0.5">
              {adminItems.map((item) => (
                <NavLink key={item.href} {...item} />
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* Getting Started + Help */}
      <div className="px-3 pb-3 space-y-0.5">
        <NavLink href="/help#onboarding" label="Getting Started" icon={Rocket} />
        <NavLink href="/help" label="Help Centre" icon={HelpCircle} />
      </div>

      {/* Footer */}
      <div className="border-t border-[#2A2A2A] p-4">
        <p className="text-xs text-gray-500 text-center">SHEQsnap v1.0.0</p>
      </div>
    </div>
  );
}
