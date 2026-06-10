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
  GitPullRequest,
  CheckCircle2,
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

const CHANGE_TYPES = [
  "Process",
  "Equipment / Plant",
  "Document / Procedure",
  "Personnel",
  "Temporary Change",
  "Other",
];

const STATUS_STEPS = [
  { key: "draft", label: "Draft" },
  { key: "pending_approval", label: "Pending Approval" },
  { key: "approved", label: "Approved" },
  { key: "implemented", label: "Implemented" },
  { key: "closed", label: "Closed" },
];

interface ChangeRequest {
  id: string;
  referenceNo: string;
  title: string;
  changeType: string;
  description: string;
  reason: string;
  riskAssessment: string | null;
  affectedAreas: string | null;
  proposedDate: string | null;
  implementationDate: string | null;
  reviewDate: string | null;
  status: string;
  requestedByName: string;
  approvedById: string | null;
  approvedByName: string | null;
  approvedAt: string | null;
  assignedApproverName: string | null;
  rejectionReason: string | null;
  closureNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

function statusBadge(status: string) {
  switch (status) {
    case "draft":
      return <span className="inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold bg-gray-100 text-gray-700">Draft</span>;
    case "pending_approval":
      return <span className="inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold bg-yellow-100 text-yellow-700">Pending Approval</span>;
    case "approved":
      return <span className="inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold bg-green-100 text-green-700">Approved</span>;
    case "rejected":
      return <span className="inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold bg-red-100 text-red-700">Rejected</span>;
    case "implemented":
      return <span className="inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold bg-blue-100 text-blue-700">Implemented</span>;
    case "closed":
      return <span className="inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold bg-gray-100 text-gray-500">Closed</span>;
    default:
      return <span className="inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold bg-gray-100 text-gray-700">{status}</span>;
  }
}

export default function MocDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const id = params.id as string;
  const userRole = (session?.user as any)?.role;
  const isAdmin = userRole === "ADMIN";
  const isManager = ["MANAGER", "ADMIN"].includes(userRole);

