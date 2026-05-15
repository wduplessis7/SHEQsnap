"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, AlertTriangle, FileWarning, CheckSquare, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const bottomNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/near-misses", label: "Near Misses", icon: AlertTriangle },
  { href: "/incidents", label: "Incidents", icon: FileWarning },
  { href: "/actions", label: "Actions", icon: CheckSquare },
  { href: "/help", label: "Help", icon: HelpCircle },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 flex h-16 items-center border-t border-gray-200 bg-white lg:hidden">
      {bottomNavItems.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium transition-colors",
              isActive ? "text-green-600" : "text-gray-500 hover:text-gray-900"
            )}
          >
            <Icon className={cn("h-5 w-5", isActive && "text-green-600")} />
            <span className="leading-none">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
