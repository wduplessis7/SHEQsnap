"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { RefreshCw, Users, ClipboardList, Calendar, ExternalLink, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

const MODULE_LABELS: Record<string, string> = {
  "actions": "Actions",
  "near-misses": "Near Misses",
  "observations": "Observations",
  "incidents": "Incidents",
  "moc": "MOC",
  "checklists": "Checklists",
  "inductions": "Inductions",
  "licenses": "Licenses",
  "reports": "Reports",
  "documents": "Documents",
  "chemicals": "Chemicals",
  "legal_appointments": "Legal Appointments",
};

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return "No expiry";
  return new Date(dateStr).toLocaleDateString("en-ZA", {
    year: "numeric", month: "short", day: "numeric",
  });
}

type LicenseServer = {
  status: string;
  companyName: string | null;
  modules: string[];
  expiresAt: string | null;
  maxUsers: number | null;
};

type Stats = {
  licensedUserCount: number;
  reportingOnlyCount: number;
};

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  isLicensed: boolean;
  reportingOnly: boolean;
};

export default function PlatformLicensePage() {
  const [licenseServer, setLicenseServer] = useState<LicenseServer | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [licRes, userRes] = await Promise.all([
        fetch("/api/admin/platform-license"),
        fetch("/api/admin/platform-license/users"),
      ]);
      const licData = await licRes.json();
      setLicenseServer(licData.licenseServer ?? null);
      setStats(licData.stats ?? null);
      setUsers(await userRes.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  async function toggleUserFlag(userId: string, flag: "isLicensed" | "reportingOnly", value: boolean) {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== userId) return u;
        if (flag === "reportingOnly" && value) return { ...u, reportingOnly: true, isLicensed: false };
        return { ...u, [flag]: value };
      })
    );
    await fetch("/api/admin/platform-license/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, [flag]: value }),
    });
    const res = await fetch("/api/admin/platform-license");
    const data = await res.json();
    setStats(data.stats);
    setLicenseServer(data.licenseServer ?? null);
  }

  const isActive = licenseServer?.status === "active";
  const approachingLimit =
    licenseServer?.maxUsers != null &&
    stats != null &&
    licenseServer.maxUsers > 0 &&
    stats.licensedUserCount >= licenseServer.maxUsers * 0.9;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Platform License</h1>
          <p className="text-gray-500 mt-1">License status and user assignments</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={fetchData}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="outline" asChild>
            <a href="http://192.168.1.106:3030" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              License Server
            </a>
          </Button>
        </div>
      </div>

      {/* License status card */}
      <Card>
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              {isActive
                ? <CheckCircle className="h-5 w-5 text-green-500" />
                : <XCircle className="h-5 w-5 text-red-500" />}
              <div>
                <p className="font-semibold text-gray-900">
                  {licenseServer?.companyName ?? "SHEQSnap"}
                </p>
                <p className="text-sm text-gray-500 capitalize">{licenseServer?.status ?? "Unknown"}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {(licenseServer?.modules ?? []).map((mod) => (
                <Badge key={mod} variant="secondary">
                  {MODULE_LABELS[mod] ?? mod}
                </Badge>
              ))}
              {(licenseServer?.modules ?? []).includes("all") && (
                <Badge variant="secondary">All Modules</Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Licensed Users */}
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-gray-400" />
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Licensed Users</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {stats?.licensedUserCount ?? 0}
              <span className="text-sm font-normal text-gray-400 ml-1">
                / {licenseServer?.maxUsers ?? "Unlimited"}
              </span>
            </p>
            {approachingLimit && (
              <p className="text-xs text-orange-600 mt-1 font-medium flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Approaching limit
              </p>
            )}
          </CardContent>
        </Card>

        {/* Reporting Only */}
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 mb-2">
              <ClipboardList className="h-4 w-4 text-gray-400" />
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Reporting Only</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats?.reportingOnlyCount ?? 0}</p>
            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 mt-1">Free</span>
          </CardContent>
        </Card>

        {/* Expiry */}
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">License Expiry</span>
            </div>
            <p className="text-sm font-semibold text-gray-900">{formatDate(licenseServer?.expiresAt)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">User License Assignments</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Role</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Licensed</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Reporting Only</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {user.name}
                    {!user.active && <span className="ml-2 text-xs text-gray-400">(inactive)</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{user.email}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-gray-600">{user.role.replace(/_/g, " ")}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center">
                      <Switch
                        checked={user.isLicensed}
                        disabled={user.reportingOnly}
                        onCheckedChange={(val: boolean) => toggleUserFlag(user.id, "isLicensed", val)}
                        className={user.isLicensed ? "bg-green-600" : ""}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center items-center gap-2">
                      <Switch
                        checked={user.reportingOnly}
                        onCheckedChange={(val: boolean) => toggleUserFlag(user.id, "reportingOnly", val)}
                      />
                      {user.reportingOnly && (
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600">
                          Free
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50">
                <td colSpan={3} className="px-4 py-2 text-xs font-medium text-gray-500">Totals</td>
                <td className="px-4 py-2 text-center text-xs font-semibold text-gray-700">{stats?.licensedUserCount ?? 0} licensed</td>
                <td className="px-4 py-2 text-center text-xs font-semibold text-gray-700">{stats?.reportingOnlyCount ?? 0} reporting</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </div>
  );
}
