"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  RefreshCw,
  Pencil,
  Trash2,
  FileCheck,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import * as Dialog from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils";

const LICENSE_TYPES = [
  "Driver's License",
  "First Aid",
  "Forklift Operator",
  "Scaffolding",
  "Working at Heights",
  "Hazmat Handling",
  "Fire Safety",
  "Electrical Certificate",
  "Crane Operator",
  "Rigging Certificate",
  "Boilermaker Certificate",
  "Welding Certificate",
  "Other",
];

interface License {
  id: string;
  holderName: string;
  holderType: string;
  licenseType: string;
  licenseNumber: string | null;
  issuedDate: string | null;
  expiryDate: string;
  status: string;
  reminderSent: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface FormData {
  holderName: string;
  holderType: string;
  licenseType: string;
  licenseNumber: string;
  issuedDate: string;
  expiryDate: string;
  notes: string;
}

const emptyForm: FormData = {
  holderName: "",
  holderType: "employee",
  licenseType: "",
  licenseNumber: "",
  issuedDate: "",
  expiryDate: "",
  notes: "",
};

function statusBadge(status: string) {
  switch (status) {
    case "expired":
      return (
        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-red-100 text-red-700">
          Expired
        </span>
      );
    case "expiring_soon":
      return (
        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-amber-100 text-amber-700">
          Expiring Soon
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-green-100 text-green-700">
          Active
        </span>
      );
  }
}

export default function LicensesClient() {
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "employee" | "contractor">("all");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLicense, setEditingLicense] = useState<License | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [formError, setFormError] = useState("");

