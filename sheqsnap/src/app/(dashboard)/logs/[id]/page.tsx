"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, CheckCircle, XCircle, RefreshCw, Paperclip, Clock } from "lucide-react";
import { formatDate, formatDateTime } from "@/lib/utils";
import { useSession } from "next-auth/react";

const LOG_TYPE_LABELS: Record<string, string> = {
  INSPECTION: "Inspection",
  TOOLBOX_TALK: "Toolbox Talk",
  MEETING_MINUTES: "Meeting Minutes",
  SAFETY_FILE: "Safety File",
  PERMIT: "Permit",
  INCIDENT_LOG: "Incident Log",
  OTHER: "Other",
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  PENDING_APPROVAL: "bg-orange-100 text-orange-700",
  ACTIVE: "bg-green-100 text-green-700",
  ARCHIVED: "bg-slate-100 text-slate-600",
};

export default function LogEntryDetailPage() {
  const { id } = useParams() as { id: string };
  const { data: session } = useSession();
  const user = (session?.user as any) || {};
  const canApprove = ["SAFETY_OFFICER", "MANAGER", "ADMIN"].includes(user.role);

  const [entry, setEntry] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchEntry = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/logs/${id}`);
      if (res.ok) setEntry(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchEntry();
  }, [id]);

  const pendingApproval = entry?.approvalRequests?.find(
    (ar: any) => ar.status === "PENDING"
  );

  async function handleApprove() {
    if (!pendingApproval) return;
    if (!confirm("Approve this log entry?")) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvalId: pendingApproval.id, action: "APPROVE" }),
      });
      if (res.ok) await fetchEntry();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReject() {
    if (!pendingApproval) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approvalId: pendingApproval.id,
          action: "REJECT",
          rejectionReason,
        }),
      });
      if (res.ok) {
        setRejectDialogOpen(false);
        await fetchEntry();
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!entry) return <div className="text-gray-500">Log entry not found.</div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/logs">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{entry.title}</h1>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[entry.status] || "bg-gray-100 text-gray-700"}`}
              >
                {entry.status.replace(/_/g, " ")}
              </span>
            </div>
            <p className="text-gray-500 mt-1 font-mono text-sm">{entry.referenceNo}</p>
          </div>
        </div>

        {/* Approve / Reject buttons */}
        {canApprove && entry.status === "PENDING_APPROVAL" && pendingApproval && (
          <div className="flex gap-2">
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={handleApprove}
              disabled={submitting}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Approve
            </Button>
            <Button
              variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => { setRejectionReason(""); setRejectDialogOpen(true); }}
              disabled={submitting}
            >
              <XCircle className="h-4 w-4 mr-1" />
              Reject
            </Button>
          </div>
        )}
      </div>

      {/* Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Log Entry Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Reference</span>
              <span className="font-mono font-medium">{entry.referenceNo}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Type</span>
              <Badge variant="outline">{LOG_TYPE_LABELS[entry.logType] || entry.logType}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Entry Date</span>
              <span>{formatDate(entry.entryDate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Company</span>
              <span>{entry.company?.name || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Department</span>
              <span>{entry.department?.name || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Uploaded By</span>
              <span>{entry.uploadedBy?.name || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Created</span>
              <span>{formatDateTime(entry.createdAt)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Approval info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Approval Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {entry.status === "ACTIVE" && entry.approvedBy ? (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-500">Approved By</span>
                  <span className="font-medium text-green-700">{entry.approvedBy.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Approved At</span>
                  <span>{formatDateTime(entry.approvedAt)}</span>
                </div>
              </>
            ) : entry.status === "PENDING_APPROVAL" ? (
              <div className="flex items-center gap-2 text-orange-600">
                <Clock className="h-4 w-4" />
                <span>Awaiting approval from {pendingApproval?.assignedApprover?.name || "approver"}</span>
              </div>
            ) : entry.status === "DRAFT" ? (
              <p className="text-gray-400">This entry is a draft and has not been submitted for approval.</p>
            ) : (
              <p className="text-gray-400">No approval information available.</p>
            )}

            {/* Rejection info */}
            {entry.approvalRequests?.map((ar: any) =>
              ar.status === "REJECTED" ? (
                <div key={ar.id} className="mt-2 p-3 bg-red-50 rounded text-red-700">
                  <p className="font-medium text-xs uppercase tracking-wide mb-1">Rejected</p>
                  <p>{ar.rejectionReason || "No reason provided."}</p>
                  <p className="text-xs text-red-500 mt-1">By {ar.assignedApprover?.name} on {formatDate(ar.decidedAt)}</p>
                </div>
              ) : null
            )}
          </CardContent>
        </Card>
      </div>

      {/* Description */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Description</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{entry.description || "—"}</p>
        </CardContent>
      </Card>

      {/* Attachments */}
      {entry.attachments && entry.attachments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Paperclip className="h-4 w-4" />
              Attachments ({entry.attachments.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {entry.attachments.map((att: any) => (
                <div key={att.id} className="flex items-center gap-3 py-2 border-b last:border-0">
                  <Paperclip className="h-4 w-4 text-gray-400 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{att.originalName}</p>
                    <p className="text-xs text-gray-500">
                      {(att.size / 1024).toFixed(1)} KB — uploaded by {att.uploadedBy?.name}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Audit History */}
      {entry.auditLogs && entry.auditLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Audit History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {entry.auditLogs.map((log: any) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                let changes: any = {};
                try { changes = JSON.parse(log.changes); } catch {}
                return (
                  <div key={log.id} className="flex items-start gap-3 py-2 border-b last:border-0 text-sm">
                    <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{log.changedBy?.name}</span>
                        <span className="text-gray-400 text-xs">{formatDateTime(log.timestamp)}</span>
                        <Badge variant="outline" className="text-xs">{log.action}</Badge>
                      </div>
                      {changes.updated && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          Status: {changes.previous?.status} → {changes.updated?.status}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Log Entry</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Provide a reason for rejection. The submitter will be notified.
            </p>
            <div>
              <Label>Rejection Reason</Label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Describe why this log entry is being rejected..."
                className="mt-1"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={submitting}>
              {submitting ? "Rejecting..." : "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
