"use client";

export const dynamic = "force-dynamic";


import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from "recharts";
import {
  AlertTriangle,
  FileWarning,
  CheckSquare,
  Clock,
  TrendingUp,
  RefreshCw,
  BookOpen,
  ClipboardCheck,
  ClipboardList,
  HelpCircle,
} from "lucide-react";
import { formatDate, isOverdue, STATUS_COLORS, SEVERITY_COLORS } from "@/lib/utils";
import Link from "next/link";

const SEVERITY_CHART_COLORS = {
  LOW: "#22c55e",
  MEDIUM: "#eab308",
  HIGH: "#f97316",
  CRITICAL: "#ef4444",
};

const STATUS_CHART_COLORS: Record<string, string> = {
  OPEN: "#3b82f6",
  IN_PROGRESS: "#eab308",
  COMPLETED: "#22c55e",
  OVERDUE: "#ef4444",
  CANCELLED: "#9ca3af",
};

const PIE_COLORS = ["#3b82f6", "#22c55e", "#f97316", "#ef4444", "#8b5cf6", "#06b6d4"];

interface Stats {
  kpis: {
    totalNearMisses: number;
    totalIncidents: number;
    openActions: number;
    overdueActions: number;
    pendingApprovals: number;
    totalLogEntries: number;
  };
  nearMissesBySeverity: Array<{ severity: string; count: number }>;
  incidentsBySeverity: Array<{ severity: string; count: number }>;
  nearMissesByDepartment: Array<{ department: string; count: number }>;
  actionsByStatus: Array<{ status: string; count: number }>;
  monthlyTrend: Array<{ month: string; nearMisses: number; incidents: number }>;
  recentOverdueActions: any[];
  checklistStats?: {
    dueToday: number;
    submittedToday: number;
    overdue: number;
    completionRateToday: number;
  };
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState<any[]>([]);
  const [selectedDept, setSelectedDept] = useState("all");

