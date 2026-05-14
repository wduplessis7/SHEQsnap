"use client";

export const dynamic = "force-dynamic";


import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Plus, Search, RefreshCw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { SeverityBadge } from "@/components/ui/severity-badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate, isOverdue } from "@/lib/utils";
import { cn } from "@/lib/utils";

const STATUSES = ["OPEN", "IN_PROGRESS", "COMPLETED", "OVERDUE", "CANCELLED"];
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

export default function ActionsPage() {
  const searchParams = useSearchParams();
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [users, setUsers] = useState<any[]>([]);

  const [filters, setFilters] = useState({
    status: "all",
    priority: "all",
    ownerId: "all",
    linkedType: "all",
    overdue: searchParams.get("overdue") === "true" ? "true" : "false",
    search: "",
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (filters.status !== "all") params.set("status", filters.status);
    if (filters.priority !== "all") params.set("priority", filters.priority);
    if (filters.ownerId !== "all") params.set("ownerId", filters.ownerId);
    if (filters.linkedType !== "all") params.set("linkedType", filters.linkedType);
    if (filters.overdue === "true") params.set("overdue", "true");
    if (filters.search) params.set("search", filters.search);

    try {
      const res = await fetch(`/api/actions?${params}`);
      const data = await res.json();
      setItems(data.items);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    fetch("/api/admin/users").then((r) => r.json()).then((data) => setUsers(data.filter((u: any) => u.active))).catch(() => {});
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
          <h1 className="text-2xl font-bold text-gray-900">Actions</h1>
          <p className="text-gray-500 mt-1">{total} action{total !== 1 ? "s" : ""}</p>
        </div>
        <Link href="/actions/new">
          <Button><Plus className="h-4 w-4" />New Action</Button>
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
              <SelectTrigger className="w-36"><SelectValue placeholder="All Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.priority} onValueChange={(v) => updateFilter("priority", v)}>
              <SelectTrigger className="w-36"><SelectValue placeholder="All Priority" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                {PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.linkedType} onValueChange={(v) => updateFilter("linkedType", v)}>
              <SelectTrigger className="w-36"><SelectValue placeholder="All Types" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="NEAR_MISS">Near Miss</SelectItem>
                <SelectItem value="INCIDENT">Incident</SelectItem>
                <SelectItem value="OTHER">Standalone</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.ownerId} onValueChange={(v) => updateFilter("ownerId", v)}>
              <SelectTrigger className="w-40"><SelectValue placeholder="All Owners" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Owners</SelectItem>
                {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button
              variant={filters.overdue === "true" ? "destructive" : "outline"}
              size="sm"
              onClick={() => updateFilter("overdue", filters.overdue === "true" ? "false" : "true")}
              className="flex items-center gap-1"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              Overdue Only
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
                <th className="text-left px-4 py-3 font-medium text-gray-600">Description</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Owner</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Priority</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Due Date</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Linked To</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-8 text-gray-400"><RefreshCw className="h-6 w-6 animate-spin mx-auto" /></td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-gray-400">No actions found</td></tr>
              ) : (
                items.map((item) => {
                  const overdue = isOverdue(item.dueDate, item.status);
                  return (
                    <tr key={item.id} className={cn("border-b last:border-0 hover:bg-gray-50 transition-colors", overdue && "bg-red-50 hover:bg-red-100")}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {item.escalationFlag && <AlertTriangle className="h-3.5 w-3.5 text-red-500" />}
                          <Link href={`/actions/${item.id}`} className="font-semibold text-blue-600 hover:underline">{item.referenceNo}</Link>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-700 max-w-xs truncate">{item.description}</td>
                      <td className="px-4 py-3 text-gray-600">{item.owner?.name}</td>
                      <td className="px-4 py-3"><SeverityBadge severity={item.priority} /></td>
                      <td className={cn("px-4 py-3", overdue ? "text-red-600 font-medium" : "text-gray-600")}>
                        {formatDate(item.dueDate)}
                        {overdue && <span className="ml-1 text-xs">(Overdue)</span>}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {item.linkedNearMiss ? (
                          <Link href={`/near-misses/${item.linkedNearMiss.id}`} className="text-blue-500 hover:underline">{item.linkedNearMiss.referenceNo}</Link>
                        ) : item.linkedIncident ? (
                          <Link href={`/incidents/${item.linkedIncident.id}`} className="text-blue-500 hover:underline">{item.linkedIncident.referenceNo}</Link>
                        ) : "Standalone"}
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
