"use client";

export const dynamic = "force-dynamic";


import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Edit,
  Save,
  X,
  Loader2,
  Calendar,
  MapPin,
  User,
  AlertTriangle,
  Brain,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SeverityBadge } from "@/components/ui/severity-badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { CommentsSection } from "@/components/ui/comments-section";
import { AuditLogSection } from "@/components/ui/audit-log-section";
import { AttachmentsSection } from "@/components/ui/attachments-section";
import { formatDate, formatDateTime, RISK_CATEGORIES, RISK_CATEGORY_GROUPS, isOverdue } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { AIAnalysisPanel } from "@/components/ai/AIAnalysisPanel";

const STATUSES = ["NEW", "SUBMITTED", "UNDER_REVIEW", "ACTION_REQUIRED", "IN_PROGRESS", "CLOSED", "CANCELLED"];

export default function NearMissDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session } = useSession();
  const user = session?.user as any;

  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<any>({});
  const [departments, setDepartments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [hasAiModule, setHasAiModule] = useState(false);

  useEffect(() => {
    fetch("/api/license/modules")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((license) => {
        const mods: string[] = license.modules ?? [];
        const has = mods.includes("all") || mods.includes("ai");
        console.log("[SHEQSnap] License modules:", mods, "hasAi:", has);
        setHasAiModule(has);
      })
      .catch((err) => console.error("[SHEQSnap] License check failed:", err));
  }, []);

  useEffect(() => {
    Promise.all([
      fetch(`/api/near-misses/${id}`).then((r) => r.json()),
      fetch("/api/admin/departments").then((r) => r.json()),
      fetch("/api/admin/users").then((r) => r.json()),
    ]).then(([data, depts, userList]) => {
      setItem(data);
      setForm({
        dateReported: data.dateReported?.split("T")[0] || "",
        departmentId: data.departmentId || "",
        location: data.location || "",
        description: data.description || "",
        riskCategory: data.riskCategory || "",
        severityLevel: data.severityLevel || "LOW",
        immediateAction: data.immediateAction || "",
        status: data.status || "NEW",
        assignedUserId: data.assignedUserId || "",
        targetCloseDate: data.targetCloseDate?.split("T")[0] || "",
        contractorsInvolved: data.contractorsInvolved || false,
        contractorDetails: data.contractorDetails || "",
      });
      setDepartments(depts);
      setUsers(userList.filter((u: any) => u.active));
    }).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  function setField(key: string, value: string) {
    setForm((prev: any) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/near-misses/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          departmentId: form.departmentId || null,
          assignedUserId: form.assignedUserId || null,
          targetCloseDate: form.targetCloseDate || null,
          contractorsInvolved: form.contractorsInvolved,
          contractorDetails: form.contractorDetails || null,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setItem((prev: any) => ({ ...prev, ...updated }));
        setEditing(false);
      } else {
        const err = await res.json();
        setError(err.error || "Failed to save");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(newStatus: string) {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/near-misses/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...item, status: newStatus, departmentId: item.departmentId || null }),
      });
      if (res.ok) {
        const updated = await res.json();
        setItem((prev: any) => ({ ...prev, ...updated, status: newStatus }));
        setForm((prev: any) => ({ ...prev, status: newStatus }));
      } else {
        const err = await res.json();
        setError(err.error);
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!item) return <div className="text-center py-8">Near miss not found</div>;

  const overdue = isOverdue(item.targetCloseDate, item.status);
  const isReadOnly =
    (item.status === "CLOSED" || item.status === "CANCELLED") && user?.role !== "ADMIN";

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href="/near-misses">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{item.referenceNo}</h1>
              <SeverityBadge severity={item.severityLevel} />
              <StatusBadge status={item.status} />
              {overdue && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                  <AlertTriangle className="h-3 w-3" />
                  Overdue
                </span>
              )}
            </div>
            <p className="text-gray-500 text-sm mt-0.5">Near Miss Report</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isReadOnly && !editing && (
            <Button variant="outline" onClick={() => setEditing(true)}>
              <Edit className="h-4 w-4" />
              Edit
            </Button>
          )}
          {editing && (
            <>
              <Button variant="outline" onClick={() => setEditing(false)}>
                <X className="h-4 w-4" />
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Changes
              </Button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Status workflow */}
      {!isReadOnly && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-blue-700">Update Status:</span>
              {STATUSES.filter((s) => s !== item.status).map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant="outline"
                  className="text-xs"
                  onClick={() => handleStatusChange(s)}
                  disabled={saving}
                >
                  {s.replace(/_/g, " ")}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Near Miss Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {editing ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Date Reported</Label>
                    <Input
                      type="date"
                      value={form.dateReported}
                      onChange={(e) => setField("dateReported", e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Department</Label>
                    <Select value={form.departmentId || "none"} onValueChange={(v) => setField("departmentId", v === "none" ? "" : v)}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select department" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No department</SelectItem>
                        {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2">
                    <Label>Location</Label>
                    <Input value={form.location} onChange={(e) => setField("location", e.target.value)} className="mt-1" />
                  </div>
                  <div>
                    <Label>Risk Category</Label>
                    <Select value={form.riskCategory} onValueChange={(v) => setField("riskCategory", v)}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {RISK_CATEGORY_GROUPS.map((group) => (
                          <div key={group.group}>
                            <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50">{group.group}</div>
                            {group.items.map((item) => (
                              <SelectItem key={item} value={item} className="pl-4">{item}</SelectItem>
                            ))}
                          </div>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Severity</Label>
                    <Select value={form.severityLevel} onValueChange={(v) => setField("severityLevel", v)}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2">
                    <Label>Description</Label>
                    <Textarea value={form.description} onChange={(e) => setField("description", e.target.value)} rows={4} className="mt-1" />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Immediate Action</Label>
                    <Textarea value={form.immediateAction} onChange={(e) => setField("immediateAction", e.target.value)} rows={3} className="mt-1" />
                  </div>
                  <div className="md:col-span-2">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="contractorsInvolved"
                        checked={form.contractorsInvolved}
                        onChange={(e) => setForm((prev: any) => ({ ...prev, contractorsInvolved: e.target.checked }))}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600"
                      />
                      <Label htmlFor="contractorsInvolved">Contractors were involved in this near miss</Label>
                    </div>
                  </div>
                  {form.contractorsInvolved && (
                    <div className="md:col-span-2">
                      <Label>Contractor Details</Label>
                      <Textarea
                        value={form.contractorDetails}
                        onChange={(e) => setField("contractorDetails", e.target.value)}
                        placeholder="Company name, contractor names, nature of work..."
                        rows={3}
                        className="mt-1"
                      />
                    </div>
                  )}
                  <div>
                    <Label>Assign To</Label>
                    <Select value={form.assignedUserId || "none"} onValueChange={(v) => setField("assignedUserId", v === "none" ? "" : v)}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Unassigned</SelectItem>
                        {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Target Close Date</Label>
                    <Input type="date" value={form.targetCloseDate} onChange={(e) => setField("targetCloseDate", e.target.value)} className="mt-1" />
                  </div>
                </div>
              ) : (
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Date Reported</dt>
                    <dd className="mt-1 flex items-center gap-1 text-sm text-gray-900">
                      <Calendar className="h-3.5 w-3.5 text-gray-400" />
                      {formatDate(item.dateReported)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Department</dt>
                    <dd className="mt-1 text-sm text-gray-900">{item.department?.name || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Location</dt>
                    <dd className="mt-1 flex items-center gap-1 text-sm text-gray-900">
                      <MapPin className="h-3.5 w-3.5 text-gray-400" />
                      {item.location}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Risk Category</dt>
                    <dd className="mt-1 text-sm text-gray-900">{item.riskCategory}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Contractors Involved</dt>
                    <dd className="mt-1 text-sm text-gray-900">{item.contractorsInvolved ? "Yes" : "No"}</dd>
                  </div>
                  {item.contractorDetails && (
                    <div className="sm:col-span-2">
                      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Contractor Details</dt>
                      <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{item.contractorDetails}</dd>
                    </div>
                  )}
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Description</dt>
                    <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{item.description}</dd>
                  </div>
                  {item.immediateAction && (
                    <div className="sm:col-span-2">
                      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Immediate Action</dt>
                      <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{item.immediateAction}</dd>
                    </div>
                  )}
                </dl>
              )}
            </CardContent>
          </Card>

          {/* Tabs: Actions, Comments, Attachments, Audit, AI Analysis */}
          <Tabs defaultValue="actions">
            <TabsList>
              <TabsTrigger value="actions">Actions ({item.actions?.length || 0})</TabsTrigger>
              <TabsTrigger value="comments">Comments ({item.comments?.length || 0})</TabsTrigger>
              <TabsTrigger value="attachments">Files ({item.attachments?.length || 0})</TabsTrigger>
              <TabsTrigger value="audit">History</TabsTrigger>
              {hasAiModule && (
                <TabsTrigger value="ai-analysis" className="gap-1.5">
                  <Brain className="h-3.5 w-3.5" />
                  AI Analysis
                </TabsTrigger>
              )}
            </TabsList>
            <TabsContent value="actions">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">Linked Actions</CardTitle>
                  <Link href={`/actions/new?nearMissId=${id}`}>
                    <Button size="sm" variant="outline">Add Action</Button>
                  </Link>
                </CardHeader>
                <CardContent>
                  {(item.actions || []).length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4">No actions linked</p>
                  ) : (
                    <div className="space-y-2">
                      {item.actions.map((action: any) => (
                        <Link key={action.id} href={`/actions/${action.id}`}>
                          <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50">
                            <div>
                              <span className="text-sm font-medium text-blue-600">{action.referenceNo}</span>
                              <p className="text-sm text-gray-600 mt-0.5">{action.description}</p>
                            </div>
                            <StatusBadge status={action.status} />
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="comments">
              <Card>
                <CardContent className="p-4">
                  <CommentsSection
                    comments={item.comments || []}
                    nearMissId={id}
                    onCommentAdded={(c) => setItem((prev: any) => ({ ...prev, comments: [...(prev.comments || []), c] }))}
                  />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="attachments">
              <Card>
                <CardContent className="p-4">
                  <AttachmentsSection
                    attachments={item.attachments || []}
                    nearMissId={id}
                    onAttachmentAdded={(a) => setItem((prev: any) => ({ ...prev, attachments: [...(prev.attachments || []), a] }))}
                    onAttachmentDeleted={(attId) => setItem((prev: any) => ({ ...prev, attachments: prev.attachments.filter((a: any) => a.id !== attId) }))}
                  />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="audit">
              <Card>
                <CardContent className="p-4">
                  <AuditLogSection auditLogs={item.auditLogs || []} />
                </CardContent>
              </Card>
            </TabsContent>
            {hasAiModule && (
              <TabsContent value="ai-analysis">
                <AIAnalysisPanel entityType="near-miss" entityData={item} />
              </TabsContent>
            )}
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Record Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-xs text-gray-500">Reported By</p>
                <p className="font-medium flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {item.reportedBy?.name}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Assigned To</p>
                <p className="font-medium">{item.assignedUser?.name || item.assignedGroup?.name || "Unassigned"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Target Close</p>
                <p className={`font-medium ${overdue ? "text-red-600" : ""}`}>
                  {formatDate(item.targetCloseDate) || "Not set"}
                </p>
              </div>
              {item.actualCloseDate && (
                <div>
                  <p className="text-xs text-gray-500">Actual Close</p>
                  <p className="font-medium">{formatDate(item.actualCloseDate)}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-500">Created</p>
                <p className="text-gray-600">{formatDateTime(item.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Last Updated</p>
                <p className="text-gray-600">{formatDateTime(item.updatedAt)}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