  const fetchStats = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedDept !== "all") params.set("departmentId", selectedDept);
      const [statsRes, deptRes] = await Promise.all([
        fetch(`/api/dashboard/stats?${params}`),
        fetch("/api/admin/departments"),
      ]);
      const statsData = await statsRes.json();
      const deptData = await deptRes.json();
      setStats(statsData);
      setDepartments(deptData);
    } catch {
      console.error("Failed to load dashboard stats");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [selectedDept]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!stats) return <div>Failed to load dashboard</div>;

  const kpiCards = [
    {
      title: "Total Near Misses",
      value: stats.kpis.totalNearMisses,
      icon: AlertTriangle,
      color: "text-yellow-600",
      bg: "bg-yellow-50",
      href: "/near-misses",
    },
    {
      title: "Total Incidents",
      value: stats.kpis.totalIncidents,
      icon: FileWarning,
      color: "text-orange-600",
      bg: "bg-orange-50",
      href: "/incidents",
    },
    {
      title: "Open Actions",
      value: stats.kpis.openActions,
      icon: CheckSquare,
      color: "text-blue-600",
      bg: "bg-blue-50",
      href: "/actions",
    },
    {
      title: "Overdue Actions",
      value: stats.kpis.overdueActions,
      icon: Clock,
      color: "text-red-600",
      bg: "bg-red-50",
      href: "/actions?overdue=true",
    },
    {
      title: "Pending Approvals",
      value: stats.kpis.pendingApprovals,
      icon: ClipboardCheck,
      color: "text-orange-600",
      bg: "bg-orange-50",
      href: "/approvals",
    },
    {
      title: "Log Entries",
      value: stats.kpis.totalLogEntries,
      icon: BookOpen,
      color: "text-teal-600",
      bg: "bg-teal-50",
      href: "/logs",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <Link href="/help/dashboard" className="text-gray-400 hover:text-blue-600 transition-colors" title="Help: Dashboard">
              <HelpCircle className="h-5 w-5" />
            </Link>
          </div>
          <p className="text-gray-500 mt-1">Safety performance overview</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedDept} onValueChange={setSelectedDept}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={fetchStats}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpiCards.map((kpi) => (
          <Link key={kpi.title} href={kpi.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">{kpi.title}</p>
                    <p className={`text-3xl font-bold mt-1 ${kpi.color}`}>{kpi.value}</p>
                  </div>
                  <div className={`p-3 rounded-xl ${kpi.bg}`}>
                    <kpi.icon className={`h-6 w-6 ${kpi.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Checklists Today Widget */}
      <Link href="/checklists">
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-500">Checklists Today</p>
                {!stats.checklistStats || stats.checklistStats.dueToday === 0 ? (
                  <p className="text-sm text-gray-400 mt-1">No checklists due today</p>
                ) : (
                  <>
                    <p className="text-3xl font-bold mt-1 text-green-600">
                      {stats.checklistStats.submittedToday} / {stats.checklistStats.dueToday}{" "}
                      <span className="text-base font-medium text-gray-500">completed</span>
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-sm text-gray-500">
                        {stats.checklistStats.completionRateToday}% completion rate
                      </span>
                      {stats.checklistStats.overdue > 0 && (
                        <span className="text-sm font-medium text-orange-600">
                          ⚠ {stats.checklistStats.overdue} overdue
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
              <div className="p-3 rounded-xl bg-green-50 ml-4 shrink-0">
                <ClipboardList className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Incidents by Severity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Incidents by Severity</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={stats.incidentsBySeverity}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="severity" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" name="Count" radius={[4, 4, 0, 0]}>
                  {stats.incidentsBySeverity.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={
                        SEVERITY_CHART_COLORS[entry.severity as keyof typeof SEVERITY_CHART_COLORS] ||
                        "#6b7280"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Near Misses by Department */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Near Misses by Department</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={stats.nearMissesByDepartment}
                  dataKey="count"
                  nameKey="department"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, percent }: any) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                >
                  {stats.nearMissesByDepartment.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(val, name) => [val, name]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              12-Month Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={stats.monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v) => v.split(" ")[0]}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="nearMisses"
                  name="Near Misses"
                  stroke="#eab308"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="incidents"
                  name="Incidents"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Actions by Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Actions by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={stats.actionsByStatus} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis dataKey="status" type="category" tick={{ fontSize: 11 }} width={80} />
                <Tooltip />
                <Bar dataKey="count" name="Count" radius={[0, 4, 4, 0]}>
                  {stats.actionsByStatus.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={STATUS_CHART_COLORS[entry.status] || "#6b7280"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Overdue Actions */}
      {stats.recentOverdueActions.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2 text-red-600">
              <Clock className="h-4 w-4" />
              Overdue Actions ({stats.recentOverdueActions.length})
            </CardTitle>
            <Link href="/actions?overdue=true">
              <Button variant="outline" size="sm">View All</Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-2 pr-4 font-medium">Reference</th>
                    <th className="pb-2 pr-4 font-medium">Description</th>
                    <th className="pb-2 pr-4 font-medium">Owner</th>
                    <th className="pb-2 pr-4 font-medium">Priority</th>
                    <th className="pb-2 pr-4 font-medium">Due Date</th>
                    <th className="pb-2 font-medium">Linked To</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentOverdueActions.map((action) => (
                    <tr key={action.id} className="border-b last:border-0 bg-red-50">
                      <td className="py-2 pr-4">
                        <Link
                          href={`/actions/${action.id}`}
                          className="font-medium text-blue-600 hover:underline"
                        >
                          {action.referenceNo}
                        </Link>
                      </td>
                      <td className="py-2 pr-4 max-w-xs truncate">{action.description}</td>
                      <td className="py-2 pr-4">{action.owner?.name}</td>
                      <td className="py-2 pr-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            SEVERITY_COLORS[action.priority as keyof typeof SEVERITY_COLORS] ||
                            "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {action.priority}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-red-600 font-medium">
                        {formatDate(action.dueDate)}
                      </td>
                      <td className="py-2">
                        {action.linkedNearMiss?.referenceNo ||
                          action.linkedIncident?.referenceNo ||
                          "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
