"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { ArrowLeft, RefreshCw, Plus, X, Mail, Phone } from "lucide-react";
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
import { cn } from "@/lib/utils";

const CHANGE_TYPES = [
  "Process",
  "Equipment / Plant",
  "Document / Procedure",
  "Personnel",
  "Temporary Change",
  "Other",
];

interface TemplateItem {
  id: string;
  order: number;
  label: string;
  type: string;
  required: boolean;
  description?: string;
}

interface Template {
  id: string;
  title: string;
  description?: string;
  items: TemplateItem[];
}

interface InternalNotif {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  company?: string;
  phone?: string;
}

interface ExternalNotif {
  firstName: string;
  lastName: string;
  company: string;
  email: string;
  phone: string;
  discussedTelephonically: boolean;
}

const TABS = [
  { key: "details", label: "1. Details" },
  { key: "checklist", label: "2. Checklist" },
  { key: "notifications", label: "3. Notifications" },
];

export default function NewMocPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const userName = (session?.user as any)?.name || "";
  const [activeTab, setActiveTab] = useState("details");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Step 1: Details
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
    requestedByName: userName,
    approverId: "",
  });

  // Step 2: Checklist
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [checklistAnswers, setChecklistAnswers] = useState<Record<string, { value?: string; passed?: boolean }>>({});

  // Step 3: Notifications
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [approvers, setApprovers] = useState<any[]>([]);
  const [internalNotifs, setInternalNotifs] = useState<InternalNotif[]>([]);
  const [internalSearch, setInternalSearch] = useState("");
  const [externalNotifs, setExternalNotifs] = useState<ExternalNotif[]>([]);
  const [extForm, setExtForm] = useState({ firstName: "", lastName: "", company: "", email: "", phone: "", discussedTelephonically: false });

  useEffect(() => {
    fetch("/api/moc/templates").then((r) => r.json()).then((d) => setTemplates(Array.isArray(d) ? d : []));
    fetch("/api/admin/users").then((r) => r.json()).then((d) => setAllUsers(Array.isArray(d) ? d.filter((u: any) => u.active) : []));
    fetch("/api/moc/approvers").then((r) => r.json()).then((d) => setApprovers(Array.isArray(d) ? d : []));
  }, []);

  useEffect(() => {
    if (!form.requestedByName && userName) setForm((f) => ({ ...f, requestedByName: userName }));
  }, [userName]);

  useEffect(() => {
    const t = templates.find((t) => t.id === selectedTemplateId) || null;
    setSelectedTemplate(t);
    setChecklistAnswers({});
  }, [selectedTemplateId]);

  const checklistComplete = selectedTemplate
    ? selectedTemplate.items.filter((i) => i.required).every((i) => {
        const ans = checklistAnswers[i.id];
        if (i.type === "YES_NO") return ans?.passed !== undefined;
        if (i.type === "TEXT") return ans?.value?.trim();
        return ans?.passed !== undefined || ans?.value?.trim();
      })
    : false;

  function addInternalUser(user: any) {
    if (internalNotifs.find((n) => n.userId === user.id)) return;
    setInternalNotifs((prev) => [...prev, {
      userId: user.id,
      firstName: user.name.split(" ")[0] || user.name,
      lastName: user.name.split(" ").slice(1).join(" ") || "",
      email: user.email,
    }]);
    setInternalSearch("");
  }

  function removeInternal(userId: string) {
    setInternalNotifs((prev) => prev.filter((n) => n.userId !== userId));
  }

  function addExternal() {
    if (!extForm.firstName.trim() || !extForm.lastName.trim()) return;
    if (!extForm.email.trim() && !extForm.discussedTelephonically) return;
    setExternalNotifs((prev) => [...prev, { ...extForm }]);
    setExtForm({ firstName: "", lastName: "", company: "", email: "", phone: "", discussedTelephonically: false });
  }

  function removeExternal(i: number) {
    setExternalNotifs((prev) => prev.filter((_, idx) => idx !== i));
  }

  const validateDetails = () => {
    if (!form.title.trim()) return "Title is required.";
    if (!form.changeType) return "Change type is required.";
    if (!form.description.trim()) return "Description is required.";
    if (!form.reason.trim()) return "Reason / justification is required.";
    return null;
  };

  const handleNext = () => {
    if (activeTab === "details") {
      const err = validateDetails();
      if (err) { setError(err); return; }
      setError("");
      setActiveTab("checklist");
    } else if (activeTab === "checklist") {
      setActiveTab("notifications");
    }
  };

  const handleSubmit = async (submitStatus: string) => {
    const err = validateDetails();
    if (err) { setError(err); setActiveTab("details"); return; }
    if (submitStatus === "pending_approval" && selectedTemplate && !checklistComplete) {
      setError("Please complete all required checklist items before submitting for approval.");
      setActiveTab("checklist");
      return;
    }
    setError("");
    setSaving(true);
    try {
      // 1. Create MOC
      const res = await fetch("/api/moc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          changeType: form.changeType,
          description: form.description.trim(),
          reason: form.reason.trim(),
          riskAssessment: form.riskAssessment.trim() || null,
          affectedAreas: form.affectedAreas.trim() || null,
          proposedDate: form.proposedDate || null,
          implementationDate: form.implementationDate || null,
          reviewDate: form.reviewDate || null,
          requestedByName: form.requestedByName.trim() || userName,
          approverId: form.approverId || null,
          status: submitStatus,
        }),
      });
      if (!res.ok) {
        const e = await res.json();
        setError(e.error || "Failed to save change request.");
        return;
      }
      const created = await res.json();

      // 2. Save checklist if template selected
      if (selectedTemplateId && selectedTemplate) {
        const items = selectedTemplate.items.map((i) => ({
          itemId: i.id,
          value: checklistAnswers[i.id]?.value ?? null,
          passed: checklistAnswers[i.id]?.passed ?? null,
        }));
        await fetch(`/api/moc/${created.id}/checklist`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ templateId: selectedTemplateId, items, completed: checklistComplete }),
        });
      }

      // 3. Save notifications
      const allNotifs = [
        ...internalNotifs.map((n) => ({ type: "internal", ...n })),
        ...externalNotifs.map((n) => ({ type: "external", userId: null, ...n })),
      ];
      if (allNotifs.length > 0) {
        await fetch(`/api/moc/${created.id}/notifications`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notifications: allNotifs }),
        });
      }

      router.push(`/moc/${created.id}`);
    } finally {
      setSaving(false);
    }
  };

  const filteredUsers = allUsers.filter((u) =>
    !internalNotifs.find((n) => n.userId === u.id) &&
    (u.name.toLowerCase().includes(internalSearch.toLowerCase()) || u.email.toLowerCase().includes(internalSearch.toLowerCase()))
  );

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/moc">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Change Request</h1>
          <p className="text-gray-500 mt-0.5">Submit a Management of Change request</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-gray-200">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              if (tab.key !== "details") {
                const err = validateDetails();
                if (err) { setError(err); return; }
              }
              setError("");
              setActiveTab(tab.key);
            }}
            className={cn(
              "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
              activeTab === tab.key
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">{error}</p>
      )}

      {/* Tab 1: Details */}
      {activeTab === "details" && (
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Change Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="title">Title *</Label>
                <Input id="title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Brief title describing the change" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="changeType">Change Type *</Label>
                <Select value={form.changeType} onValueChange={(v) => setForm((f) => ({ ...f, changeType: v }))}>
                  <SelectTrigger id="changeType"><SelectValue placeholder="Select change type" /></SelectTrigger>
                  <SelectContent>{CHANGE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="description">Description of Change *</Label>
                <Textarea id="description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Describe what is changing in detail..." rows={4} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reason">Reason / Justification *</Label>
                <Textarea id="reason" value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} placeholder="Why is this change necessary?" rows={3} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="riskAssessment">Risk Assessment</Label>
                <Textarea id="riskAssessment" value={form.riskAssessment} onChange={(e) => setForm((f) => ({ ...f, riskAssessment: e.target.value }))} placeholder="Potential risks and mitigations (optional)..." rows={3} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="affectedAreas">Affected Areas / Departments</Label>
                <Input id="affectedAreas" value={form.affectedAreas} onChange={(e) => setForm((f) => ({ ...f, affectedAreas: e.target.value }))} placeholder="Which areas or departments are affected? (optional)" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Dates, Requester &amp; Approver</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="proposedDate">Proposed Date</Label>
                  <Input id="proposedDate" type="date" value={form.proposedDate} onChange={(e) => setForm((f) => ({ ...f, proposedDate: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="implementationDate">Implementation Date</Label>
                  <Input id="implementationDate" type="date" value={form.implementationDate} onChange={(e) => setForm((f) => ({ ...f, implementationDate: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="reviewDate">Review Date</Label>
                  <Input id="reviewDate" type="date" value={form.reviewDate} onChange={(e) => setForm((f) => ({ ...f, reviewDate: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="requestedByName">Requested By</Label>
                <Input id="requestedByName" value={form.requestedByName} onChange={(e) => setForm((f) => ({ ...f, requestedByName: e.target.value }))} placeholder="Your name" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="approverId">MOC Approver</Label>
                <Select value={form.approverId || "none"} onValueChange={(v) => setForm((f) => ({ ...f, approverId: v === "none" ? "" : v }))}>
                  <SelectTrigger id="approverId"><SelectValue placeholder="Select MOC approver (optional)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No approver selected</SelectItem>
                    {approvers.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {approvers.length === 0 && <p className="text-xs text-amber-600">No MOC approvers configured. Ask an admin to set MOC approver flags on users.</p>}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Link href="/moc"><Button type="button" variant="outline">Cancel</Button></Link>
            <Button type="button" onClick={handleNext}>Next: Checklist</Button>
          </div>
        </div>
      )}

      {/* Tab 2: Checklist */}
      {activeTab === "checklist" && (
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">MOC Checklist</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Select MOC Checklist Template</Label>
                <Select value={selectedTemplateId || "none"} onValueChange={(v) => setSelectedTemplateId(v === "none" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Select a checklist template (optional)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No checklist</SelectItem>
                    {templates.map((t) => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
                  </SelectContent>
                </Select>
                {templates.length === 0 && (
                  <p className="text-xs text-amber-600">No MOC checklist templates found. Create a checklist template with category &quot;MOC&quot; in the admin area.</p>
                )}
              </div>

              {selectedTemplate && (
                <div className="space-y-3 mt-4">
                  <p className="text-sm font-medium text-gray-700">{selectedTemplate.title}</p>
                  {selectedTemplate.description && <p className="text-sm text-gray-500">{selectedTemplate.description}</p>}
                  <div className="space-y-3">
                    {selectedTemplate.items.map((item) => (
                      <div key={item.id} className="rounded-lg border border-gray-200 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium text-gray-800">{item.label}{item.required && <span className="text-red-500 ml-1">*</span>}</p>
                            {item.description && <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>}
                          </div>
                        </div>
                        <div className="mt-2">
                          {(item.type === "YES_NO" || item.type === "CHECKBOX") && (
                            <div className="flex gap-3">
                              <button
                                onClick={() => setChecklistAnswers((prev) => ({ ...prev, [item.id]: { ...prev[item.id], passed: true } }))}
                                className={cn("px-3 py-1.5 rounded text-sm font-medium border transition-colors", checklistAnswers[item.id]?.passed === true ? "bg-green-600 text-white border-green-600" : "border-gray-300 text-gray-600 hover:border-green-400")}
                              >Yes</button>
                              <button
                                onClick={() => setChecklistAnswers((prev) => ({ ...prev, [item.id]: { ...prev[item.id], passed: false } }))}
                                className={cn("px-3 py-1.5 rounded text-sm font-medium border transition-colors", checklistAnswers[item.id]?.passed === false ? "bg-red-600 text-white border-red-600" : "border-gray-300 text-gray-600 hover:border-red-400")}
                              >No</button>
                            </div>
                          )}
                          {item.type === "TEXT" && (
                            <Textarea
                              value={checklistAnswers[item.id]?.value || ""}
                              onChange={(e) => setChecklistAnswers((prev) => ({ ...prev, [item.id]: { ...prev[item.id], value: e.target.value } }))}
                              placeholder="Enter your response..."
                              rows={2}
                              className="text-sm"
                            />
                          )}
                          {item.type === "RATING" && (
                            <div className="flex gap-1">
                              {[1,2,3,4,5].map((r) => (
                                <button key={r} onClick={() => setChecklistAnswers((prev) => ({ ...prev, [item.id]: { value: String(r), passed: r >= 3 } }))}
                                  className={cn("w-8 h-8 rounded text-sm font-bold border transition-colors", checklistAnswers[item.id]?.value === String(r) ? "bg-blue-600 text-white border-blue-600" : "border-gray-300 text-gray-600 hover:border-blue-400")}
                                >{r}</button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  {checklistComplete && (
                    <p className="text-sm text-green-700 bg-green-50 rounded-md px-3 py-2">All required items completed.</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-between gap-3">
            <Button variant="outline" onClick={() => setActiveTab("details")}>Back</Button>
            <Button onClick={handleNext}>Next: Notifications</Button>
          </div>
        </div>
      )}

      {/* Tab 3: Notifications */}
      {activeTab === "notifications" && (
        <div className="space-y-6">
          {/* Internal notifications */}
          <Card>
            <CardHeader><CardTitle className="text-base">Internal Notifications</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Search and add system users</Label>
                <Input
                  placeholder="Search by name or email..."
                  value={internalSearch}
                  onChange={(e) => setInternalSearch(e.target.value)}
                />
                {internalSearch.trim().length > 0 && (
                  <div className="rounded-md border border-gray-200 bg-white shadow-sm max-h-48 overflow-y-auto">
                    {filteredUsers.slice(0, 10).length === 0 ? (
                      <p className="text-sm text-gray-500 p-3">No users found.</p>
                    ) : (
                      filteredUsers.slice(0, 10).map((u) => (
                        <button
                          key={u.id}
                          onClick={() => addInternalUser(u)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center justify-between"
                        >
                          <span>{u.name}</span>
                          <span className="text-xs text-gray-400">{u.email}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              {internalNotifs.length > 0 && (
                <div className="space-y-2">
                  {internalNotifs.map((n) => (
                    <div key={n.userId} className="flex items-center justify-between rounded-lg bg-blue-50 border border-blue-100 px-3 py-2">
                      <div>
                        <p className="text-sm font-medium text-blue-900">{n.firstName} {n.lastName}</p>
                        {n.email && <p className="text-xs text-blue-600 flex items-center gap-1"><Mail className="h-3 w-3" />{n.email}</p>}
                      </div>
                      <button onClick={() => removeInternal(n.userId)} className="text-blue-400 hover:text-blue-600 p-1"><X className="h-3.5 w-3.5" /></button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* External notifications */}
          <Card>
            <CardHeader><CardTitle className="text-base">External Notifications</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>First Name *</Label>
                  <Input value={extForm.firstName} onChange={(e) => setExtForm((f) => ({ ...f, firstName: e.target.value }))} placeholder="First name" />
                </div>
                <div className="space-y-1.5">
                  <Label>Last Name *</Label>
                  <Input value={extForm.lastName} onChange={(e) => setExtForm((f) => ({ ...f, lastName: e.target.value }))} placeholder="Last name" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Company / ID</Label>
                <Input value={extForm.company} onChange={(e) => setExtForm((f) => ({ ...f, company: e.target.value }))} placeholder="Company name or ID number" />
              </div>
              <div className="space-y-1.5">
                <Label>Email {!extForm.discussedTelephonically && "*"}</Label>
                <Input type="email" value={extForm.email} onChange={(e) => setExtForm((f) => ({ ...f, email: e.target.value }))} placeholder="email@example.com" />
              </div>
              <div className="space-y-1.5">
                <Label>Contact Number</Label>
                <Input value={extForm.phone} onChange={(e) => setExtForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+27 xx xxx xxxx" />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="telephonic"
                  checked={extForm.discussedTelephonically}
                  onChange={(e) => setExtForm((f) => ({ ...f, discussedTelephonically: e.target.checked }))}
                  className="h-4 w-4"
                />
                <label htmlFor="telephonic" className="text-sm text-gray-700">Discussed Telephonically (no email available)</label>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addExternal}
                disabled={!extForm.firstName.trim() || !extForm.lastName.trim() || (!extForm.email.trim() && !extForm.discussedTelephonically)}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add External Contact
              </Button>

              {externalNotifs.length > 0 && (
                <div className="space-y-2 mt-2">
                  {externalNotifs.map((n, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg bg-gray-50 border border-gray-200 px-3 py-2">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{n.firstName} {n.lastName}{n.company && <span className="text-gray-500 font-normal"> · {n.company}</span>}</p>
                        {n.email ? (
                          <p className="text-xs text-gray-500 flex items-center gap-1"><Mail className="h-3 w-3" />{n.email}</p>
                        ) : (
                          <p className="text-xs text-amber-600 flex items-center gap-1"><Phone className="h-3 w-3" />Discussed Telephonically</p>
                        )}
                      </div>
                      <button onClick={() => removeExternal(i)} className="text-gray-400 hover:text-gray-600 p-1"><X className="h-3.5 w-3.5" /></button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-between gap-3">
            <Button variant="outline" onClick={() => setActiveTab("checklist")}>Back</Button>
            <div className="flex gap-2">
              <Button variant="outline" disabled={saving} onClick={() => handleSubmit("draft")}>
                {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
                Save as Draft
              </Button>
              <Button disabled={saving} onClick={() => handleSubmit("pending_approval")}>
                {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
                Submit for Approval
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
