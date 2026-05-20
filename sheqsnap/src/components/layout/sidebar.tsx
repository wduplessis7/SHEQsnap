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
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/near-misses", label: "Near Misses", icon: AlertTriangle },
  { href: "/incidents", label: "Incidents", icon: FileWarning },
  { href: "/actions", label: "Actions", icon: CheckSquare },
  { href: "/logs", label: "Log Register", icon: BookOpen },
  { href: "/checklists", label: "Checklists", icon: ClipboardList },
  { href: "/licenses", label: "Licenses", icon: FileCheck },
  { href: "/observations", label: "Behaviour Obs.", icon: Eye },
  { href: "/inductions", label: "Inductions", icon: GraduationCap },
  { href: "/moc", label: "MOC", icon: GitPullRequest },
];

const approverNavItems = [
  { href: "/reports", label: "Reports", icon: BarChart3 },
];

const adminItems = [
  { href: "/admin", label: "Admin", icon: Settings, exact: true },
  { href: "/admin/companies", label: "Companies", icon: Building2 },
  { href: "/admin/contractors", label: "Contractors", icon: HardHat },
  { href: "/admin/checklists", label: "Checklist Mgmt", icon: ClipboardCheck },
];

interface SidebarProps {
  onClose?: () => void;
}

export function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role;
  const isAdmin = userRole === "ADMIN";
  const isContractor = userRole === "CONTRACTOR";
  const isApprover = ["SAFETY_OFFICER", "MANAGER", "ADMIN"].includes(userRole);

  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [licenseAlerts, setLicenseAlerts] = useState(0);

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
    const interval = setInterval(fetchLicenseAlerts, 300000); // every 5 min
    return () => clearInterval(interval);
  }, []);

  function NavLink({
    href,
    label,
    icon: Icon,
    badge,
    exact,
  }: {
    href: string;
    label: string;
    icon: React.ComponentType<any>;
    badge?: number;
    exact?: boolean;
  }) {
    const isActive = exact
      ? pathname === href
      : pathname === href || pathname.startsWith(href + "/");
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
        {/* Close button — mobile only */}
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
      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
        {navItems
          .filter((item) => !(isContractor && item.href === "/checklists"))
          .map((item) => (
            <NavLink
              key={item.href}
              {...item}
              badge={item.href === "/licenses" && licenseAlerts > 0 ? licenseAlerts : undefined}
            />
          ))}

        {/* Approvals — only for non-contractors with approver role */}
        {isApprover && (
          <NavLink
            href="/approvals"
            label="Approvals"
            icon={ClipboardCheck}
            badge={pendingApprovals}
          />
        )}

        {/* Reports — hide for contractors */}
        {!isContractor &&
          approverNavItems.map((item) => (
            <NavLink key={item.href} {...item} />
          ))}

        {/* Admin section */}
        {isAdmin && (
          <>
            <div className="mt-4 mb-2 px-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-600">
                Administration
              </p>
            </div>
            {adminItems.map((item) => (
              <NavLink key={item.href} {...item} />
            ))}
          </>
        )}
      </nav>

      {/* Getting Started + Help — always visible */}
      <div className="px-3 pb-3 space-y-1">
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
