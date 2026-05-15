"use client";

import { signOut, useSession } from "next-auth/react";
import { Bell, LogOut, ChevronDown, Menu, HelpCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEffect, useState } from "react";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  SAFETY_OFFICER: "Safety Officer",
  MANAGER: "Manager",
  REPORTER: "Reporter",
  VIEWER: "Viewer",
};

const ROLE_COLORS: Record<string, string> = {
  ADMIN: "destructive",
  SAFETY_OFFICER: "default",
  MANAGER: "secondary",
  REPORTER: "outline",
  VIEWER: "secondary",
};

interface TopBarProps {
  onMenuToggle?: () => void;
}

export function TopBar({ onMenuToggle }: TopBarProps) {
  const { data: session } = useSession();
  const user = session?.user as any;
  const [overdueCount, setOverdueCount] = useState(0);

  useEffect(() => {
    fetch("/api/actions?overdue=true")
      .then((r) => r.json())
      .then((data) => {
        if (data.total) setOverdueCount(data.total);
      })
      .catch(() => {});
  }, []);

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 lg:px-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuToggle}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="hidden lg:block">
          <h1 className="text-sm font-medium text-gray-500">
            Safety, Health, Environment & Quality Management
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Help */}
        <Link href="/help">
          <Button variant="ghost" size="icon" title="Help Centre">
            <HelpCircle className="h-5 w-5" />
          </Button>
        </Link>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {overdueCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white">
              {overdueCount > 9 ? "9+" : overdueCount}
            </span>
          )}
        </Button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white text-sm font-medium">
                {user?.name?.charAt(0).toUpperCase() || "U"}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium">{user?.name}</p>
                <p className="text-xs text-gray-500">{ROLE_LABELS[user?.role] || user?.role}</p>
              </div>
              <ChevronDown className="h-4 w-4 text-gray-400" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div>
                <p className="font-medium">{user?.name}</p>
                <p className="text-xs text-gray-500 font-normal">{user?.email}</p>
                <Badge
                  variant={(ROLE_COLORS[user?.role] as any) || "secondary"}
                  className="mt-1 text-xs"
                >
                  {ROLE_LABELS[user?.role] || user?.role}
                </Badge>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-600 cursor-pointer"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
