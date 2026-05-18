"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  RefreshCw,
  Save,
  Trash2,
  FileCheck,
  Calendar,
  User,
  Hash,
  FileText,
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
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

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

function statusBadge(status: string) {
  switch (status) {
    case "expired":
      return (
        <span className="inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold bg-red-100 text-red-700">
          Expired
        </span>
      );
    case "expiring_soon":
      return (
        <span className="inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold bg-amber-100 text-amber-700">
          Expiring Soon
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold bg-green-100 text-green-700">
          Active
        </span>
      );
  }
}

export default function LicenseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [license, setLicense] = useState<License | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [form, setForm] = useState({
    holderName: "",
    holderType: "employee",
    licenseType: "",
    licenseNumber: "",
    issuedDate: "",
    expiryDate: "",
    notes: "",
  });

  useEffect(() => {
    fetch(`/api/licenses/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setLicense(data);
          setForm({
            holderName: data.holderName,
            holderType: data.holderType,
            licenseType: data.licenseType,
            licenseNumber: data.licenseNumber || "",
            issuedDate: data.issuedDate ? data.issuedDate.slice(0, 10) : "",
            expiryDate: data.expiryDate.slice(0, 10),
            notes: data.notes || "",
          });
        }
      })
      .catch(() => setError("Failed to load license"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async () => {
    if (!form.holderName.trim() || !form.licenseType.trim() || !form.expiryDate) {
      setSaveError("Holder name, license type, and expiry date are required.");
      return;
    }
    setSaveError("");
    setSaving(true);
    try {
      const res = await fetch(`/api/licenses/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          holderName: form.holderName.trim(),
          holderType: form.holderType,
          licenseType: form.licenseType.trim(),
          licenseNumber: form.licenseNumber.trim() || null,
          issuedDate: form.issuedDate || null,
          expiryDate: form.expiryDate,
          notes: form.notes.trim() || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        setSaveError(err.error || "Failed to save.");
        return;
      }
      const updated = await res.json();
      setLicense(updated);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/licenses/${id}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/licenses");
      } else {
        const err = await res.json();
        setSaveError(err.error || "Delete failed.");
        setShowDeleteConfirm(false);
      }
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Link href="/licenses">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Licenses
          </Button>
        </Link>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href="/licenses">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">
                {license?.holderName}
              </h1>
              {license && statusBadge(license.status)}
            </div>
            <p className="text-gray-500 text-sm mt-0.5">{license?.licenseType}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save Changes
          </Button>
          <Button
            variant="outline"
            className="text-red-600 border-red-200 hover:bg-red-50"
            onClick={() => setShowDeleteConfirm(true)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {saveError && (
        <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">{saveError}</p>
      )}

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileCheck className="h-4 w-4" />
            License Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="holderName">Holder Name *</Label>
              <Input
                id="holderName"
                value={form.holderName}
                onChange={(e) => setForm((f) => ({ ...f, holderName: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="holderType">Holder Type *</Label>
              <Select
                value={form.holderType}
                onValueChange={(v) => setForm((f) => ({ ...f, holderType: v }))}
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
                value={form.licenseType}
                onValueChange={(v) => setForm((f) => ({ ...f, licenseType: v }))}
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
                value={form.licenseNumber}
                onChange={(e) => setForm((f) => ({ ...f, licenseNumber: e.target.value }))}
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
                value={form.issuedDate}
                onChange={(e) => setForm((f) => ({ ...f, issuedDate: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="expiryDate">Expiry Date *</Label>
              <Input
                id="expiryDate"
                type="date"
                value={form.expiryDate}
                onChange={(e) => setForm((f) => ({ ...f, expiryDate: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Optional notes..."
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* Metadata */}
      {license && (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-1">Created</p>
                <p className="text-gray-700">{formatDate(license.createdAt)}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-1">Updated</p>
                <p className="text-gray-700">{formatDate(license.updatedAt)}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-1">Reminder Sent</p>
                <p className="text-gray-700">{license.reminderSent ? "Yes" : "No"}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-1">Status</p>
                {statusBadge(license.status)}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Delete License</h2>
            <p className="text-sm text-gray-500 mb-5">
              Are you sure you want to delete this license? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
