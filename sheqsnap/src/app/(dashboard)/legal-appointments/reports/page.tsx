"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw, BarChart3, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────
interface ReportData {
  activeByEntity: { entityName: string; count: number }[];
  activeByDepartment: { departmentName: string; count: number }[];
  activeByPosition: { positionName: string; count: number }[];
  expiringNext30: any[];
  expiringNext90: any[];
  expiringNext180: any[];
  complianceIssues: {
    id: string;
    referenceNo: string;
    fullName: string;
    entityName: string;
    positionName: string;
    status: string;
    missingAcceptance: boolean;
    missingVetting: boolean;
    missingDeclaration: boolean;
    missingResolution: boolean;
  }[];
  diversitySummary: {
    gender: { label: string; count: number }[];
    race: { label: string; count: number }[];
    nationality: { label: string; count: number }[];
    disability: { label: string; count: number }[];
  };
  totals: { active: number; draft: number; expiring90: number; terminated: number };
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function daysRemaining(dateStr: string | null): number {
  if (!dateStr) return 0;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "green" | "gray" | "amber" | "red";
}) {
  const colorMap = {
    green: "bg-green-50 border-green-200 text-green-700",
    gray: "bg-gray-50 border-gray-200 text-gray-700",
    amber: "bg-amber-50 border-amber-200 text-amber-700",
    red: "bg-red-50 border-red-200 text-red-700",
  };
  const numColor = {
    green: "text-green-800",
    gray: "text-gray-800",
    amber: "text-amber-800",
    red: "text-red-800",
  };
  return (
    <Card className={cn("border", colorMap[color])}>
      <CardContent className="p-5">
        <p className={cn("text-sm font-medium", colorMap[color])}>{label}</p>
        <p className={cn("text-4xl font-bold mt-1", numColor[color])}>{value}</p>
      </CardContent>
    </Card>
  );
}

