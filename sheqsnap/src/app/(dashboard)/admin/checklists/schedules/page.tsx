"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Plus, Eye, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/checklists/schedules");
      const data = await res.json();
      setSchedules(data.items ?? data);
      setTotal(data.total ?? data.length ?? 0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSchedules(); }, [fetchSchedules]);

  async function handleToggleActive(schedule: any) {
    if (!confirm(`${schedule.isActive ? "Deactivate" : "Activate"} this schedule?`)) return;
    const res = await fetch(`/api/checklists/schedules/${schedule.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !schedule.isActive }),
    });
    if (res.ok) fetchSchedules();
    else alert("Failed to update schedule");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Checklist Schedules</h1>
          <p className="text-gray-500 mt-1">{total} schedule{total !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={fetchSchedules}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Link href="/admin/checklists/schedules/new">
            <Button>
              <Plus className="h-4 w-4" />
              New Schedule
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Template</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Assigned To</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Recurrence</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Start Date</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto text-gray-400" />
                  </td>
                </tr>
              ) : schedules.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400">
                    <p>No schedules found</p>
                    <Link href="/admin/checklists/schedules/new" className="mt-2 inline-block text-green-600 hover:underline text-sm">
                      Create your first schedule
                    </Link>
                  </td>
                </tr>
              ) : (
                schedules.map((sched) => (
                  <tr key={sched.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{sched.template?.title || "—"}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {sched.assignedToUser?.name || sched.assignedToGroup?.name || "—"}
                      {sched.assignedToGroup && <span className="ml-1 text-xs text-gray-400">(group)</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{sched.recurrence}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(sched.startDate)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${sched.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {sched.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Link href={`/admin/checklists/schedules/${sched.id}`}>
                          <Button variant="ghost" size="sm" className="h-7 px-2">
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            View
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`h-7 px-2 ${sched.isActive ? "text-red-500 hover:text-red-700" : "text-green-600 hover:text-green-700"}`}
                          onClick={() => handleToggleActive(sched)}
                        >
                          {sched.isActive ? "Deactivate" : "Activate"}
                        </Button>
                      </div>
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
