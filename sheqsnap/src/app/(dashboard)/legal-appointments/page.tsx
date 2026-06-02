"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback, Suspense } from "react";
import Link from "next/link";
import { Plus, Search, RefreshCw, AlertTriangle, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

const STATUSES = ["DRAFT", "ACTIVE", "SUSPENDED", "TERMINATED", "EXPIRED", "RESIGNED", "RENEWED"];
const APPOINTMENT_TYPES = ["PERMANENT", "ACTING", "INTERIM", "TEMPORARY", "FIXED_TERM", "EX_OFFICIO"];

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  ACTIVE: "bg-green-100 text-green-700",
  SUSPENDED: "bg-yellow-100 text-yellow-800",
  TERMINATED: "bg-red-100 text-red-700",
  EXPIRED: "bg-red-100 text-red-700",
  RESIGNED: "bg-orange-100 text-orange-700",
  RENEWED: "bg-blue-100 text-blue-700",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium", STATUS_COLORS[status] ?? "bg-gray-100 text-gray-700")}>
      {status}
    </span>
  );
}

function isEndDateOverdue(endDate: string | null, status: string) {
  if (!endDate) return false;
  if (status === "TERMINATED" || status === "EXPIRED" || status === "RESIGNED") return true;
  return new Date(endDate) < new Date();
}

function LegalAppointmentsPageInner() {
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [positions, setPositions] = useState<any[]>([]);

  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    appointmentType: "all",
    positionId: "all",
    expiring: false,
  });

  useEffect(() => {
    fetch("/api/admin/legal-positions").then((r) => r.json()).then((data) => {
      setPositions(Array.isArray(data) ? data : (data.data ?? []));
    }).catch(() => {});
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (filters.search) params.set("search", filters.search);
    if (filters.status !== "all") params.set("status", filters.status);
    if (filters.appointmentType !== "all") params.set("appointmentType", filters.appointmentType);
    if (filters.positionId !== "all") params.set("positionId", filters.positionId);
    if (filters.expiring) params.set("expiring", "true");

    try {
      const res = await fetch(`/api/legal-appointments?${params}`);
      const data = await res.json();
      setItems(Array.isArray(data.data) ? data.data : []);
      setTotal(data.pagination?.total ?? 0);
    } catch {
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function updateFilter(key: string, value: string | boolean) {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Legal Appointments</h1>
          <p className="text-gray-500 mt-1">{total} record{total !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/legal-appointments/reports">
            <Button variant="outline"><BarChart3 className="h-4 w-4" />Reports</Button>
          </Link>
          <Link href="/legal-appointments/new">
            <Button><Plus className="h-4 w-4" />New Appointment</Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search name, reference, entity..."
                value={filters.search}
                onChange={(e) => updateFilter("search", e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filters.status} onValueChange={(v) => updateFilter("status", v)}>
              <SelectTrigger className="w-40"><SelectValue placeholder="All Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.appointmentType} onValueChange={(v) => updateFilter("appointmentType", v)}>
              <SelectTrigger className="w-44"><SelectValue placeholder="All Types" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {APPOINTMENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.positionId} onValueChange={(v) => updateFilter("positionId", v)}>
              <SelectTrigger className="w-48">
                <span className="truncate text-sm">
                  {filters.positionId === "all" ? "All Positions" : positions.find((p) => p.id === filters.positionId)?.name ?? "All Positions"}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Positions</SelectItem>
                {positions.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button
              variant={filters.expiring ? "default" : "outline"}
              size="sm"
              onClick={() => updateFilter("expiring", !filters.expiring)}
              className={cn("flex items-center gap-1", filters.expiring && "bg-amber-500 hover:bg-amber-600 border-amber-500 text-white")}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              Expiring Soon
            </Button>
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
                <th className="text-left px-4 py-3 font-medium text-gray-600">Appointee</th>
                <th className="hidden md:table-cell text-left px-4 py-3 font-medium text-gray-600">Entity</th>
                <th className="hidden md:table-cell text-left px-4 py-3 font-medium text-gray-600">Position</th>
                <th className="hidden lg:table-cell text-left px-4 py-3 font-medium text-gray-600">Type</th>
                <th className="hidden sm:table-cell text-left px-4 py-3 font-medium text-gray-600">Effective Date</th>
                <th className="hidden sm:table-cell text-left px-4 py-3 font-medium text-gray-600">End Date</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-8 text-gray-400"><RefreshCw className="h-6 w-6 animate-spin mx-auto" /></td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-8 text-gray-400">No appointments found</td></tr>
              ) : (
                items.map((item) => {
                  const endOverdue = isEndDateOverdue(item.endDate, item.status);
                  return (
                    <tr key={item.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/legal-appointments/${item.id}`} className="font-semibold text-blue-600 hover:underline">{item.referenceNo}</Link>
                      </td>
                      <td className="px-4 py-3 text-gray-900 font-medium">{item.fullName}</td>
                      <td className="hidden md:table-cell px-4 py-3 text-gray-600">{item.entityName}</td>
                      <td className="hidden md:table-cell px-4 py-3 text-gray-600">{item.position?.name || "—"}</td>
                      <td className="hidden lg:table-cell px-4 py-3 text-gray-600">{item.appointmentType?.replace(/_/g, " ") || "—"}</td>
                      <td className="hidden sm:table-cell px-4 py-3 text-gray-600">{formatDate(item.effectiveDate)}</td>
                      <td className={cn("hidden sm:table-cell px-4 py-3", endOverdue ? "text-red-600 font-medium" : "text-gray-600")}>
                        {item.endDate ? formatDate(item.endDate) : "—"}
                        {endOverdue && item.endDate && <span className="ml-1 text-xs">(Expired)</span>}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
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

export default function LegalAppointmentsPage() {
  return (
    <Suspense>
      <LegalAppointmentsPageInner />
    </Suspense>
  );
}
