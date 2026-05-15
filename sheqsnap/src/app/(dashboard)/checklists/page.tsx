"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { RefreshCw, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn, formatDate } from "@/lib/utils";

type AssignmentStatus = "PENDING" | "IN_PROGRESS" | "SUBMITTED" | "OVERDUE";

interface Assignment {
  id: string;
  status: AssignmentStatus;
  dueDate: string | null;
  template: {
    id: string;
    title: string;
    category: string;
  };
  assignedToUser: {
    id: string;
    name: string;
    email: string;
  };
}

const TABS: { label: string; value: AssignmentStatus }[] = [
  { label: "Pending", value: "PENDING" },
  { label: "In Progress", value: "IN_PROGRESS" },
  { label: "Submitted", value: "SUBMITTED" },
  { label: "Overdue", value: "OVERDUE" },
];

const EMPTY_MESSAGES: Record<AssignmentStatus, string> = {
  PENDING: "No pending checklists — you're all caught up!",
  IN_PROGRESS: "No checklists in progress.",
  SUBMITTED: "No submitted checklists yet.",
  OVERDUE: "No overdue checklists — great work!",
};

function statusBadgeClass(status: AssignmentStatus): string {
  switch (status) {
    case "PENDING":
      return "bg-gray-100 text-gray-700";
    case "IN_PROGRESS":
      return "bg-blue-100 text-blue-800";
    case "SUBMITTED":
      return "bg-green-100 text-green-800";
    case "OVERDUE":
      return "bg-red-100 text-red-800";
  }
}

function dueDateClass(dueDate: string | null): string {
  if (!dueDate) return "text-gray-400";
  const due = new Date(dueDate);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const diffDays = Math.round((dueDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return "text-red-600 font-medium";
  if (diffDays === 1) return "text-orange-500 font-medium";
  return "text-gray-500";
}

function actionLabel(status: AssignmentStatus): string {
  switch (status) {
    case "PENDING":
      return "Start";
    case "IN_PROGRESS":
      return "Continue";
    case "SUBMITTED":
    case "OVERDUE":
      return "View";
  }
}

function SkeletonCard() {
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="h-5 bg-gray-200 rounded w-2/3 animate-pulse" />
        <div className="h-4 bg-gray-100 rounded w-1/4 animate-pulse" />
        <div className="flex justify-between items-center">
          <div className="h-4 bg-gray-100 rounded w-1/3 animate-pulse" />
          <div className="h-8 bg-gray-200 rounded w-20 animate-pulse" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function ChecklistsPage() {
  const [activeTab, setActiveTab] = useState<AssignmentStatus>("PENDING");
  const [allItems, setAllItems] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/checklists/assignments");
      const data = await res.json();
      setAllItems(data.items ?? []);
    } catch {
      setAllItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = allItems.filter((a) => a.status === activeTab);

  const tabCounts: Record<AssignmentStatus, number> = {
    PENDING: allItems.filter((a) => a.status === "PENDING").length,
    IN_PROGRESS: allItems.filter((a) => a.status === "IN_PROGRESS").length,
    SUBMITTED: allItems.filter((a) => a.status === "SUBMITTED").length,
    OVERDUE: allItems.filter((a) => a.status === "OVERDUE").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Checklists</h1>
          <p className="text-gray-500 mt-1">{allItems.length} assignment{allItems.length !== 1 ? "s" : ""}</p>
        </div>
        <Button variant="outline" size="icon" onClick={fetchData} title="Refresh">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={cn(
              "flex-1 min-w-[80px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap",
              activeTab === tab.value
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            {tab.label}
            {tabCounts[tab.value] > 0 && (
              <span
                className={cn(
                  "inline-flex items-center justify-center rounded-full text-xs w-5 h-5",
                  activeTab === tab.value ? "bg-green-600 text-white" : "bg-gray-300 text-gray-600"
                )}
              >
                {tabCounts[tab.value]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <ClipboardList className="h-12 w-12 text-gray-300" />
            <p className="text-gray-500 text-base">{EMPTY_MESSAGES[activeTab]}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((assignment) => (
            <Card key={assignment.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0 space-y-2">
                    <h3 className="font-semibold text-gray-900 text-base leading-snug">
                      {assignment.template.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {assignment.template.category}
                      </Badge>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
                          statusBadgeClass(assignment.status)
                        )}
                      >
                        {assignment.status.replace(/_/g, " ")}
                      </span>
                    </div>
                    {assignment.dueDate && (
                      <p className={cn("text-sm", dueDateClass(assignment.dueDate))}>
                        Due: {formatDate(assignment.dueDate)}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0">
                    <Link href={`/checklists/${assignment.id}`}>
                      <Button
                        size="sm"
                        variant={
                          assignment.status === "SUBMITTED"
                            ? "outline"
                            : assignment.status === "OVERDUE"
                            ? "destructive"
                            : "success"
                        }
                        className="min-h-[40px] min-w-[80px]"
                      >
                        {actionLabel(assignment.status)}
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
