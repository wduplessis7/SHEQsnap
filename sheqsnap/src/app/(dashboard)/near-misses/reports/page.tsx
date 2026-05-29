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
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from "recharts";

const CATEGORY_COLORS = [
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

export default function NearMissTrendsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const initialized = useRef(false);

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState<any[]>([]);

  const defaultFrom = new Date(new Date().setMonth(new Date().getMonth() - 11)).toISOString().split("T")[0];
  const defaultTo = new Date().toISOString().split("T")[0];

  const [filters, setFilters] = useState({
    from: defaultFrom,
    to: defaultTo,
    departmentId: "all",
  });

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
      const res = await fetch(`/api/near-misses/trends?${params}`);
      setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetch("/api/admin/departments").then((r) => r.json()).then(setDepartments).catch(() => {});
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const colorFor = (index: number) => CATEGORY_COLORS[index % CATEGORY_COLORS.length];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/near-misses">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-yellow-500" />
              <h1 className="text-2xl font-bold text-gray-900">Near Miss Trends</h1>
            </div>
            <p className="text-gray-500 mt-1">Risk category and injury type trend analysis</p>
          </div>
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
          <RefreshCw className="h-8 w-8 animate-spin text-yellow-500" />
        </div>
      ) : (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-gray-500">Total Near Misses</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{data.total}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-gray-500">Risk Categories</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{data.categories.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-gray-500">Top Category</p>
                <p className="text-xl font-bold text-orange-600 mt-1 truncate">
                  {data.categoryBreakdown[0]?.category ?? "—"}
                </p>
                <p className="text-sm text-gray-500">{data.categoryBreakdown[0]?.count ?? 0} reports</p>
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

          {/* Monthly trend — stacked bar by risk category */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Monthly Trend by Risk Category</CardTitle>
            </CardHeader>
            <CardContent>
              {data.monthlyTrend.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">No data in selected period.</p>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={data.monthlyTrend.map((d: any) => ({ ...d, month: formatMonth(d.month) }))} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    {data.categories.map((cat: string, i: number) => (
                      <Bar key={cat} dataKey={cat} stackId="a" fill={colorFor(i)} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Monthly line chart — total volume */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Monthly Volume</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart
                  data={data.monthlyTrend.map((d: any) => {
                    const total = data.categories.reduce((s: number, c: string) => s + (d[c] || 0), 0);
                    return { month: formatMonth(d.month), total };
                  })}
                  margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="total" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} name="Near Misses" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Risk Category breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">By Risk Category</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={data.categoryBreakdown}
                      dataKey="count"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                      labelLine={false}
                    >
                      {data.categoryBreakdown.map((_: any, i: number) => (
                        <Cell key={i} fill={colorFor(i)} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                {/* Legend table */}
                <div className="mt-2 space-y-1">
                  {data.categoryBreakdown.map((c: any, i: number) => (
                    <div key={c.category} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="inline-block w-3 h-3 rounded-full shrink-0" style={{ background: colorFor(i) }} />
                        <span className="text-gray-700">{c.category}</span>
                      </div>
                      <span className="font-semibold text-gray-900">{c.count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Severity breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">By Severity</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart
                    data={["CRITICAL", "HIGH", "MEDIUM", "LOW"].map((sev) => ({
                      severity: sev,
                      count: data.severityBreakdown.find((s: any) => s.severity === sev)?.count ?? 0,
                    }))}
                    margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="severity" tick={{ fontSize: 11 }} width={70} />
                    <Tooltip />
                    <Bar dataKey="count" name="Near Misses" radius={[0, 4, 4, 0]}>
                      {["CRITICAL", "HIGH", "MEDIUM", "LOW"].map((sev) => (
                        <Cell key={sev} fill={SEVERITY_COLORS[sev]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>

                {/* Status breakdown */}
                <p className="text-sm font-semibold text-gray-700 mt-6 mb-2">By Status</p>
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
                          <div
                            className="h-full rounded-full bg-yellow-400"
                            style={{ width: `${pct}%` }}
                          />
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
