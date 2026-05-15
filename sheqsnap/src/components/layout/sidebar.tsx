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
  Building2,
  HardHat,
  HelpCircle,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/near-misses", label: "Near Misses", icon: AlertTriangle },
  { href: "/incidents", label: "Incidents", icon: FileWarning },
  { href: "/actions", label: "Actions", icon: CheckSquare },
  { href: "/logs", label: "Log Register", icon: BookOpen },
];

const approverNavItems = [
  { href: "/reports", label: "Reports", icon: BarChart3 },
];

const adminItems = [
  { href: "/admin", label: "Admin", icon: Settings },
  { href: "/admin/companies", label: "Companies", icon: Building2 },
  { href: "/admin/contractors", label: "Contractors", icon: HardHat },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role;
  const isAdmin = userRole === "ADMIN";
  const isContractor = userRole === "CONTRACTOR";
  const isApprover = ["SAFETY_OFFICER", "MANAGER", "ADMIN"].includes(userRole);

  const [pendingApprovals, setPendingApprovals] = useState(0);

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
    const interval = setInterval(fetchCount, 60000); // refresh every minute
    return () => clearInterval(interval);
  }, [isApprover]);

  function NavLink({ href, label, icon: Icon, badge }: { href: string; label: string; icon: React.ComponentType<any>; badge?: number }) {
    const isActive = pathname === href || pathname.startsWith(href + "/");
    return (
      <Link
        href={href}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
          isActive
            ? "bg-blue-600 text-white"
            : "text-gray-300 hover:bg-gray-800 hover:text-white"
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
    <div className="flex h-full flex-col bg-gray-900 text-white">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 px-6 border-b border-gray-700">
        <Shield className="h-8 w-8 text-blue-400" />
        <div>
          <span className="text-lg font-bold text-white">SHEQsnap</span>
          <p className="text-xs text-gray-400">Safety Management</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => (
          <NavLink key={item.href} {...item} />
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
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Administration
              </p>
            </div>
            {adminItems.map((item) => (
              <NavLink key={item.href} {...item} />
            ))}
          </>
        )}
      </nav>

      {/* Help — always visible */}
      <div className="px-3 pb-3">
        <NavLink href="/help" label="Help Centre" icon={HelpCircle} />
      </div>

      {/* Footer */}
      <div className="border-t border-gray-700 p-4">
        <p className="text-xs text-gray-500 text-center">SHEQsnap v1.0.0</p>
      </div>
    </div>
  );
}