  const [change, setChange] = useState<ChangeRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [editing, setEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [implDate, setImplDate] = useState("");
  const [showImplInput, setShowImplInput] = useState(false);
  const [closureNotes, setClosureNotes] = useState("");
  const [showClosureInput, setShowClosureInput] = useState(false);

  const [form, setForm] = useState({
    title: "",
    changeType: "",
    description: "",
    reason: "",
    riskAssessment: "",
    affectedAreas: "",
    proposedDate: "",
    implementationDate: "",
    reviewDate: "",
    requestedByName: "",
  });

  useEffect(() => {
    fetch(`/api/moc/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setChange(data);
          setForm({
            title: data.title,
            changeType: data.changeType,
            description: data.description,
            reason: data.reason,
            riskAssessment: data.riskAssessment || "",
            affectedAreas: data.affectedAreas || "",
            proposedDate: data.proposedDate ? data.proposedDate.slice(0, 10) : "",
            implementationDate: data.implementationDate ? data.implementationDate.slice(0, 10) : "",
            reviewDate: data.reviewDate ? data.reviewDate.slice(0, 10) : "",
            requestedByName: data.requestedByName,
          });
        }
      })
      .catch(() => setError("Failed to load change request"))
      .finally(() => setLoading(false));
  }, [id]);

  const patchStatus = async (newStatus: string, extra: Record<string, any> = {}) => {
    setSaving(true);
    setSaveError("");
    try {
      const res = await fetch(`/api/moc/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          status: newStatus,
          riskAssessment: form.riskAssessment || null,
          affectedAreas: form.affectedAreas || null,
          proposedDate: form.proposedDate || null,
          implementationDate: form.implementationDate || null,
          reviewDate: form.reviewDate || null,
          ...extra,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        setSaveError(err.error || "Failed to update.");
        return;
      }
      const updated = await res.json();
      setChange(updated);
      setForm((f) => ({
        ...f,
        implementationDate: updated.implementationDate ? updated.implementationDate.slice(0, 10) : "",
      }));
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.changeType || !form.description.trim() || !form.reason.trim()) {
      setSaveError("Title, change type, description, and reason are required.");
      return;
    }
    setSaveError("");
    setSaving(true);
    try {
      const res = await fetch(`/api/moc/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          status: change?.status,
          riskAssessment: form.riskAssessment || null,
          affectedAreas: form.affectedAreas || null,
          proposedDate: form.proposedDate || null,
          implementationDate: form.implementationDate || null,
          reviewDate: form.reviewDate || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        setSaveError(err.error || "Failed to save.");
        return;
      }
      const updated = await res.json();
      setChange(updated);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/moc/${id}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/moc");
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
        <Link href="/moc">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to MOC
          </Button>
        </Link>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  const currentStatusIndex = STATUS_STEPS.findIndex((s) => s.key === change?.status);
  const isRejected = change?.status === "rejected";
  const isClosed = change?.status === "closed";

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href="/moc">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900">{change?.title}</h1>
              {change && statusBadge(change.status)}
            </div>
            <p className="text-gray-500 text-sm mt-0.5">{change?.referenceNo} · {change?.changeType}</p>
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
              {!isClosed && !isRejected && (
                <Button variant="outline" onClick={() => setEditing(true)}>
                  Edit
                </Button>
              )}
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

      {/* Status Timeline */}
      {!isRejected && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-1">
              {STATUS_STEPS.map((step, i) => (
                <div key={step.key} className="flex items-center flex-1 min-w-0">
                  <div className="flex flex-col items-center flex-shrink-0">
                    <div className={cn(
                      "flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-colors",
                      i < currentStatusIndex ? "bg-green-600 text-white" :
                      i === currentStatusIndex ? "bg-blue-600 text-white" :
                      "bg-gray-200 text-gray-500"
                    )}>
                      {i < currentStatusIndex ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
                    </div>
                    <span className={cn(
                      "text-xs font-medium mt-1 hidden sm:block text-center leading-tight",
                      i === currentStatusIndex ? "text-blue-700" : i < currentStatusIndex ? "text-green-700" : "text-gray-400"
                    )}>
                      {step.label}
                    </span>
                  </div>
                  {i < STATUS_STEPS.length - 1 && (
                    <div className={cn("flex-1 h-0.5 mx-1", i < currentStatusIndex ? "bg-green-400" : "bg-gray-200")} />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {isRejected && change?.rejectionReason && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-700 mb-1">Rejected</p>
          <p className="text-sm text-red-600">{change.rejectionReason}</p>
        </div>
      )}

      {/* Status Action Buttons */}
      {!editing && (
        <div className="space-y-3">
          {change?.status === "draft" && (
            <Button onClick={() => patchStatus("pending_approval")} disabled={saving} className="w-full sm:w-auto">
              {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
              Submit for Approval
            </Button>
          )}

          {change?.status === "pending_approval" && isManager && (
            <div className="flex flex-wrap gap-2">
              <Button
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={() => patchStatus("approved", {
                  approvedByName: (session?.user as any)?.name || "Unknown",
                  approvedAt: new Date().toISOString(),
                })}
                disabled={saving}
              >
                {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
                Approve
              </Button>
              <Button
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => setShowRejectInput((v) => !v)}
              >
                Reject
              </Button>
              {showRejectInput && (
                <div className="w-full space-y-2">
                  <Textarea
                    placeholder="Rejection reason..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={2}
                  />
                  <Button
                    className="bg-red-600 hover:bg-red-700 text-white"
                    onClick={() => {
                      patchStatus("rejected", { rejectionReason });
                      setShowRejectInput(false);
                    }}
                    disabled={saving || !rejectionReason.trim()}
                  >
                    Confirm Rejection
                  </Button>
                </div>
              )}
            </div>
          )}

          {change?.status === "approved" && (
            <div className="space-y-2">
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => setShowImplInput((v) => !v)}
              >
                Mark as Implemented
              </Button>
              {showImplInput && (
                <div className="space-y-2">
                  <div className="space-y-1.5">
                    <Label>Implementation Date</Label>
                    <Input
                      type="date"
                      value={implDate}
                      onChange={(e) => setImplDate(e.target.value)}
                    />
                  </div>
                  <Button
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={() => {
                      patchStatus("implemented", { implementationDate: implDate || null });
                      setShowImplInput(false);
                    }}
                    disabled={saving}
                  >
                    {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
                    Confirm
                  </Button>
                </div>
              )}
            </div>
          )}

          {change?.status === "implemented" && (
            <div className="space-y-2">
              <Button
                variant="outline"
                onClick={() => setShowClosureInput((v) => !v)}
              >
                Close Change Request
              </Button>
              {showClosureInput && (
                <div className="space-y-2">
                  <div className="space-y-1.5">
                    <Label>Closure Notes</Label>
                    <Textarea
                      placeholder="Add closure notes..."
                      value={closureNotes}
                      onChange={(e) => setClosureNotes(e.target.value)}
                      rows={2}
                    />
                  </div>
                  <Button
                    onClick={() => {
                      patchStatus("closed", { closureNotes: closureNotes || null });
                      setShowClosureInput(false);
                    }}
                    disabled={saving}
                  >
                    {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
                    Confirm Close
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <GitPullRequest className="h-4 w-4" />
            Change Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {editing ? (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="changeType">Change Type *</Label>
                <Select
                  value={form.changeType}
                  onValueChange={(v) => setForm((f) => ({ ...f, changeType: v }))}
                >
                  <SelectTrigger id="changeType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CHANGE_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description">Description of Change *</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={4}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="reason">Reason / Justification *</Label>
                <Textarea
                  id="reason"
                  value={form.reason}
                  onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                  rows={3}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="riskAssessment">Risk Assessment</Label>
                <Textarea
                  id="riskAssessment"
                  value={form.riskAssessment}
                  onChange={(e) => setForm((f) => ({ ...f, riskAssessment: e.target.value }))}
                  rows={3}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="affectedAreas">Affected Areas / Departments</Label>
                <Input
                  id="affectedAreas"
                  value={form.affectedAreas}
                  onChange={(e) => setForm((f) => ({ ...f, affectedAreas: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="proposedDate">Proposed Date</Label>
                  <Input
                    id="proposedDate"
                    type="date"
                    value={form.proposedDate}
                    onChange={(e) => setForm((f) => ({ ...f, proposedDate: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="implementationDate">Implementation Date</Label>
                  <Input
                    id="implementationDate"
                    type="date"
                    value={form.implementationDate}
                    onChange={(e) => setForm((f) => ({ ...f, implementationDate: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="reviewDate">Review Date</Label>
                  <Input
                    id="reviewDate"
                    type="date"
                    value={form.reviewDate}
                    onChange={(e) => setForm((f) => ({ ...f, reviewDate: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="requestedByName">Requested By</Label>
                <Input
                  id="requestedByName"
                  value={form.requestedByName}
                  onChange={(e) => setForm((f) => ({ ...f, requestedByName: e.target.value }))}
                />
              </div>
            </>
          ) : (
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-1">Description of Change</p>
                <p className="text-gray-800 whitespace-pre-wrap">{change?.description}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-1">Reason / Justification</p>
                <p className="text-gray-800 whitespace-pre-wrap">{change?.reason}</p>
              </div>
              {change?.riskAssessment && (
                <div>
                  <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-1">Risk Assessment</p>
                  <p className="text-gray-800 whitespace-pre-wrap">{change.riskAssessment}</p>
                </div>
              )}
              {change?.affectedAreas && (
                <div>
                  <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-1">Affected Areas</p>
                  <p className="text-gray-800">{change.affectedAreas}</p>
                </div>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-1">Requested By</p>
                  <p className="text-gray-800">{change?.requestedByName}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-1">Proposed Date</p>
                  <p className="text-gray-800">{change?.proposedDate ? formatDate(change.proposedDate) : "—"}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-1">Implementation Date</p>
                  <p className="text-gray-800">{change?.implementationDate ? formatDate(change.implementationDate) : "—"}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-1">Review Date</p>
                  <p className="text-gray-800">{change?.reviewDate ? formatDate(change.reviewDate) : "—"}</p>
                </div>
              </div>
              {(change?.assignedApproverName || change?.approvedByName) && (
                <div className="grid grid-cols-2 gap-4">
                  {change?.assignedApproverName && !change?.approvedByName && (
                    <div>
                      <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-1">Assigned Approver</p>
                      <p className="text-gray-800">{change.assignedApproverName}</p>
                    </div>
                  )}
                  {change?.approvedByName && (
                    <div>
                      <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-1">Approved By</p>
                      <p className="text-gray-800">{change.approvedByName}</p>
                    </div>
                  )}
                  {change?.approvedAt && (
                    <div>
                      <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-1">Approved At</p>
                      <p className="text-gray-800">{formatDate(change.approvedAt)}</p>
                    </div>
                  )}
                </div>
              )}
              {change?.closureNotes && (
                <div>
                  <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-1">Closure Notes</p>
                  <p className="text-gray-800 whitespace-pre-wrap">{change.closureNotes}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {change && (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-1">Reference</p>
                <p className="text-gray-700 font-mono">{change.referenceNo}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-1">Status</p>
                {statusBadge(change.status)}
              </div>
              <div>
                <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-1">Created</p>
                <p className="text-gray-700">{formatDate(change.createdAt)}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-1">Updated</p>
                <p className="text-gray-700">{formatDate(change.updatedAt)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Delete Change Request</h2>
            <p className="text-sm text-gray-500 mb-5">
              Are you sure you want to delete this change request? This action cannot be undone.
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
