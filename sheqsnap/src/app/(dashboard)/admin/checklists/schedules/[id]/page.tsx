"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatDateTime } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-gray-100 text-gray-600",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  SUBMITTED: "bg-green-100 text-green-700",
  OVERDUE: "bg-red-100 text-red-700",
};

export default function ScheduleDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [schedule, setSchedule] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/checklists/schedules/${id}`);
        if (!res.ok) { setError("Schedule not found"); return; }
        setSchedule(await res.json());
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !schedule) {
    return (
      <div className="space-y-4">
        <Link href="/admin/checklists/schedules">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" />Back</Button>
        </Link>
        <p className="text-red-600">{error || "Schedule not found"}</p>
      </div>
    );
  }

  const assignments: any[] = schedule.assignments ?? [];
  const assignedTo = schedule.assignedToUser?.name || schedule.assignedToGroup?.name || "—";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/checklists/schedules">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Schedule Detail</h1>
          <p className="text-gray-500 mt-1">{schedule.template?.title}</p>
        </div>
      </div>

      {/* Info card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Schedule Info</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Template</span>
              <span className="font-medium">{schedule.template?.title}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Category</span>
              <span>{schedule.template?.category?.replace(/_/g, " ") || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Assigned To</span>
              <span>{assignedTo}{schedule.assignedToGroup && <span className="ml-1 text-xs text-gray-400">(group)</span>}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Recurrence</span>
              <span>{schedule.recurrence}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Start Date</span>
              <span>{formatDate(schedule.startDate)}</span>
            </div>
            {schedule.endDate && (
              <div className="flex justify-between">
                <span className="text-gray-500">End Date</span>
                <span>{formatDate(schedule.endDate)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">Due Time</span>
              <span>{schedule.dueTime || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Status</span>
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${schedule.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                {schedule.isActive ? "Active" : "Inactive"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Created By</span>
              <span>{schedule.createdBy?.name || "—"}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Assignment Stats</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Total Assignments</span>
              <span className="font-medium">{assignments.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Submitted</span>
              <span className="text-green-700">{assignments.filter((a) => a.status === "SUBMITTED").length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Pending</span>
              <span className="text-gray-600">{assignments.filter((a) => a.status === "PENDING").length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">In Progress</span>
              <span className="text-blue-700">{assignments.filter((a) => a.status === "IN_PROGRESS").length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Overdue</span>
              <span className="text-red-600">{assignments.filter((a) => a.status === "OVERDUE").length}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assignments table */}
      <Card>
        <CardHeader><CardTitle className="text-base">Assignments ({assignments.length})</CardTitle></CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">User</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Due Date</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Submitted At</th>
              </tr>
            </thead>
            <tbody>
              {assignments.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-gray-400">No assignments yet</td>
                </tr>
              ) : (
                assignments.map((a) => (
                  <tr key={a.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{a.assignedToUser?.name || "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(a.dueDate)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[a.status] || "bg-gray-100 text-gray-600"}`}>
                        {a.status?.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{a.submittedAt ? formatDateTime(a.submittedAt) : "—"}</td>
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
