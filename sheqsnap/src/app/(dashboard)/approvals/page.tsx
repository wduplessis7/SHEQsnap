"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { RefreshCw, CheckCircle, XCircle, Clock, HelpCircle } from "lucide-react";
import { formatDate } from "@/lib/utils";

const LOG_TYPE_LABELS: Record<string, string> = {
  INSPECTION: "Inspection",
  TOOLBOX_TALK: "Toolbox Talk",
  MEETING_MINUTES: "Meeting Minutes",
  SAFETY_FILE: "Safety File",
  PERMIT: "Permit",
  INCIDENT_LOG: "Incident Log",
  OTHER: "Other",
};

const ENTITY_TYPE_LABELS: Record<string, string> = {
  NEAR_MISS: "Near Miss",
  INCIDENT: "Incident",
  ACTION: "Action",
  LOG_ENTRY: "Log Entry",
};

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchApprovals = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/approvals");
      if (res.ok) {
        const data = await res.json();
        setApprovals(data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, []);

  async function handleApprove(approvalId: string) {
    if (!confirm("Approve this submission?")) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvalId, action: "APPROVE" }),
      });
      if (res.ok) {
        await fetchApprovals();
      }
    } finally {
      setSubmitting(false);
    }
  }

  function openRejectDialog(approval: any) {
    setSelectedApproval(approval);
    setRejectionReason("");
    setRejectDialogOpen(true);
  }

  async function handleReject() {
    if (!selectedApproval) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approvalId: selectedApproval.id,
          action: "REJECT",
          rejectionReason,
        }),
      });
      if (res.ok) {
        setRejectDialogOpen(false);
        await fetchApprovals();
      }
    } finally {
      setSubmitting(false);
    }
  }

  function getEntityDescription(approval: any): string {
    const d = approval.entityDetails || {};
    if (approval.entityType === "NEAR_MISS") return d.description || "—";
    if (approval.entityType === "INCIDENT") return d.description || "—";
    if (approval.entityType === "LOG_ENTRY") return d.title || "—";
    return "—";
  }

  function getEntityRef(approval: any): string {
    return approval.entityDetails?.referenceNo || "—";
  }

  function getEntityDate(approval: any): string {
    const d = approval.entityDetails;
    if (!d) return "—";
    const dateStr = d.dateReported || d.dateOfIncident || d.entryDate;
    return dateStr ? formatDate(dateStr) : "—";
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Approvals Queue</h1>
            <Link href="/help/approvals" className="text-gray-400 hover:text-blue-600 transition-colors" title="Help: Approvals">
              <HelpCircle className="h-5 w-5" />
            </Link>
          </div>
          <p className="text-gray-500 mt-1">
            {loading ? "Loading..." : `${approvals.length} pending approval${approvals.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <Button variant="outline" size="icon" onClick={fetchApprovals}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {!loading && approvals.length === 0 ? (
        <Card>
          <CardContent className="py-16 flex flex-col items-center gap-3 text-gray-400">
            <CheckCircle className="h-12 w-12 text-green-300" />
            <p className="text-lg font-medium">All clear — no pending approvals</p>
            <p className="text-sm">New submissions from contractors will appear here.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500" />
              Pending Approvals
            </CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Reference</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Description</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Submitted By</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8">
                      <RefreshCw className="h-5 w-5 animate-spin mx-auto text-gray-400" />
                    </td>
                  </tr>
                ) : (
                  approvals.map((approval) => (
                    <tr key={approval.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm font-medium text-blue-600">
                          {getEntityRef(approval)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-xs">
                          {ENTITY_TYPE_LABELS[approval.entityType] || approval.entityType}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <p className="truncate text-gray-700">{getEntityDescription(approval)}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {approval.requestedBy?.name || "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {getEntityDate(approval)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white h-7 px-3"
                            onClick={() => handleApprove(approval.id)}
                            disabled={submitting}
                          >
                            <CheckCircle className="h-3.5 w-3.5 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-200 hover:bg-red-50 h-7 px-3"
                            onClick={() => openRejectDialog(approval)}
                            disabled={submitting}
                          >
                            <XCircle className="h-3.5 w-3.5 mr-1" />
                            Reject
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
      )}

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Submission</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Provide a reason for rejection. This will be recorded and the submitter will be notified.
            </p>
            <div>
              <Label>Rejection Reason</Label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Describe why this submission is being rejected..."
                className="mt-1"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={submitting}
            >
              {submitting ? "Rejecting..." : "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
