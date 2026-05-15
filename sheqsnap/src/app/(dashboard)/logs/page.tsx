"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, RefreshCw, BookOpen, Search, HelpCircle } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useSession } from "next-auth/react";

const LOG_TYPE_LABELS: Record<string, string> = {
  INSPECTION: "Inspection",
  TOOLBOX_TALK: "Toolbox Talk",
  MEETING_MINUTES: "Meeting Minutes",
  SAFETY_FILE: "Safety File",
  PERMIT: "Permit",
  INCIDENT_LOG: "Incident Log",
  OTHER: "Other",
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  PENDING_APPROVAL: "bg-orange-100 text-orange-700",
  ACTIVE: "bg-green-100 text-green-700",
  ARCHIVED: "bg-slate-100 text-slate-600",
};

export default function LogsPage() {
  const { data: session } = useSession();
  const user = (session?.user as any) || {};
  const isContractor = user.role === "CONTRACTOR";

  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);

  const [filters, setFilters] = useState({
    logType: "all",
    companyId: "all",
    departmentId: "all",
    status: "all",
    from: "",
    to: "",
    page: 1,
  });

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.logType !== "all") params.set("logType", filters.logType);
      if (filters.companyId !== "all") params.set("companyId", filters.companyId);
      if (filters.departmentId !== "all") params.set("departmentId", filters.departmentId);
      if (filters.status !== "all") params.set("status", filters.status);
      if (filters.from) params.set("from", filters.from);
      if (filters.to) params.set("to", filters.to);
      params.set("page", String(filters.page));

      const res = await fetch(`/api/logs?${params}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.items);
        setTotal(data.total);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchMeta = async () => {
    if (!isContractor) {
      const [compRes, deptRes] = await Promise.all([
        fetch("/api/admin/companies"),
        fetch("/api/admin/departments"),
      ]);
      if (compRes.ok) setCompanies(await compRes.json());
      if (deptRes.ok) setDepartments(await deptRes.json());
    }
  };

  useEffect(() => {
    fetchMeta();
  }, [isContractor]);

  useEffect(() => {
    fetchLogs();
  }, [filters]);

  function setFilter(key: string, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Log Register</h1>
            <Link href="/help/log-register" className="text-gray-400 hover:text-blue-600 transition-colors" title="Help: Log Register">
              <HelpCircle className="h-5 w-5" />
            </Link>
          </div>
          <p className="text-gray-500 mt-1">{total} log {total !== 1 ? "entries" : "entry"}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={fetchLogs}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Link href="/logs/new">
            <Button>
              <Plus className="h-4 w-4 mr-1" />
              New Log Entry
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      {!isContractor && (
        <Card>
          <div className="p-4 flex flex-wrap gap-3 items-end">
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Type</p>
              <Select value={filters.logType} onValueChange={(v) => setFilter("logType", v)}>
                <SelectTrigger className="w-40 h-8 text-sm">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {Object.entries(LOG_TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Company</p>
              <Select value={filters.companyId} onValueChange={(v) => setFilter("companyId", v)}>
                <SelectTrigger className="w-44 h-8 text-sm">
                  <SelectValue placeholder="All Companies" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Companies</SelectItem>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Department</p>
              <Select value={filters.departmentId} onValueChange={(v) => setFilter("departmentId", v)}>
                <SelectTrigger className="w-44 h-8 text-sm">
                  <SelectValue placeholder="All Depts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Status</p>
              <Select value={filters.status} onValueChange={(v) => setFilter("status", v)}>
                <SelectTrigger className="w-40 h-8 text-sm">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="PENDING_APPROVAL">Pending Approval</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="ARCHIVED">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">From</p>
              <Input
                type="date"
                value={filters.from}
                onChange={(e) => setFilter("from", e.target.value)}
                className="w-36 h-8 text-sm"
              />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">To</p>
              <Input
                type="date"
                value={filters.to}
                onChange={(e) => setFilter("to", e.target.value)}
                className="w-36 h-8 text-sm"
              />
            </div>
          </div>
        </Card>
      )}

      <Card>
        {logs.length === 0 && !loading ? (
          <div className="py-16 flex flex-col items-center gap-3 text-gray-400">
            <BookOpen className="h-12 w-12 text-gray-300" />
            <p className="text-lg font-medium">No log entries found</p>
            <p className="text-sm">Create your first log entry to get started.</p>
            <Link href="/logs/new">
              <Button size="sm" className="mt-2">
                <Plus className="h-4 w-4 mr-1" />
                New Log Entry
              </Button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Reference</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Title</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Company / Dept</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Uploaded By</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8">
                      <RefreshCw className="h-5 w-5 animate-spin mx-auto text-gray-400" />
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="border-b last:border-0 hover:bg-gray-50 cursor-pointer">
                      <td className="px-4 py-3">
                        <Link href={`/logs/${log.id}`} className="font-mono text-sm font-medium text-blue-600 hover:underline">
                          {log.referenceNo}
                        </Link>
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <Link href={`/logs/${log.id}`} className="font-medium hover:underline text-gray-900">
                          {log.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-xs">
                          {LOG_TYPE_LABELS[log.logType] || log.logType}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {log.company?.name || log.department?.name || "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {formatDate(log.entryDate)}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {log.uploadedBy?.name || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[log.status] || "bg-gray-100 text-gray-700"}`}>
                          {log.status.replace(/_/g, " ")}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {total > 20 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <p className="text-sm text-gray-500">
              Showing {(filters.page - 1) * 20 + 1}–{Math.min(filters.page * 20, total)} of {total}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
                disabled={filters.page === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
                disabled={filters.page * 20 >= total}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
