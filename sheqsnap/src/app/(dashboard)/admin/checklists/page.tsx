"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardList, Calendar, RefreshCw, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-gray-100 text-gray-600",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  SUBMITTED: "bg-green-100 text-green-700",
  OVERDUE: "bg-red-100 text-red-700",
};

export default function ChecklistsAdminPage() {
  const [templateCount, setTemplateCount] = useState<number | null>(null);
  const [scheduleCount, setScheduleCount] = useState<number | null>(null);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [tmplRes, schedRes, reportRes] = await Promise.all([
          fetch("/api/checklists/templates"),
          fetch("/api/checklists/schedules"),
          fetch("/api/checklists/reports?limit=5&page=1"),
        ]);
        const tmplData = await tmplRes.json();
        const schedData = await schedRes.json();
        const reportData = await reportRes.json();

        setTemplateCount(tmplData.total ?? tmplData.length ?? 0);
        setScheduleCount(schedData.total ?? schedData.length ?? 0);
        setRecentActivity(reportData.items ?? []);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Checklist Management</h1>
        <p className="text-gray-500 mt-1">Manage templates, schedules, and review completion reports</p>
      </div>

      {/* Hub cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link href="/admin/checklists/templates">
          <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-green-600">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-green-100 p-3 rounded-lg">
                    <ClipboardList className="h-6 w-6 text-green-700" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Checklist Templates</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {loading ? "—" : templateCount}
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500 mt-3">Create and manage checklist templates with custom items</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/checklists/schedules">
          <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-blue-600">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <Calendar className="h-6 w-6 text-blue-700" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Schedules</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {loading ? "—" : scheduleCount}
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500 mt-3">Schedule checklists for users or groups on a recurring basis</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Recent activity */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Recent Assignments</CardTitle>
          <Link href="/admin/checklists/reports" className="text-sm text-green-600 hover:underline flex items-center gap-1">
            View all reports <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">User</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Template</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Due Date</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="text-center py-8">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto text-gray-400" />
                  </td>
                </tr>
              ) : recentActivity.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-gray-400">No recent activity</td>
                </tr>
              ) : (
                recentActivity.map((item) => (
                  <tr key={item.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{item.assignedToUser?.name || "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{item.template?.title || "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(item.dueDate)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[item.status] || "bg-gray-100 text-gray-600"}`}>
                        {item.status?.replace(/_/g, " ")}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
