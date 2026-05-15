"use client";

export const dynamic = "force-dynamic";


import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Plus, Search, RefreshCw, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { SeverityBadge } from "@/components/ui/severity-badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate, isOverdue, INCIDENT_TYPES } from "@/lib/utils";
import { cn } from "@/lib/utils";

const STATUSES = ["NEW", "SUBMITTED", "UNDER_REVIEW", "ACTION_REQUIRED", "IN_PROGRESS", "CLOSED", "CANCELLED"];
const SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

export default function IncidentsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [departments, setDepartments] = useState<any[]>([]);

  const [filters, setFilters] = useState({
    status: "all",
    severity: "all",
    departmentId: "all",
    incidentType: "all",
    search: "",
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (filters.status !== "all") params.set("status", filters.status);
    if (filters.severity !== "all") params.set("severity", filters.severity);
    if (filters.departmentId !== "all") params.set("departmentId", filters.departmentId);
    if (filters.incidentType !== "all") params.set("incidentType", filters.incidentType);
    if (filters.search) params.set("search", filters.search);

    try {
      const res = await fetch(`/api/incidents?${params}`);
      const data = await res.json();
      setItems(data.items);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    fetch("/api/admin/departments").then((r) => r.json()).then(setDepartments).catch(() => {});
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  function updateFilter(key: string, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Incidents</h1>
            <Link href="/help/incidents" className="text-gray-400 hover:text-blue-600 transition-colors" title="Help: Incidents">
              <HelpCircle className="h-5 w-5" />
            </Link>
          </div>
          <p className="text-gray-500 mt-1">{total} record{total !== 1 ? "s" : ""}</p>
        </div>
        <Link href="/incidents/new">
          <Button>
            <Plus className="h-4 w-4" />
            Report Incident
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Search..." value={filters.search} onChange={(e) => updateFilter("search", e.target.value)} className="pl-9" />
            </div>
            <Select value={filters.status} onValueChange={(v) => updateFilter("status", v)}>
              <SelectTrigger className="w-40"><SelectValue placeholder="All Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.severity} onValueChange={(v) => updateFilter("severity", v)}>
              <SelectTrigger className="w-36"><SelectValue placeholder="All Severity" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severity</SelectItem>
                {SEVERITIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.incidentType} onValueChange={(v) => updateFilter("incidentType", v)}>
              <SelectTrigger className="w-44"><SelectValue placeholder="All Types" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {INCIDENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.departmentId} onValueChange={(v) => updateFilter("departmentId", v)}>
              <SelectTrigger className="w-44"><SelectValue placeholder="All Depts" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={fetchData}><RefreshCw className="h-4 w-4" /></Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Reference</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                <th className="hidden md:table-cell text-left px-4 py-3 font-medium text-gray-600">Type</th>
                <th className="hidden md:table-cell text-left px-4 py-3 font-medium text-gray-600">Department</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Severity</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="hidden sm:table-cell text-left px-4 py-3 font-medium text-gray-600">Assigned To</th>
                <th className="hidden sm:table-cell text-left px-4 py-3 font-medium text-gray-600">Due Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-8 text-gray-400"><RefreshCw className="h-6 w-6 animate-spin mx-auto" /></td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-8 text-gray-400">No incidents found</td></tr>
              ) : (
                items.map((item) => {
                  const overdue = isOverdue(item.dueDate, item.status);
                  return (
                    <tr key={item.id} className={cn("border-b last:border-0 hover:bg-gray-50 transition-colors", overdue && "bg-red-50 hover:bg-red-100")}>
                      <td className="px-4 py-3">
                        <Link href={`/incidents/${item.id}`} className="font-semibold text-blue-600 hover:underline">{item.referenceNo}</Link>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{formatDate(item.dateOfIncident)}</td>
                      <td className="hidden md:table-cell px-4 py-3 text-gray-600">{item.incidentType}</td>
                      <td className="hidden md:table-cell px-4 py-3 text-gray-600">{item.department?.name || "—"}</td>
                      <td className="px-4 py-3"><SeverityBadge severity={item.severityLevel} /></td>
                      <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
                      <td className="hidden sm:table-cell px-4 py-3 text-gray-600">{item.assignedUser?.name || "—"}</td>
                      <td className={cn("hidden sm:table-cell px-4 py-3", overdue ? "text-red-600 font-medium" : "text-gray-600")}>
                        {formatDate(item.dueDate)}
                        {overdue && <span className="ml-1 text-xs">(Overdue)</span>}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t">
            <p className="text-sm text-gray-500">Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
