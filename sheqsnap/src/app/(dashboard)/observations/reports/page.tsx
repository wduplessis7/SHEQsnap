"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  RefreshCw,
  Eye,
  AlertTriangle,
  CheckSquare,
  Clock,
  ChevronLeft,
} from "lucide-react";
import Link from "next/link";

interface Stats {
  totalObservations: number;
  openObservations: number;
  closedObservations: number;
  byRiskLevel: { LOW: number; MEDIUM: number; HIGH: number };
  bySafetyCategory: Array<{ category: string; count: number }>;
  byLocation: Array<{ location: string; count: number }>;
  byWorkType: Array<{ type: string; count: number }>;
  actionsOverdue: number;
  actionsByStatus: { OPEN: number; IN_PROGRESS: number; CLOSED: number };
  trendLast12Weeks: Array<{ week: string; safeCount: number; unsafeCount: number }>;
  topUnsafeBehaviours: Array<{ behaviour: string; count: number }>;
  observationsByMonth: Array<{ month: string; count: number }>;
}

const PIE_COLORS = ["#22c55e", "#eab308", "#ef4444"];
const ACTION_COLORS: Record<string, string> = {
  OPEN: "#3b82f6",
  IN_PROGRESS: "#eab308",
  CLOSED: "#22c55e",
};

export default function ObservationsReportsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/behaviour-observations/stats");
      if (res.ok) setStats(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStats(); }, []);

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const riskPieData = [
    { name: "Low", value: stats.byRiskLevel.LOW },
    { name: "Medium", value: stats.byRiskLevel.MEDIUM },
    { name: "High", value: stats.byRiskLevel.HIGH },
  ].filter((d) => d.value > 0);

  const actionStatusData = [
    { status: "OPEN", count: stats.actionsByStatus.OPEN },
    { status: "IN_PROGRESS", count: stats.actionsByStatus.IN_PROGRESS },
    { status: "CLOSED", count: stats.actionsByStatus.CLOSED },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <Link href="/observations" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-2">
            <ChevronLeft className="h-4 w-4 mr-1" /> Back to Observations
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">BBS Observation Reports</h1>
          <p className="text-gray-500 mt-1">Behaviour-Based Safety analytics and trends</p>
        </div>
        <Button variant="outline" size="icon" onClick={fetchStats}>
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </Button>
      </div>

      {/* Power BI note */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
        <strong>Power BI Integration:</strong> Connect to the <code className="font-mono text-xs bg-blue-100 px-1 rounded">/api/behaviour-observations</code> endpoint or direct SQLite access to export this data into Power BI dashboards.
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalObservations}</p>
              </div>
              <Eye className="h-8 w-8 text-blue-300" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Open</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">{stats.openObservations}</p>
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
                <p className="text-3xl font-bold text-red-600 mt-1">{stats.byRiskLevel.HIGH}</p>
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
                <p className="text-3xl font-bold text-orange-600 mt-1">{stats.actionsOverdue}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-300" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts row 1: Trend + Safety Category */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend Line */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Safe vs Unsafe Behaviours — Last 12 Weeks</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={stats.trendLast12Weeks}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="safeCount" name="Safe" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="unsafeCount" name="Unsafe" stroke="#eab308" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Safety Category Bar */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Observations by Safety Category</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={stats.bySafetyCategory} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                <YAxis dataKey="category" type="category" tick={{ fontSize: 11 }} width={90} />
                <Tooltip />
                <Bar dataKey="count" name="Count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts row 2: Risk Pie + Action Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Level Donut */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Risk Level Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {riskPieData.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-gray-400 text-sm">No risk data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={riskPieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {riskPieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Action Status Bar */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Action Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={actionStatusData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="status" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" name="Count" radius={[4, 4, 0, 0]}>
                  {actionStatusData.map((entry, i) => (
                    <Cell key={i} fill={ACTION_COLORS[entry.status] || "#6b7280"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Bottom row: Top Locations + Top Unsafe Behaviours */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Locations */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Locations by Observation Count</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.byLocation.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No location data yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b">
                    <tr>
                      <th className="text-left py-2 pr-4 font-medium text-gray-600">Rank</th>
                      <th className="text-left py-2 pr-4 font-medium text-gray-600">Location</th>
                      <th className="text-right py-2 font-medium text-gray-600">Observations</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.byLocation.slice(0, 10).map((loc, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="py-2 pr-4 text-gray-400 font-mono">#{i + 1}</td>
                        <td className="py-2 pr-4 text-gray-800 font-medium">{loc.location}</td>
                        <td className="py-2 text-right font-bold text-blue-600">{loc.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Unsafe Behaviours */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top 5 Unsafe Behaviours</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.topUnsafeBehaviours.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No unsafe behaviour data yet</p>
            ) : (
              <div className="space-y-3">
                {stats.topUnsafeBehaviours.map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-lg font-bold text-amber-500 w-6 shrink-0">#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{item.behaviour}</p>
                      <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-400 rounded-full"
                          style={{ width: `${Math.min((item.count / (stats.topUnsafeBehaviours[0]?.count || 1)) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-sm font-bold text-gray-600 shrink-0">{item.count}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Monthly trend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Observations per Month — Last 6 Months</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats.observationsByMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" name="Observations" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