  const fetchLicenses = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeTab !== "all") params.set("holderType", activeTab);
      if (search) params.set("search", search);
      const res = await fetch(`/api/licenses?${params}`);
      if (res.ok) {
        const data = await res.json();
        setLicenses(data);
      }
    } finally {
      setLoading(false);
    }
  }, [activeTab, search]);

  useEffect(() => {
    fetchLicenses();
  }, [fetchLicenses]);

  const openAddDialog = () => {
    setEditingLicense(null);
    setFormData(emptyForm);
    setFormError("");
    setDialogOpen(true);
  };

  const openEditDialog = (license: License) => {
    setEditingLicense(license);
    setFormData({
      holderName: license.holderName,
      holderType: license.holderType,
      licenseType: license.licenseType,
      licenseNumber: license.licenseNumber || "",
      issuedDate: license.issuedDate ? license.issuedDate.slice(0, 10) : "",
      expiryDate: license.expiryDate.slice(0, 10),
      notes: license.notes || "",
    });
    setFormError("");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.holderName.trim()) {
      setFormError("Holder name is required.");
      return;
    }
    if (!formData.licenseType.trim()) {
      setFormError("License type is required.");
      return;
    }
    if (!formData.expiryDate) {
      setFormError("Expiry date is required.");
      return;
    }
    setFormError("");
    setSaving(true);
    try {
      const payload = {
        holderName: formData.holderName.trim(),
        holderType: formData.holderType,
        licenseType: formData.licenseType.trim(),
        licenseNumber: formData.licenseNumber.trim() || null,
        issuedDate: formData.issuedDate || null,
        expiryDate: formData.expiryDate,
        notes: formData.notes.trim() || null,
      };

      const url = editingLicense ? `/api/licenses/${editingLicense.id}` : "/api/licenses";
      const method = editingLicense ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        setFormError(err.error || "Failed to save license.");
        return;
      }

      setDialogOpen(false);
      fetchLicenses();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/licenses/${id}`, { method: "DELETE" });
    if (res.ok) {
      setDeleteConfirm(null);
      fetchLicenses();
    }
  };

  // Summary counts from raw data (all, regardless of tab filter)
  const [allLicenses, setAllLicenses] = useState<License[]>([]);
  useEffect(() => {
    fetch("/api/licenses")
      .then((r) => r.json())
      .then((d) => setAllLicenses(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [licenses]);

  const totalCount = allLicenses.length;
  const expiredCount = allLicenses.filter((l) => l.status === "expired").length;
  const expiringSoonCount = allLicenses.filter((l) => l.status === "expiring_soon").length;
  const activeCount = allLicenses.filter((l) => l.status === "active").length;

  const tabs: { key: "all" | "employee" | "contractor"; label: string }[] = [
    { key: "all", label: "All" },
    { key: "employee", label: "Employees" },
    { key: "contractor", label: "Contractors" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">License Manager</h1>
          <p className="text-gray-500 mt-1">Track employee and contractor licenses</p>
        </div>
        <Button onClick={openAddDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Add License
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium text-gray-500">Total Licenses</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{totalCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium text-gray-500">Active</p>
            <p className="text-3xl font-bold text-green-600 mt-1">{activeCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium text-gray-500">Expiring (30 days)</p>
            <p className="text-3xl font-bold text-amber-500 mt-1">{expiringSoonCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium text-gray-500">Expired</p>
            <p className="text-3xl font-bold text-red-600 mt-1">{expiredCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs + Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "px-4 py-2 text-sm font-medium transition-colors",
                activeTab === tab.key
                  ? "bg-gray-900 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search name, type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Button variant="outline" size="icon" onClick={fetchLicenses}>
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </Button>
      </div>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Holder</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">License Type</th>
                <th className="hidden sm:table-cell text-left px-4 py-3 font-medium text-gray-600">License #</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Expiry Date</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-gray-400">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : licenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-gray-400">
                    No licenses found
                  </td>
                </tr>
              ) : (
                licenses.map((license) => (
                  <tr
                    key={license.id}
                    className={cn(
                      "border-b last:border-0 hover:bg-gray-50 transition-colors",
                      license.status === "expired" && "bg-red-50 hover:bg-red-100",
                      license.status === "expiring_soon" && "bg-amber-50 hover:bg-amber-100"
                    )}
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">
                      <Link
                        href={`/licenses/${license.id}`}
                        className="hover:text-blue-600 hover:underline"
                      >
                        {license.holderName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-600 capitalize">{license.holderType}</td>
                    <td className="px-4 py-3 text-gray-600">{license.licenseType}</td>
                    <td className="hidden sm:table-cell px-4 py-3 text-gray-500">
                      {license.licenseNumber || "—"}
                    </td>
                    <td
                      className={cn(
                        "px-4 py-3 font-medium",
                        license.status === "expired"
                          ? "text-red-600"
                          : license.status === "expiring_soon"
                          ? "text-amber-600"
                          : "text-gray-600"
                      )}
                    >
                      {formatDate(license.expiryDate)}
                    </td>
                    <td className="px-4 py-3">{statusBadge(license.status)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEditDialog(license)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => setDeleteConfirm(license.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add / Edit Dialog */}
      <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-xl shadow-2xl z-50 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <Dialog.Title className="text-lg font-semibold text-gray-900">
                {editingLicense ? "Edit License" : "Add License"}
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </Dialog.Close>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="holderName">Holder Name *</Label>
                  <Input
                    id="holderName"
                    value={formData.holderName}
                    onChange={(e) => setFormData((f) => ({ ...f, holderName: e.target.value }))}
                    placeholder="Full name"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="holderType">Holder Type *</Label>
                  <Select
                    value={formData.holderType}
                    onValueChange={(v) => setFormData((f) => ({ ...f, holderType: v }))}
                  >
                    <SelectTrigger id="holderType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="employee">Employee</SelectItem>
                      <SelectItem value="contractor">Contractor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="licenseType">License Type *</Label>
                  <Select
                    value={formData.licenseType}
                    onValueChange={(v) => setFormData((f) => ({ ...f, licenseType: v }))}
                  >
                    <SelectTrigger id="licenseType">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {LICENSE_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="licenseNumber">License Number</Label>
                  <Input
                    id="licenseNumber"
                    value={formData.licenseNumber}
                    onChange={(e) => setFormData((f) => ({ ...f, licenseNumber: e.target.value }))}
                    placeholder="Optional"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="issuedDate">Issued Date</Label>
                  <Input
                    id="issuedDate"
                    type="date"
                    value={formData.issuedDate}
                    onChange={(e) => setFormData((f) => ({ ...f, issuedDate: e.target.value }))}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="expiryDate">Expiry Date *</Label>
                  <Input
                    id="expiryDate"
                    type="date"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData((f) => ({ ...f, expiryDate: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Optional notes..."
                  rows={3}
                />
              </div>

              {formError && (
                <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">{formError}</p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  {editingLicense ? "Save Changes" : "Add License"}
                </Button>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Delete Confirmation Dialog */}
      <Dialog.Root
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white rounded-xl shadow-2xl z-50 p-6">
            <Dialog.Title className="text-lg font-semibold text-gray-900 mb-2">
              Delete License
            </Dialog.Title>
            <p className="text-sm text-gray-500 mb-5">
              Are you sure you want to delete this license? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
                Cancel
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              >
                Delete
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
