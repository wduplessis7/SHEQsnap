"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  ArrowLeft, Edit2, Clock, CheckCircle, XCircle, Loader2,
  ChevronDown, ChevronUp, MessageSquare, Send, Globe, FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DocEditor } from "@/components/documents/doc-editor";
import { formatDate, formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

const STATUS_COLOR: Record<string, string> = {
  DRAFT:        "bg-gray-100 text-gray-700",
  UNDER_REVIEW: "bg-yellow-100 text-yellow-800",
  APPROVED:     "bg-blue-100 text-blue-800",
  PUBLISHED:    "bg-green-100 text-green-800",
  ARCHIVED:     "bg-red-100 text-red-700",
};

export default function DocumentDetailPage({ params }: { params: { id: string } }) {
  const { data: session } = useSession();
  const router = useRouter();
  const user = session?.user as any;

  const [doc,            setDoc]            = useState<any>(null);
  const [selectedVersion, setSelectedVersion] = useState<any>(null);
  const [comments,       setComments]       = useState<any[]>([]);
  const [newComment,     setNewComment]     = useState("");
  const [showHistory,    setShowHistory]    = useState(false);
  const [loading,        setLoading]        = useState(true);
  const [actionLoading,  setActionLoading]  = useState("");
  const [rejectNote,     setRejectNote]     = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [approveNote,    setApproveNote]    = useState("");
  const [error,          setError]          = useState("");

  const canManage  = ["SAFETY_OFFICER", "MANAGER", "ADMIN"].includes(user?.role);
  const isApprover = ["SAFETY_OFFICER", "MANAGER", "ADMIN"].includes(user?.role);
  const isAdmin    = user?.role === "ADMIN";

  const fetchDoc = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/documents/${params.id}`);
      if (!res.ok) { router.replace("/documents"); return; }
      const data = await res.json();
      setDoc(data);
      const latest = data.versions?.[0];
      setSelectedVersion(latest || null);
    } finally {
      setLoading(false);
    }
  }, [params.id, router]);

  const fetchComments = useCallback(async () => {
    if (!selectedVersion) return;
    const res = await fetch(`/api/documents/${params.id}/comments?versionId=${selectedVersion.id}`);
    if (res.ok) setComments(await res.json());
  }, [params.id, selectedVersion]);

  useEffect(() => { fetchDoc(); }, [fetchDoc]);
  useEffect(() => { fetchComments(); }, [fetchComments]);

  async function doAction(action: "approve" | "reject" | "publish", note?: string) {
    if (!selectedVersion) return;
    setActionLoading(action);
    setError("");
    try {
      const res = await fetch(`/api/documents/${params.id}/versions/${selectedVersion.id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || `${action} failed`);
      }
      setShowRejectInput(false);
      setRejectNote("");
      setApproveNote("");
      await fetchDoc();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading("");
    }
  }

  async function addComment() {
    if (!newComment.trim() || !selectedVersion) return;
    await fetch(`/api/documents/${params.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ docVersionId: selectedVersion.id, content: newComment }),
    });
    setNewComment("");
    fetchComments();
  }

  async function resolveComment(commentId: string, resolved: boolean) {
    await fetch(`/api/documents/${params.id}/comments`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commentId, resolved }),
    });
    fetchComments();
  }

  async function createNewRevision() {
    setActionLoading("revision");
    const res = await fetch(`/api/documents/${params.id}/versions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isMajor: false }),
    });
    if (res.ok) {
      const ver = await res.json();
      router.push(`/documents/${params.id}/edit?vid=${ver.id}`);
    }
    setActionLoading("");
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
    </div>
  );
  if (!doc) return null;

  const currentVersion = selectedVersion;
  const isDraft     = currentVersion?.status === "DRAFT";
  const isUnderReview = currentVersion?.status === "UNDER_REVIEW";
  const isApproved  = currentVersion?.status === "APPROVED";
  const isPublished = currentVersion?.status === "PUBLISHED";

  // Check if this user has a pending workflow step
  const myPendingStep = currentVersion?.workflowSteps?.find(
    (s: any) => s.status === "PENDING" && (s.assignedRole === user?.role || s.assignedUserId === user?.id)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link href="/documents">
          <Button variant="ghost" size="sm" className="gap-1 text-gray-500 mt-0.5">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-xs font-mono text-gray-400">{doc.docNumber}</span>
            <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", STATUS_COLOR[doc.status] ?? "bg-gray-100 text-gray-600")}>
              {doc.status.replace(/_/g, " ")}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{doc.title}</h1>
          {doc.description && <p className="text-sm text-gray-500 mt-1">{doc.description}</p>}
          <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-400">
            <span>Owner: <span className="text-gray-600 font-medium">{doc.owner?.name}</span></span>
            {doc.category && <span>Category: <span className="text-gray-600">{doc.category}</span></span>}
            {doc.nextReviewDate && <span>Review due: <span className="text-gray-600">{formatDate(doc.nextReviewDate)}</span></span>}
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          {isDraft && canManage && (
            <Link href={`/documents/${params.id}/edit?vid=${currentVersion?.id}`}>
              <Button size="sm" variant="outline" className="gap-1">
                <Edit2 className="h-4 w-4" /> Edit
              </Button>
            </Link>
          )}
          {isPublished && canManage && (
            <Button size="sm" variant="outline" onClick={createNewRevision} disabled={actionLoading === "revision"}>
              {actionLoading === "revision" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Edit2 className="h-4 w-4 mr-1" />}
              New Revision
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Approval actions banner */}
      {isUnderReview && myPendingStep && isApprover && (
        <Card className="border-yellow-200 bg-yellow-50 shadow-none">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex-1">
                <p className="font-semibold text-yellow-900 text-sm">Your {myPendingStep.action.toLowerCase()} is required</p>
                <p className="text-yellow-700 text-xs mt-0.5">Review the document content below, then approve or request changes.</p>
              </div>
              {!showRejectInput ? (
                <div className="flex gap-2">
                  <div className="flex gap-2 items-center">
                    <input
                      className="text-xs border border-yellow-300 rounded px-2 py-1.5 w-48 bg-white placeholder:text-yellow-400 focus:outline-none"
                      placeholder="Approval note (optional)"
                      value={approveNote}
                      onChange={e => setApproveNote(e.target.value)}
                    />
                    <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white gap-1"
                      onClick={() => doAction("approve", approveNote)} disabled={!!actionLoading}>
                      {actionLoading === "approve" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                      Approve
                    </Button>
                  </div>
                  <Button size="sm" variant="outline" className="border-red-300 text-red-600 hover:bg-red-50 gap-1"
                    onClick={() => setShowRejectInput(true)}>
                    <XCircle className="h-4 w-4" /> Request Changes
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2 items-center w-full sm:w-auto">
                  <input
                    className="text-xs border border-red-200 rounded px-2 py-1.5 flex-1 bg-white focus:outline-none"
                    placeholder="What needs to change? (required)"
                    value={rejectNote}
                    onChange={e => setRejectNote(e.target.value)}
                  />
                  <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white"
                    disabled={!rejectNote.trim() || !!actionLoading}
                    onClick={() => doAction("reject", rejectNote)}>
                    {actionLoading === "reject" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowRejectInput(false)}>Cancel</Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Publish banner */}
      {isApproved && (isAdmin || user?.role === "MANAGER") && (
        <Card className="border-blue-200 bg-blue-50 shadow-none">
          <CardContent className="p-4 flex items-center gap-3">
            <Globe className="h-5 w-5 text-blue-600 shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-blue-900 text-sm">Document is approved and ready to publish</p>
              <p className="text-blue-700 text-xs mt-0.5">Publishing will make it visible to all users and archive the previous version.</p>
            </div>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white shrink-0"
              onClick={() => doAction("publish")} disabled={!!actionLoading}>
              {actionLoading === "publish" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4 mr-1" />}
              Publish
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Document content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Version selector */}
          {doc.versions?.length > 1 && (
            <div className="flex items-center gap-2 flex-wrap">
              {doc.versions.map((v: any) => (
                <button
                  key={v.id}
                  onClick={() => setSelectedVersion(v)}
                  className={cn(
                    "text-xs font-mono px-3 py-1 rounded-full border transition-colors",
                    selectedVersion?.id === v.id
                      ? "border-gray-900 bg-gray-900 text-white"
                      : "border-gray-200 text-gray-600 hover:border-gray-400"
                  )}
                >
                  v{v.versionNumber}
                  {v.status === "PUBLISHED" && " ✓"}
                </button>
              ))}
            </div>
          )}

          <DocEditor
            content={currentVersion?.content ?? "{}"}
            editable={false}
          />

          {/* Comments */}
          <Card className="shadow-none border-gray-200">
            <CardContent className="p-4">
              <h3 className="font-semibold text-sm text-gray-900 mb-3 flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Comments ({comments.length})
              </h3>
              <div className="space-y-3 mb-4">
                {comments.length === 0 && (
                  <p className="text-sm text-gray-400">No comments yet.</p>
                )}
                {comments.map(c => (
                  <div key={c.id} className={cn("group", c.resolvedAt && "opacity-50")}>
                    <div className="flex items-start gap-2">
                      <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 flex-shrink-0">
                        {c.author?.name?.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="text-xs font-semibold">{c.author?.name}</span>
                          <span className="text-xs text-gray-400">{formatDateTime(c.createdAt)}</span>
                          {c.resolvedAt && <span className="text-xs text-green-600 font-medium">Resolved</span>}
                        </div>
                        <p className="text-sm text-gray-700 mt-0.5">{c.content}</p>
                        {!c.resolvedAt && canManage && (
                          <button onClick={() => resolveComment(c.id, true)}
                            className="text-xs text-gray-400 hover:text-green-600 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            Mark resolved
                          </button>
                        )}
                      </div>
                    </div>
                    {/* Replies */}
                    {c.replies?.length > 0 && (
                      <div className="ml-9 mt-2 space-y-2 border-l-2 border-gray-100 pl-3">
                        {c.replies.map((r: any) => (
                          <div key={r.id} className="flex items-start gap-2">
                            <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 flex-shrink-0">
                              {r.author?.name?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <span className="text-xs font-semibold">{r.author?.name} </span>
                              <span className="text-xs text-gray-500">{formatDateTime(r.createdAt)}</span>
                              <p className="text-xs text-gray-600 mt-0.5">{r.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  className="flex-1 text-sm border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-gray-900"
                  placeholder="Add a comment…"
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), addComment())}
                />
                <Button size="sm" variant="outline" onClick={addComment} disabled={!newComment.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          {/* Workflow */}
          <Card className="shadow-none border-gray-200">
            <CardContent className="p-4">
              <h3 className="font-semibold text-sm text-gray-900 mb-3 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" /> Approval Workflow
              </h3>
              {currentVersion?.workflowSteps?.length === 0 && (
                <p className="text-xs text-gray-400">No workflow steps.</p>
              )}
              <div className="space-y-2">
                {currentVersion?.workflowSteps?.map((step: any, i: number) => (
                  <div key={step.id} className="flex items-start gap-2">
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5",
                      step.status === "APPROVED"          && "bg-green-500 text-white",
                      step.status === "CHANGES_REQUESTED" && "bg-red-400 text-white",
                      step.status === "PENDING"           && "bg-gray-200 text-gray-500",
                    )}>
                      {step.status === "APPROVED" ? "✓" : step.status === "CHANGES_REQUESTED" ? "✗" : i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-700">
                        {step.action === "APPROVE" ? "Approve" : "Review"} — {step.assignedRole ?? step.assignedUser?.name}
                      </p>
                      {step.completedBy && (
                        <p className="text-xs text-gray-400">{step.completedBy.name} · {formatDate(step.completedAt)}</p>
                      )}
                      {step.note && (
                        <p className="text-xs text-gray-500 mt-0.5 italic">&quot;{step.note}&quot;</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Version history */}
          <Card className="shadow-none border-gray-200">
            <CardContent className="p-4">
              <button
                className="flex items-center justify-between w-full"
                onClick={() => setShowHistory(h => !h)}
              >
                <h3 className="font-semibold text-sm text-gray-900 flex items-center gap-2">
                  <Clock className="h-4 w-4" /> Version History
                  <span className="text-xs text-gray-400 font-normal">({doc.versions?.length ?? 0})</span>
                </h3>
                {showHistory ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
              </button>
              {showHistory && (
                <div className="mt-3 space-y-2">
                  {doc.versions?.map((v: any) => (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVersion(v)}
                      className={cn(
                        "w-full text-left p-2 rounded-lg border transition-colors",
                        selectedVersion?.id === v.id ? "border-gray-900 bg-gray-50" : "border-transparent hover:bg-gray-50"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-semibold text-gray-700">v{v.versionNumber}</span>
                        <span className={cn("text-xs px-1.5 py-0.5 rounded-full", STATUS_COLOR[v.status] ?? "bg-gray-100 text-gray-600")}>
                          {v.status.replace(/_/g, " ")}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{v.author?.name} · {formatDate(v.createdAt)}</p>
                      {v.changeNotes && <p className="text-xs text-gray-500 mt-0.5 truncate">{v.changeNotes}</p>}
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Meta */}
          <Card className="shadow-none border-gray-200">
            <CardContent className="p-4 space-y-2 text-xs">
              <h3 className="font-semibold text-sm text-gray-900 flex items-center gap-2 mb-3">
                <FileText className="h-4 w-4" /> Details
              </h3>
              {[
                { label: "Number",   value: doc.docNumber },
                { label: "Type",     value: doc.type.replace(/_/g, " ") },
                { label: "Category", value: doc.category || "—" },
                { label: "Owner",    value: doc.owner?.name },
                { label: "Created",  value: formatDate(doc.createdAt) },
                { label: "Updated",  value: formatDate(doc.updatedAt) },
                ...(doc.nextReviewDate ? [{ label: "Review Due", value: formatDate(doc.nextReviewDate) }] : []),
              ].map(row => (
                <div key={row.label} className="flex justify-between">
                  <span className="text-gray-400">{row.label}</span>
                  <span className="text-gray-700 font-medium text-right">{row.value}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
