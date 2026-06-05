"use client";

export const dynamic = "force-dynamic";


import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from "recharts";
import { Download, FileSpreadsheet, FileText, RefreshCw } from "lucide-react";
import { PredictiveRisksPanel } from "@/components/ai/PredictiveRisksPanel";
import { useHasModule } from "@/lib/modules-context";

const SEVERITY_CHART_COLORS = { LOW: "#22c55e", MEDIUM: "#eab308", HIGH: "#f97316", CRITICAL: "#ef4444" };
const STATUS_CHART_COLORS: Record<string, string> = {
  OPEN: "#3b82f6", IN_PROGRESS: "#eab308", COMPLETED: "#22c55e", OVERDUE: "#ef4444", CANCELLED: "#9ca3af",
};
const PIE_COLORS = ["#3b82f6", "#22c55e", "#f97316", "#ef4444", "#8b5cf6", "#06b6d4"];

export default function ReportsPage() {
  const hasAiModule = useHasModule("ai");
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState<any[]>([]);
  const [exporting, setExporting] = useState<"excel" | "pdf" | null>(null);

  const [filters, setFilters] = useState({
    from: new Date(new Date().setMonth(new Date().getMonth() - 12)).toISOString().split("T")[0],
    to: new Date().toISOString().split("T")[0],
    departmentId: "all",
  });

  async function fetchStats() {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.departmentId !== "all") params.set("departmentId", filters.departmentId);
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);

    try {
      const [statsRes, deptRes] = await Promise.all([
        fetch(`/api/dashboard/stats?${params}`),
        fetch("/api/admin/departments"),
      ]);
      setStats(await statsRes.json());
      setDepartments(await deptRes.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchStats(); }, []);

  async function handleExport(type: "excel" | "pdf") {
    setExporting(type);
    const params = new URLSearchParams();
    if (filters.departmentId !== "all") params.set("departmentId", filters.departmentId);
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);

    try {
      const res = await fetch(`/api/reports/export-${type}?${params}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sheqsnap-report.${type === "excel" ? "xlsx" : "pdf"}`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-500 mt-1">Safety performance analytics and exports</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleExport("excel")} disabled={!!exporting}>
            <FileSpreadsheet className="h-4 w-4" />
            {exporting === "excel" ? "Exporting..." : "Export Excel"}
          </Button>
          <Button variant="outline" onClick={() => handleExport("pdf")} disabled={!!exporting}>
            <FileText className="h-4 w-4" />
            {exporting === "pdf" ? "Exporting..." : "Export PDF"}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <Label className="text-xs">From Date</Label>
              <Input type="date" value={filters.from} onChange={(e) => setFilters((p) => ({ ...p, from: e.target.value }))} className="mt-1 w-40" />
            </div>
            <div>
              <Label className="text-xs">To Date</Label>
              <Input type="date" value={filters.to} onChange={(e) => setFilters((p) => ({ ...p, to: e.target.value }))} className="mt-1 w-40" />
            </div>
            <div>
              <Label className="text-xs">Department</Label>
              <Select value={filters.departmentId} onValueChange={(v) => setFilters((p) => ({ ...p, departmentId: v }))}>
                <SelectTrigger className="mt-1 w-48"><SelectValue placeholder="All Departments" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={fetchStats} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              {loading ? "Loading..." : "Apply Filters"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading || !stats ? (
        <div className="flex items-center justify-center h-64"><RefreshCw className="h-8 w-8 animate-spin text-blue-600" /></div>
      ) : (
        <>
          {/* KPI Summary */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Near Misses", value: stats.kpis.totalNearMisses, color: "text-yellow-600" },
              { label: "Incidents", value: stats.kpis.totalIncidents, color: "text-orange-600" },
              { label: "Open Actions", value: stats.kpis.openActions, color: "text-blue-600" },
              { label: "Overdue Actions", value: stats.kpis.overdueActions, color: "text-red-600" },
            ].map((kpi) => (
              <Card key={kpi.label}>
                <CardContent className="p-6 text-center">
                  <p className={`text-4xl font-bold ${kpi.color}`}>{kpi.value}</p>
                  <p className="text-sm text-gray-500 mt-1">{kpi.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* AI Predictive Risks */}
          {hasAiModule && <PredictiveRisksPanel stats={stats} />}

          {/* Charts row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Monthly Trend (12 Months)</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={stats.monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} tickFormatter={(v) => v.split(" ")[0]} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="nearMisses" name="Near Misses" stroke="#eab308" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="incidents" name="Incidents" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Near Misses by Department</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={stats.nearMissesByDepartment} dataKey="count" nameKey="department" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {stats.nearMissesByDepartment.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Charts row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Incidents by Severity</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={stats.incidentsBySeverity}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="severity" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="count" name="Count" radius={[4, 4, 0, 0]}>
                      {stats.incidentsBySeverity.map((entry: any, i: number) => (
                        <Cell key={i} fill={SEVERITY_CHART_COLORS[entry.severity as keyof typeof SEVERITY_CHART_COLORS] || "#6b7280"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Actions by Status</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={stats.actionsByStatus} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis dataKey="status" type="category" tick={{ fontSize: 11 }} width={90} />
                    <Tooltip />
                    <Bar dataKey="count" name="Count" radius={[0, 4, 4, 0]}>
                      {stats.actionsByStatus.map((entry: any, i: number) => (
                        <Cell key={i} fill={STATUS_CHART_COLORS[entry.status] || "#6b7280"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
