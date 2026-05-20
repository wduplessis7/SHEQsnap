"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, RefreshCw, Eye, AlertTriangle, CheckSquare, Clock, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { cn, formatDate } from "@/lib/utils";
import Link from "next/link";

interface BehaviourAction {
  id: string;
  status: string;
  dueDate: string;
}

interface Observation {
  id: string;
  observationDate: string;
  location: string;
  observerName: string;
  workType: string;
  safeBehaviours: string | null;
  unsafeBehaviours: string | null;
  riskLevel: string | null;
  status: string;
  actions: BehaviourAction[];
  _count: { actions: number; evidence: number };
}

interface SummaryStats {
  totalObservations: number;
  openObservations: number;
  actionsOverdue: number;
}

function riskBadge(level: string | null) {
  if (!level) return <span className="text-gray-400 text-xs">—</span>;
  const map: Record<string, string> = {
    HIGH: "bg-red-100 text-red-700",
    MEDIUM: "bg-amber-100 text-amber-700",
    LOW: "bg-green-100 text-green-700",
  };
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold", map[level] || "bg-gray-100 text-gray-700")}>
      {level}
    </span>
  );
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    OPEN: "bg-blue-100 text-blue-700",
    IN_PROGRESS: "bg-amber-100 text-amber-700",
    CLOSED: "bg-green-100 text-green-700",
  };
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold", map[status] || "bg-gray-100 text-gray-700")}>
      {status.replace("_", " ")}
    </span>
  );
}

function parseJsonArray(val: string | null): string[] {
  if (!val) return [];
  try { return JSON.parse(val) as string[]; } catch { return []; }
}

export default function ObservationsClient() {
  const router = useRouter();
  const [observations, setObservations] = useState<Observation[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<SummaryStats | null>(null);

  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterRisk, setFilterRisk] = useState("ALL");
  const [filterCategory, setFilterCategory] = useState("ALL");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [filterLocation, setFilterLocation] = useState("");

  const fetchObservations = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus !== "ALL") params.set("status", filterStatus);
      if (filterRisk !== "ALL") params.set("riskLevel", filterRisk);
      if (filterCategory !== "ALL") params.set("safetyCategory", filterCategory);
      if (filterFrom) params.set("from", filterFrom);
      if (filterTo) params.set("to", filterTo);
      if (filterLocation) params.set("location", filterLocation);

      const [obsRes, statsRes] = await Promise.all([
        fetch(`/api/behaviour-observations?${params}`),
        fetch("/api/behaviour-observations/stats"),
      ]);
      if (obsRes.ok) setObservations(await obsRes.json());
      if (statsRes.ok) {
        const s = await statsRes.json();
        setStats({
          totalObservations: s.totalObservations,
          openObservations: s.openObservations,
          actionsOverdue: s.actionsOverdue,
        });
      }
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterRisk, filterCategory, filterFrom, filterTo, filterLocation]);

  useEffect(() => { fetchObservations(); }, [fetchObservations]);

  const highRisk = observations.filter((o) => o.riskLevel === "HIGH").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Behaviour Observations</h1>
            <Link href="/help/behaviour-observations" className="text-gray-400 hover:text-blue-600 transition-colors" title="Help: Behaviour Observations">
              <HelpCircle className="h-5 w-5" />
            </Link>
          </div>
          <p className="text-gray-500 mt-1">Behaviour-Based Safety (BBS) observation register</p>
        </div>
        <div className="flex gap-2">
          <Link href="/observations/reports">
            <Button variant="outline" size="sm">Reports</Button>
          </Link>
          <Button onClick={() => router.push("/observations/new")}>
            <Plus className="h-4 w-4 mr-2" />
            New Observation
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats?.totalObservations ?? "—"}</p>
              </div>
              <Eye className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Open</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">{stats?.openObservations ?? "—"}</p>
              </div>
              <CheckSquare className="h-8 w-8 text-blue-300" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">High Risk</p>
                <p className="text-3xl font-bold text-red-600 mt-1">{highRisk}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-300" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Overdue Actions</p>
                <p className="text-3xl font-bold text-orange-600 mt-1">{stats?.actionsOverdue ?? "—"}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-300" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            <div>
              <Label className="text-xs text-gray-500 mb-1 block">Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  <SelectItem value="OPEN">Open</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="CLOSED">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-gray-500 mb-1 block">Risk Level</Label>
              <Select value={filterRisk} onValueChange={setFilterRisk}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Risks</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="LOW">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-gray-500 mb-1 block">Category</Label>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Categories</SelectItem>
                  {["PPE","HOUSEKEEPING","EQUIPMENT","PROCEDURE","ENVIRONMENT","ERGONOMICS","OTHER"].map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-gray-500 mb-1 block">From</Label>
              <Input type="date" className="h-9" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs text-gray-500 mb-1 block">To</Label>
              <Input type="date" className="h-9" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs text-gray-500 mb-1 block">Location</Label>
              <div className="flex gap-1">
                <Input className="h-9" placeholder="Search..." value={filterLocation} onChange={(e) => setFilterLocation(e.target.value)} />
                <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={fetchObservations}>
                  <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Location</th>
                <th className="hidden md:table-cell text-left px-4 py-3 font-medium text-gray-600">Observer</th>
                <th className="hidden md:table-cell text-left px-4 py-3 font-medium text-gray-600">Work Type</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  <span className="text-green-700">Safe ✓</span>
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  <span className="text-amber-700">Unsafe ⚠</span>
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Risk</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="hidden sm:table-cell text-left px-4 py-3 font-medium text-gray-600">Actions</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-gray-400">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : observations.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-gray-400">
                    No observations found. <Link href="/observations/new" className="text-blue-600 hover:underline">Create the first one.</Link>
                  </td>
                </tr>
              ) : (
                observations.map((obs) => {
                  const safe = parseJsonArray(obs.safeBehaviours);
                  const unsafe = parseJsonArray(obs.unsafeBehaviours);
                  return (
                    <tr
                      key={obs.id}
                      className="border-b last:border-0 hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => router.push(`/observations/${obs.id}`)}
                    >
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                        {formatDate(obs.observationDate)}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{obs.location}</td>
                      <td className="hidden md:table-cell px-4 py-3 text-gray-600">{obs.observerName}</td>
                      <td className="hidden md:table-cell px-4 py-3 text-gray-600 capitalize">
                        {obs.workType.replace("_", " ")}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-green-700 font-medium">{safe.length}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-amber-700 font-medium">{unsafe.length}</span>
                      </td>
                      <td className="px-4 py-3">{riskBadge(obs.riskLevel)}</td>
                      <td className="px-4 py-3">{statusBadge(obs.status)}</td>
                      <td className="hidden sm:table-cell px-4 py-3 text-gray-600">{obs._count.actions}</td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/observations/${obs.id}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button variant="ghost" size="sm" className="h-7 px-2">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
