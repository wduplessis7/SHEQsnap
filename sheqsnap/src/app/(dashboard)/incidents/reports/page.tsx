"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { ArrowLeft, RefreshCw, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line,
} from "recharts";

const PALETTE = [
  "#3b82f6", "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16", "#f43f5e",
  "#14b8a6", "#a855f7",
];

const SEVERITY_COLORS: Record<string, string> = {
  LOW: "#22c55e",
  MEDIUM: "#eab308",
  HIGH: "#f97316",
  CRITICAL: "#ef4444",
};

const STATUS_COLORS: Record<string, string> = {
  NEW: "#94a3b8",
  SUBMITTED: "#3b82f6",
  UNDER_REVIEW: "#8b5cf6",
  IN_PROGRESS: "#f97316",
  ACTION_REQUIRED: "#ef4444",
  CLOSED: "#22c55e",
  CANCELLED: "#6b7280",
};

function formatMonth(ym: string) {
  const [year, month] = ym.split("-");
  return new Date(Number(year), Number(month) - 1).toLocaleString("default", { month: "short", year: "2-digit" });
}

function colorFor(i: number) {
  return PALETTE[i % PALETTE.length];
}

export default function IncidentTrendsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const initialized = useRef(false);

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState<any[]>([]);

  const defaultFrom = new Date(new Date().setMonth(new Date().getMonth() - 11)).toISOString().split("T")[0];
  const defaultTo = new Date().toISOString().split("T")[0];

  const [filters, setFilters] = useState({ from: defaultFrom, to: defaultTo, departmentId: "all" });

  useEffect(() => {
    if (sessionStatus === "loading" || departments.length === 0 || initialized.current) return;
    initialized.current = true;
    const deptId = (session?.user as any)?.departmentId;
    if (deptId) setFilters((f) => ({ ...f, departmentId: deptId }));
  }, [sessionStatus, session, departments]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
    if (filters.departmentId !== "all") params.set("departmentId", filters.departmentId);
    try {
      const res = await fetch(`/api/incidents/trends?${params}`);
      setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetch("/api/admin/departments").then((r) => r.json()).then(setDepartments).catch(() => {});
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/incidents">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-orange-500" />
            <h1 className="text-2xl font-bold text-gray-900">Incident Trends</h1>
          </div>
          <p className="text-gray-500 mt-1">Injury type, incident type, and severity trend analysis</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <Label className="text-xs">From</Label>
              <Input type="date" value={filters.from} onChange={(e) => setFilters((p) => ({ ...p, from: e.target.value }))} className="mt-1 w-40" />
            </div>
            <div>
              <Label className="text-xs">To</Label>
              <Input type="date" value={filters.to} onChange={(e) => setFilters((p) => ({ ...p, to: e.target.value }))} className="mt-1 w-40" />
            </div>
            <div>
              <Label className="text-xs">Department</Label>
              <Select value={filters.departmentId} onValueChange={(v) => setFilters((p) => ({ ...p, departmentId: v }))}>
                <SelectTrigger className="mt-1 w-48"><span className="truncate text-sm">{filters.departmentId === "all" ? "All Departments" : departments.find((d) => d.id === filters.departmentId)?.name ?? "All Departments"}</span></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={fetchData} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              {loading ? "Loading..." : "Apply"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading || !data ? (
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-orange-500" />
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-gray-500">Total Incidents</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{data.total}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-gray-500">Top Injury Type</p>
                <p className="text-lg font-bold text-orange-600 mt-1 truncate">
                  {data.injuryBreakdown[0]?.label ?? "—"}
                </p>
                <p className="text-sm text-gray-500">{data.injuryBreakdown[0]?.count ?? 0} cases</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-gray-500">Top Incident Type</p>
                <p className="text-lg font-bold text-blue-600 mt-1 truncate">
                  {data.incidentTypeBreakdown[0]?.label ?? "—"}
                </p>
                <p className="text-sm text-gray-500">{data.incidentTypeBreakdown[0]?.count ?? 0} cases</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-gray-500">Critical / High</p>
                <p className="text-3xl font-bold text-red-600 mt-1">
                  {(data.severityBreakdown.find((s: any) => s.severity === "CRITICAL")?.count ?? 0) +
                   (data.severityBreakdown.find((s: any) => s.severity === "HIGH")?.count ?? 0)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Monthly trend — injury type */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Monthly Trend by Injury Type</CardTitle>
            </CardHeader>
            <CardContent>
              {data.injuryTrend.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">No data in selected period.</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={data.injuryTrend.map((d: any) => ({ ...d, month: formatMonth(d.month) }))}
                    margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    {data.injuryTypes.map((type: string, i: number) => (
                      <Bar key={type} dataKey={type} stackId="a" fill={colorFor(i)} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Monthly trend — incident type */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Monthly Trend by Incident Type</CardTitle>
            </CardHeader>
            <CardContent>
              {data.incidentTypeTrend.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">No data in selected period.</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    data={data.incidentTypeTrend.map((d: any) => ({ ...d, month: formatMonth(d.month) }))}
                    margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    {data.incidentTypes.map((type: string, i: number) => (
                      <Bar key={type} dataKey={type} stackId="b" fill={colorFor(i)} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Monthly volume line */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Monthly Volume</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart
                  data={data.injuryTrend.map((d: any) => {
                    const total = data.injuryTypes.reduce((s: number, t: string) => s + (d[t] || 0), 0);
                    return { month: formatMonth(d.month), total };
                  })}
                  margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="total" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} name="Incidents" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Injury type breakdown pie */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">By Injury Type</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={data.injuryBreakdown}
                      dataKey="count"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                    >
                      {data.injuryBreakdown.map((_: any, i: number) => (
                        <Cell key={i} fill={colorFor(i)} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-2 space-y-1">
                  {data.injuryBreakdown.map((c: any, i: number) => (
                    <div key={c.label} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="inline-block w-3 h-3 rounded-full shrink-0" style={{ background: colorFor(i) }} />
                        <span className="text-gray-700">{c.label}</span>
                      </div>
                      <span className="font-semibold text-gray-900">{c.count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Severity + Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">By Severity</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart
                    data={["CRITICAL", "HIGH", "MEDIUM", "LOW"].map((sev) => ({
                      severity: sev,
                      count: data.severityBreakdown.find((s: any) => s.severity === sev)?.count ?? 0,
                    }))}
                    layout="vertical"
                    margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="severity" tick={{ fontSize: 11 }} width={70} />
                    <Tooltip />
                    <Bar dataKey="count" name="Incidents" radius={[0, 4, 4, 0]}>
                      {["CRITICAL", "HIGH", "MEDIUM", "LOW"].map((sev) => (
                        <Cell key={sev} fill={SEVERITY_COLORS[sev]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>

                <p className="text-sm font-semibold text-gray-700 mt-5 mb-2">By Status</p>
                <div className="space-y-1.5">
                  {data.statusBreakdown
                    .sort((a: any, b: any) => b.count - a.count)
                    .map((s: any) => (
                      <div key={s.status} className="flex items-center gap-2 text-sm">
                        <span
                          className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ background: STATUS_COLORS[s.status] ?? "#9ca3af" }}
                        />
                        <span className="flex-1 text-gray-600">{s.status.replace("_", " ")}</span>
                        <span className="font-semibold text-gray-900">{s.count}</span>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top locations */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top Locations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.topLocations.map((loc: any, i: number) => {
                  const pct = Math.round((loc.count / data.total) * 100);
                  return (
                    <div key={loc.location} className="flex items-center gap-3">
                      <span className="text-xs text-gray-400 w-5 text-right">{i + 1}</span>
                      <div className="flex-1">
                        <div className="flex justify-between text-sm mb-0.5">
                          <span className="text-gray-700 font-medium">{loc.location}</span>
                          <span className="text-gray-500">{loc.count} ({pct}%)</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-orange-400" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