// ── Breakdown Table ───────────────────────────────────────────────────────────
function BreakdownTable({
  title,
  rows,
  labelKey,
}: {
  title: string;
  rows: Record<string, any>[];
  labelKey: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="text-left px-4 py-2 font-medium text-gray-600">Name</th>
              <th className="text-right px-4 py-2 font-medium text-gray-600">Count</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={2} className="text-center py-4 text-gray-400 text-xs">
                  No data
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr key={i} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-2 text-gray-700">{row[labelKey]}</td>
                  <td className="px-4 py-2 text-right font-semibold text-gray-900">{row.count}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ── Diversity Table ───────────────────────────────────────────────────────────
function DiversityTable({ title, rows }: { title: string; rows: { label: string; count: number }[] }) {
  const total = rows.reduce((s, r) => s + r.count, 0);
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0 pb-2">
        {rows.length === 0 ? (
          <p className="text-xs text-gray-400 px-4 py-3">No data</p>
        ) : (
          <div className="space-y-2 px-4 pt-1">
            {rows.map((row) => {
              const pct = total > 0 ? Math.round((row.count / total) * 100) : 0;
              return (
                <div key={row.label}>
                  <div className="flex justify-between text-xs text-gray-600 mb-0.5">
                    <span>{row.label}</span>
                    <span className="font-medium">
                      {row.count} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div
                      className="bg-blue-500 h-1.5 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Expiring Table ────────────────────────────────────────────────────────────
function ExpiringTable({ rows }: { rows: any[] }) {
  if (rows.length === 0) {
    return (
      <div className="text-center py-6 text-gray-400 text-sm">No appointments expiring in this window</div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b bg-gray-50">
          <tr>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Reference</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Appointee</th>
            <th className="hidden md:table-cell text-left px-4 py-3 font-medium text-gray-600">Entity</th>
            <th className="hidden md:table-cell text-left px-4 py-3 font-medium text-gray-600">Position</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">End Date</th>
            <th className="text-right px-4 py-3 font-medium text-gray-600">Days Left</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((a) => {
            const days = daysRemaining(a.endDate);
            return (
              <tr key={a.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link href={`/legal-appointments/${a.id}`} className="text-blue-600 hover:underline font-semibold">
                    {a.referenceNo}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-900">{a.fullName}</td>
                <td className="hidden md:table-cell px-4 py-3 text-gray-600">{a.entityName}</td>
                <td className="hidden md:table-cell px-4 py-3 text-gray-600">{a.position?.name || "—"}</td>
                <td className="px-4 py-3 text-red-600 font-medium">{formatDate(a.endDate)}</td>
                <td className="px-4 py-3 text-right font-semibold text-amber-700">{days}d</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Compliance Chip ───────────────────────────────────────────────────────────
function Chip({ label, color }: { label: string; color: string }) {
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mr-1 mb-1", color)}>
      {label}
    </span>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function LegalAppointmentsReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expiringTab, setExpiringTab] = useState<30 | 90 | 180>(30);
  const [showOnlyIssues, setShowOnlyIssues] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/legal-appointments/reports");
      if (!res.ok) throw new Error("Failed to load");
      setData(await res.json());
    } catch {
      setError("Failed to load report data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const expiringRows =
    expiringTab === 30
      ? data?.expiringNext30
      : expiringTab === 90
      ? data?.expiringNext90
      : data?.expiringNext180;

  const complianceRows = showOnlyIssues
    ? data?.complianceIssues ?? []
    : data?.complianceIssues ?? [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/legal-appointments">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-blue-600" />
              Legal Appointments — Reports
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">Compliance, diversity, and expiry analytics</p>
          </div>
        </div>
        <Button variant="outline" onClick={fetchData} disabled={loading}>
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {loading && !data ? (
        <div className="flex items-center justify-center h-48">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : data ? (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Active Appointments" value={data.totals.active} color="green" />
            <KpiCard label="Draft / Pending" value={data.totals.draft} color="gray" />
            <KpiCard label="Expiring in 90 Days" value={data.totals.expiring90} color="amber" />
            <KpiCard label="Terminated" value={data.totals.terminated} color="red" />
          </div>

          {/* Active Breakdown */}
          <div>
            <h2 className="text-base font-semibold text-gray-800 mb-3">Active Appointments Breakdown</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <BreakdownTable title="By Entity" rows={data.activeByEntity} labelKey="entityName" />
              <BreakdownTable title="By Department" rows={data.activeByDepartment} labelKey="departmentName" />
              <BreakdownTable title="By Position" rows={data.activeByPosition} labelKey="positionName" />
            </div>
          </div>

          {/* Expiring */}
          <div>
            <h2 className="text-base font-semibold text-gray-800 mb-3">Expiring Appointments</h2>
            <Card>
              <CardHeader className="pb-0">
                <div className="flex gap-2">
                  {([30, 90, 180] as const).map((days) => (
                    <button
                      key={days}
                      onClick={() => setExpiringTab(days)}
                      className={cn(
                        "px-4 py-1.5 rounded-full text-sm font-medium border transition-colors",
                        expiringTab === days
                          ? "bg-amber-500 text-white border-amber-500"
                          : "border-gray-200 text-gray-600 hover:bg-gray-50"
                      )}
                    >
                      {days} Days ({days === 30 ? data.expiringNext30.length : days === 90 ? data.expiringNext90.length : data.expiringNext180.length})
                    </button>
                  ))}
                </div>
              </CardHeader>
              <CardContent className="p-0 mt-3">
                <ExpiringTable rows={expiringRows ?? []} />
              </CardContent>
            </Card>
          </div>

          {/* Compliance Report */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-gray-800">Compliance Report</h2>
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showOnlyIssues}
                  onChange={(e) => setShowOnlyIssues(e.target.checked)}
                  className="rounded"
                />
                Show only issues
              </label>
            </div>
            {complianceRows.length === 0 ? (
              <Card className="border-green-200 bg-green-50">
                <CardContent className="p-5 flex items-center gap-2 text-green-700">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">No compliance issues found — all active/draft appointments are compliant.</span>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-gray-50">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Reference</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Appointee</th>
                        <th className="hidden md:table-cell text-left px-4 py-3 font-medium text-gray-600">Entity</th>
                        <th className="hidden md:table-cell text-left px-4 py-3 font-medium text-gray-600">Position</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Missing Items</th>
                      </tr>
                    </thead>
                    <tbody>
                      {complianceRows.map((issue) => (
                        <tr key={issue.id} className="border-b last:border-0 hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <Link href={`/legal-appointments/${issue.id}`} className="text-blue-600 hover:underline font-semibold">
                              {issue.referenceNo}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-gray-900">{issue.fullName}</td>
                          <td className="hidden md:table-cell px-4 py-3 text-gray-600">{issue.entityName}</td>
                          <td className="hidden md:table-cell px-4 py-3 text-gray-600">{issue.positionName}</td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap">
                              {issue.missingAcceptance && <Chip label="Acceptance" color="bg-orange-100 text-orange-700" />}
                              {issue.missingVetting && <Chip label="Vetting" color="bg-red-100 text-red-700" />}
                              {issue.missingDeclaration && <Chip label="Declaration" color="bg-purple-100 text-purple-700" />}
                              {issue.missingResolution && <Chip label="Resolution" color="bg-amber-100 text-amber-700" />}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </div>

          {/* Diversity Report */}
          <div>
            <h2 className="text-base font-semibold text-gray-800 mb-3">Diversity Report (Active Appointments)</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <DiversityTable title="Gender" rows={data.diversitySummary.gender} />
              <DiversityTable title="Race (EE Reporting)" rows={data.diversitySummary.race} />
              <DiversityTable title="Nationality" rows={data.diversitySummary.nationality} />
              <DiversityTable title="Disability Status" rows={data.diversitySummary.disability} />
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
