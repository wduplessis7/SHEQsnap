"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  ArrowLeft,
  RefreshCw,
  Save,
  Trash2,
  GraduationCap,
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

const INDUCTION_TYPES = [
  "Site Safety Induction",
  "Fire & Emergency Procedures",
  "PPE Requirements",
  "Chemical Handling & HazCom",
  "Equipment / Plant Operation",
  "Environmental Awareness",
  "Legal Appointment",
  "Other",
];

interface Induction {
  id: string;
  referenceNo: string;
  inducteeName: string;
  inducteeType: string;
  inductionType: string;
  conductedByName: string;
  conductedDate: string;
  expiryDate: string | null;
  validityMonths: number | null;
  status: string;
  departmentId: string | null;
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
          Current
        </span>
      );
  }
}

export default function InductionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const id = params.id as string;
  const userRole = (session?.user as any)?.role;
  const isAdmin = userRole === "ADMIN";

  const [induction, setInduction] = useState<Induction | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [editing, setEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [validityOption, setValidityOption] = useState("none");

  const [form, setForm] = useState({
    inducteeName: "",
    inducteeType: "employee",
    inductionType: "",
    conductedByName: "",
    conductedDate: "",
    expiryDate: "",
    notes: "",
  });

  useEffect(() => {
    fetch(`/api/inductions/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setInduction(data);
          setForm({
            inducteeName: data.inducteeName,
            inducteeType: data.inducteeType,
            inductionType: data.inductionType,
            conductedByName: data.conductedByName,
            conductedDate: data.conductedDate.slice(0, 10),
            expiryDate: data.expiryDate ? data.expiryDate.slice(0, 10) : "",
            notes: data.notes || "",
          });
          if (data.expiryDate) {
            setValidityOption(data.validityMonths ? String(data.validityMonths) : "custom");
          } else {
            setValidityOption("none");
          }
        }
      })
      .catch(() => setError("Failed to load induction"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async () => {
    if (!form.inducteeName.trim() || !form.inductionType || !form.conductedByName.trim() || !form.conductedDate) {
      setSaveError("Inductee name, induction type, conducted by, and date are required.");
      return;
    }
    setSaveError("");
    setSaving(true);
    try {
      const payload: any = {
        inducteeName: form.inducteeName.trim(),
        inducteeType: form.inducteeType,
        inductionType: form.inductionType,
        conductedByName: form.conductedByName.trim(),
        conductedDate: form.conductedDate,
        notes: form.notes.trim() || null,
      };
      if (validityOption === "custom" && form.expiryDate) {
        payload.expiryDate = form.expiryDate;
      } else if (validityOption !== "none" && validityOption !== "custom") {
        payload.validityMonths = Number(validityOption);
      }

      const res = await fetch(`/api/inductions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        setSaveError(err.error || "Failed to save.");
        return;
      }
      const updated = await res.json();
      setInduction(updated);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/inductions/${id}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/inductions");
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
        <Link href="/inductions">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Inductions
          </Button>
        </Link>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href="/inductions">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">{induction?.inducteeName}</h1>
              {induction && statusBadge(induction.status)}
            </div>
            <p className="text-gray-500 text-sm mt-0.5">{induction?.referenceNo} · {induction?.inductionType}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <Button variant="outline" onClick={() => { setEditing(false); setSaveError(""); }}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Save Changes
              </Button>
            </>
          ) : (
            <>
              <Button onClick={() => setEditing(true)}>
                Edit
              </Button>
              {isAdmin && (
                <Button
                  variant="outline"
                  className="text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {saveError && (
        <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">{saveError}</p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            Induction Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {editing ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="inducteeName">Inductee Name *</Label>
                  <Input
                    id="inducteeName"
                    value={form.inducteeName}
                    onChange={(e) => setForm((f) => ({ ...f, inducteeName: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="inducteeType">Inductee Type *</Label>
                  <Select
                    value={form.inducteeType}
                    onValueChange={(v) => setForm((f) => ({ ...f, inducteeType: v }))}
                  >
                    <SelectTrigger id="inducteeType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="employee">Employee</SelectItem>
                      <SelectItem value="contractor">Contractor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="inductionType">Induction Type *</Label>
                <Select
                  value={form.inductionType}
                  onValueChange={(v) => setForm((f) => ({ ...f, inductionType: v }))}
                >
                  <SelectTrigger id="inductionType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INDUCTION_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="conductedByName">Conducted By *</Label>
                  <Input
                    id="conductedByName"
                    value={form.conductedByName}
                    onChange={(e) => setForm((f) => ({ ...f, conductedByName: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="conductedDate">Conducted Date *</Label>
                  <Input
                    id="conductedDate"
                    type="date"
                    value={form.conductedDate}
                    onChange={(e) => setForm((f) => ({ ...f, conductedDate: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Validity Period</Label>
                  <Select value={validityOption} onValueChange={setValidityOption}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No expiry</SelectItem>
                      <SelectItem value="3">3 months</SelectItem>
                      <SelectItem value="6">6 months</SelectItem>
                      <SelectItem value="12">12 months</SelectItem>
                      <SelectItem value="24">24 months</SelectItem>
                      <SelectItem value="36">36 months</SelectItem>
                      <SelectItem value="custom">Custom date</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {validityOption === "custom" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="expiryDate">Expiry Date</Label>
                    <Input
                      id="expiryDate"
                      type="date"
                      value={form.expiryDate}
                      onChange={(e) => setForm((f) => ({ ...f, expiryDate: e.target.value }))}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={4}
                />
              </div>
            </>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8 text-sm">
              <div>
                <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-1">Inductee Name</p>
                <p className="text-gray-800 font-medium">{induction?.inducteeName}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-1">Inductee Type</p>
                <p className="text-gray-800 capitalize">{induction?.inducteeType}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-1">Induction Type</p>
                <p className="text-gray-800">{induction?.inductionType}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-1">Conducted By</p>
                <p className="text-gray-800">{induction?.conductedByName}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-1">Conducted Date</p>
                <p className="text-gray-800">{induction?.conductedDate ? formatDate(induction.conductedDate) : "—"}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-1">Expiry Date</p>
                <p className="text-gray-800">{induction?.expiryDate ? formatDate(induction.expiryDate) : "No expiry"}</p>
              </div>
              {induction?.notes && (
                <div className="sm:col-span-2">
                  <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-1">Notes</p>
                  <p className="text-gray-800 whitespace-pre-wrap">{induction.notes}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {induction && (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-1">Reference</p>
                <p className="text-gray-700 font-mono">{induction.referenceNo}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-1">Status</p>
                {statusBadge(induction.status)}
              </div>
              <div>
                <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-1">Created</p>
                <p className="text-gray-700">{formatDate(induction.createdAt)}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-1">Updated</p>
                <p className="text-gray-700">{formatDate(induction.updatedAt)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Delete Induction</h2>
            <p className="text-sm text-gray-500 mb-5">
              Are you sure you want to delete this induction record? This action cannot be undone.
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
