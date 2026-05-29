"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { RefreshCw, CreditCard, Users, ClipboardList, DollarSign, Calendar, Edit, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

const SERVER_TIER_COLORS: Record<string, string> = {
  STARTUP: "bg-green-100 text-green-700",
  GROWTH: "bg-blue-100 text-blue-700",
  BUSINESS: "bg-purple-100 text-purple-700",
  CUSTOM: "bg-orange-100 text-orange-700",
};

const SERVER_TIER_FEES: Record<string, number> = {
  STARTUP: 850,
  GROWTH: 1850,
  BUSINESS: 3500,
  CUSTOM: 0,
};

const SERVER_TIER_LABELS: Record<string, string> = {
  STARTUP: "Startup (up to 25 users)",
  GROWTH: "Growth (up to 100 users)",
  BUSINESS: "Business (up to 500 users)",
  CUSTOM: "Custom (quoted)",
};

function formatCurrency(amount: number) {
  return `R ${amount.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

type LicenseData = {
  id: string;
  clientName: string;
  serverTier: string;
  setupFee: number;
  annualLicenseFee: number;
  monthlyHostingFee: number;
  perUserRate: number;
  licenseStart: string;
  licenseRenewal: string;
  backupEnabled: boolean;
  backupRetentionMonths: number;
  maxLicensedUsers: number | null;
  active: boolean;
  notes: string | null;
};

type Stats = {
  licensedUserCount: number;
  reportingOnlyCount: number;
  monthlyUserCost: number;
  totalMonthlyCost: number;
  daysUntilRenewal: number | null;
  renewalAlert: boolean;
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

const EMPTY_FORM = {
  clientName: "",
  serverTier: "STARTUP",
  setupFee: 0,
  annualLicenseFee: 0,
  monthlyHostingFee: 850,
  perUserRate: 385,
  licenseStart: new Date().toISOString().split("T")[0],
  licenseRenewal: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  backupEnabled: true,
  backupRetentionMonths: 12,
  maxLicensedUsers: "" as string | number,
  active: true,
  notes: "",
};

export default function PlatformLicensePage() {
  const [license, setLicense] = useState<LicenseData | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [licRes, userRes] = await Promise.all([
        fetch("/api/admin/platform-license"),
        fetch("/api/admin/platform-license/users"),
      ]);
      const licData = await licRes.json();
      setLicense(licData.license ?? null);
      setStats(licData.stats ?? null);
      setUsers(await userRes.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  function openEdit() {
    if (license) {
      setForm({
        clientName: license.clientName,
        serverTier: license.serverTier,
        setupFee: license.setupFee,
        annualLicenseFee: license.annualLicenseFee,
        monthlyHostingFee: license.monthlyHostingFee,
        perUserRate: license.perUserRate,
        licenseStart: license.licenseStart.split("T")[0],
        licenseRenewal: license.licenseRenewal.split("T")[0],
        backupEnabled: license.backupEnabled,
        backupRetentionMonths: license.backupRetentionMonths,
        maxLicensedUsers: license.maxLicensedUsers ?? "",
        active: license.active,
        notes: license.notes ?? "",
      });
    } else {
      setForm({ ...EMPTY_FORM });
    }
    setError("");
    setEditOpen(true);
  }

  function setField(key: string, value: any) {
    setForm((prev) => {
      const updated = { ...prev, [key]: value };
      // Auto-set hosting fee when tier changes
      if (key === "serverTier" && SERVER_TIER_FEES[value] !== undefined) {
        updated.monthlyHostingFee = SERVER_TIER_FEES[value];
      }
      return updated;
    });
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...form,
        maxLicensedUsers: form.maxLicensedUsers === "" ? null : Number(form.maxLicensedUsers),
        setupFee: Number(form.setupFee),
        annualLicenseFee: Number(form.annualLicenseFee),
        monthlyHostingFee: Number(form.monthlyHostingFee),
        perUserRate: Number(form.perUserRate),
        backupRetentionMonths: Number(form.backupRetentionMonths),
        ...(license ? { id: license.id } : {}),
      };
      const method = license ? "PUT" : "POST";
      const res = await fetch("/api/admin/platform-license", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        await fetchData();
        setEditOpen(false);
      } else {
        const err = await res.json();
        setError(err.error || "Failed to save");
      }
    } finally {
      setSaving(false);
    }
  }

  async function toggleUserFlag(userId: string, flag: "isLicensed" | "reportingOnly", value: boolean) {
    // Optimistically update UI
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== userId) return u;
        if (flag === "reportingOnly" && value) {
          return { ...u, reportingOnly: true, isLicensed: false };
        }
        return { ...u, [flag]: value };
      })
    );
    await fetch("/api/admin/platform-license/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, [flag]: value }),
    });
    // Refresh stats
    const res = await fetch("/api/admin/platform-license");
    const data = await res.json();
    setStats(data.stats);
    setLicense(data.license ?? null);
  }

  const approachingLimit =
    license?.maxLicensedUsers != null &&
    stats != null &&
    license.maxLicensedUsers > 0 &&
    stats.licensedUserCount >= license.maxLicensedUsers * 0.9;

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
          <p className="text-gray-500 mt-1">SaaS billing and user license management</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={fetchData}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={openEdit}>
            <Edit className="h-4 w-4 mr-1" />
            {license ? "Edit License" : "Setup License"}
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Server Tier */}
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="h-4 w-4 text-gray-400" />
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Server Tier</span>
              </div>
              {license ? (
                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-sm font-semibold ${SERVER_TIER_COLORS[license.serverTier] ?? "bg-gray-100 text-gray-700"}`}>
                  {license.serverTier}
                </span>
              ) : (
                <span className="text-gray-400 text-sm">Not set</span>
              )}
              {license && (
                <p className="text-xs text-gray-400 mt-1">{license.clientName}</p>
              )}
            </CardContent>
          </Card>

          {/* Licensed Users */}
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-gray-400" />
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Licensed Users</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {stats.licensedUserCount}
                <span className="text-sm font-normal text-gray-400 ml-1">
                  / {license?.maxLicensedUsers ?? "Unlimited"}
                </span>
              </p>
              {approachingLimit && (
                <p className="text-xs text-orange-600 mt-1 font-medium">Approaching limit</p>
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
              <p className="text-2xl font-bold text-gray-900">{stats.reportingOnlyCount}</p>
              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 mt-1">
                Free
              </span>
            </CardContent>
          </Card>

          {/* Monthly Total */}
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-gray-400" />
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Monthly Total</span>
              </div>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(stats.totalMonthlyCost)}</p>
            </CardContent>
          </Card>

          {/* Renewal Date */}
          <Card className={stats.renewalAlert ? "border-red-300" : ""}>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className={`h-4 w-4 ${stats.renewalAlert ? "text-red-400" : "text-gray-400"}`} />
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Renewal</span>
              </div>
              <p className={`text-sm font-semibold ${stats.renewalAlert ? "text-red-600" : "text-gray-900"}`}>
                {formatDate(license?.licenseRenewal)}
              </p>
              {stats.daysUntilRenewal != null && (
                <p className={`text-xs mt-1 ${stats.renewalAlert ? "text-red-500 font-medium" : "text-gray-400"}`}>
                  {stats.daysUntilRenewal} days
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Billing Breakdown */}
      {license && stats && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Billing Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {approachingLimit && (
              <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0" />
                <p className="text-sm text-orange-700 font-medium">
                  Approaching user limit — {stats.licensedUserCount} of {license.maxLicensedUsers} licensed users used
                </p>
              </div>
            )}
            <div className="space-y-2">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-gray-600">
                  Hosting ({license.serverTier} tier)
                </span>
                <span className="text-sm font-medium">{formatCurrency(license.monthlyHostingFee)}/month</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-gray-600">
                  Users ({stats.licensedUserCount} × {formatCurrency(license.perUserRate)})
                </span>
                <span className="text-sm font-medium">{formatCurrency(stats.monthlyUserCost)}/month</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b bg-gray-50 px-2 rounded">
                <span className="text-sm font-bold text-gray-900">Total Monthly</span>
                <span className="text-sm font-bold text-gray-900">{formatCurrency(stats.totalMonthlyCost)}/month</span>
              </div>
              {license.annualLicenseFee > 0 && (
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-gray-600">Annual License Fee</span>
                  <span className="text-sm font-medium">{formatCurrency(license.annualLicenseFee)}/year</span>
                </div>
              )}
              {license.backupEnabled && (
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-gray-500">
                    Backup — {license.backupRetentionMonths} restore points, 1 year retention
                  </span>
                  <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded-full">Included</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {!license && !loading && (
        <Card>
          <CardContent className="py-10 text-center">
            <CreditCard className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-4">No platform license configured yet.</p>
            <Button onClick={openEdit}>Setup Platform License</Button>
          </CardContent>
        </Card>
      )}

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
                    {!user.active && (
                      <span className="ml-2 text-xs text-gray-400">(inactive)</span>
                    )}
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
                <td colSpan={3} className="px-4 py-2 text-xs font-medium text-gray-500">
                  Totals
                </td>
                <td className="px-4 py-2 text-center text-xs font-semibold text-gray-700">
                  {stats?.licensedUserCount ?? 0} licensed
                </td>
                <td className="px-4 py-2 text-center text-xs font-semibold text-gray-700">
                  {stats?.reportingOnlyCount ?? 0} reporting
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      {/* Edit / Create License Form */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b">
              <h2 className="text-lg font-semibold">{license ? "Edit Platform License" : "Setup Platform License"}</h2>
              <button onClick={() => setEditOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <Label>Client Name *</Label>
                <Input value={form.clientName} onChange={(e) => setField("clientName", e.target.value)} className="mt-1" placeholder="Company name" />
              </div>
              <div>
                <Label>Server Tier *</Label>
                <Select value={form.serverTier} onValueChange={(v) => setField("serverTier", v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(SERVER_TIER_LABELS).map(([k, label]) => (
                      <SelectItem key={k} value={k}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Monthly Hosting Fee (R)</Label>
                  <Input type="number" value={form.monthlyHostingFee} onChange={(e) => setField("monthlyHostingFee", e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label>Per User Rate (R)</Label>
                  <Input type="number" value={form.perUserRate} onChange={(e) => setField("perUserRate", e.target.value)} className="mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Setup Fee (R)</Label>
                  <Input type="number" value={form.setupFee} onChange={(e) => setField("setupFee", e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label>Annual License Fee (R)</Label>
                  <Input type="number" value={form.annualLicenseFee} onChange={(e) => setField("annualLicenseFee", e.target.value)} className="mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>License Start</Label>
                  <Input type="date" value={form.licenseStart} onChange={(e) => setField("licenseStart", e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label>License Renewal *</Label>
                  <Input type="date" value={form.licenseRenewal} onChange={(e) => setField("licenseRenewal", e.target.value)} className="mt-1" />
                </div>
              </div>
              <div>
                <Label>Max Licensed Users (blank = unlimited)</Label>
                <Input type="number" value={form.maxLicensedUsers} onChange={(e) => setField("maxLicensedUsers", e.target.value)} className="mt-1" placeholder="Unlimited" />
              </div>
              <div>
                <Label>Notes</Label>
                <Input value={form.notes} onChange={(e) => setField("notes", e.target.value)} className="mt-1" placeholder="Optional notes" />
              </div>
              {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>}
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t">
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : license ? "Save Changes" : "Create License"}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
