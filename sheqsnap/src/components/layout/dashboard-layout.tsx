"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";
import { TopBar } from "./topbar";
import { MobileBottomNav } from "./mobile-bottom-nav";
import { OnboardingModal } from "@/components/onboarding/onboarding-modal";
import { OfflineBanner } from "@/components/offline-banner";
import { cn } from "@/lib/utils";
import { ModulesProvider } from "@/lib/modules-context";

interface DashboardLayoutProps {
  children: React.ReactNode;
  initialModules?: string[];
}

export function DashboardLayout({ children, initialModules }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <ModulesProvider modules={initialModules ?? []}>
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-200 ease-in-out lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <Sidebar onClose={() => setSidebarOpen(false)} initialModules={initialModules} />
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <TopBar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
        <OfflineBanner />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 pb-20 lg:pb-6">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <MobileBottomNav />

      {/* Onboarding modal */}
      <OnboardingModal />
    </div>
    </ModulesProvider>
  );
}
