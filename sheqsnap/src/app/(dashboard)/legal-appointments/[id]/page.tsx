"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Edit, Save, X, Loader2, AlertTriangle,
  Upload, Trash2, Plus, ShieldCheck, FileText, CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate, formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

// ── Constants ──────────────────────────────────────────────────────────────────
const APPOINTMENT_TYPES = ["PERMANENT", "ACTING", "INTERIM", "TEMPORARY", "FIXED_TERM", "EX_OFFICIO"];

const DOCUMENT_TYPES = [
  "APPOINTMENT_LETTER", "ACCEPTANCE_LETTER", "RESOLUTION", "ID_COPY", "CV",
  "QUALIFICATION_CERTIFICATES", "SECURITY_CLEARANCE", "DISCLOSURE_FORM",
  "DECLARATION_OF_INTERESTS", "GAZETTE_NOTICE", "OTHER",
];

const CONFLICT_TYPES = [
  "FINANCIAL_INTEREST", "DIRECTORSHIP", "SHAREHOLDING", "PARTNERSHIP",
  "TRUST", "FAMILY_RELATIONSHIP", "BUSINESS_RELATIONSHIP", "GOVERNMENT_CONTRACT",
];

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  ACTIVE: "bg-green-100 text-green-700",
  SUSPENDED: "bg-yellow-100 text-yellow-800",
  TERMINATED: "bg-red-100 text-red-700",
  EXPIRED: "bg-red-100 text-red-700",
  RESIGNED: "bg-orange-100 text-orange-700",
  RENEWED: "bg-blue-100 text-blue-700",
};

const CONFLICT_STATUS_COLORS: Record<string, string> = {
  DISCLOSED: "bg-orange-100 text-orange-700",
  MANAGED: "bg-yellow-100 text-yellow-800",
  RESOLVED: "bg-green-100 text-green-700",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium", STATUS_COLORS[status] ?? "bg-gray-100 text-gray-700")}>
      {status}
    </span>
  );
}

function formatDocType(t: string) {
  return t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function isWithin90Days(date: string | null) {
  if (!date) return false;
  const end = new Date(date);
  const now = new Date();
  const diff = end.getTime() - now.getTime();
  return diff > 0 && diff <= 90 * 24 * 60 * 60 * 1000;
}

// ── Compliance Card ────────────────────────────────────────────────────────────
function ComplianceCard({ position }: { position: any }) {
  if (!position) return null;
  const flags = [
    position.isStatutory && "Statutory appointment",
    position.requiresResolution && "Board resolution required",
    position.requiresBackgroundCheck && "Background check required",
    position.requiresDeclarationOfInterest && "Declaration of interest required",
    position.requiresGazettePublication && "Gazette publication required",
  ].filter(Boolean) as string[];

  return (
    <Card className="border-blue-100 bg-blue-50">
      <CardHeader className="pb-2 pt-3 px-4">
        <CardTitle className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Compliance — {position.name}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 px-4 pb-3 space-y-1">
        {flags.length === 0 ? (
          <p className="text-sm text-blue-600">No special compliance requirements.</p>
        ) : flags.map((f) => (
          <div key={f} className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
            <span className="text-sm text-blue-800">{f}</span>
          </div>
        ))}
        {position.complianceNotes && (
          <p className="text-xs text-blue-600 mt-2 pt-2 border-t border-blue-200">{position.complianceNotes}</p>
        )}
      </CardContent>
    </Card>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function LegalAppointmentDetailPage() {
  const { id } = useParams<{ id: string }>();

  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<any>({});
  const [positions, setPositions] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [idType, setIdType] = useState<"id" | "passport">("id");

  // Termination modal state
  const [showTerminateInput, setShowTerminateInput] = useState(false);
  const [terminationReason, setTerminationReason] = useState("");

  // Documents tab
  const [docUploading, setDocUploading] = useState(false);
  const [docError, setDocError] = useState("");
  const [docForm, setDocForm] = useState({ documentType: "", notes: "", expiryDate: "" });
  const docFileRef = useRef<HTMLInputElement>(null);

  // Conflicts tab
  const [conflictSaving, setConflictSaving] = useState(false);
  const [conflictError, setConflictError] = useState("");
  const [showConflictForm, setShowConflictForm] = useState(false);
  const [conflictForm, setConflictForm] = useState({
    declarationType: "", entityName: "", description: "",
    interestValue: "", relationshipType: "", managementPlan: "",
  });

  useEffect(() => {
    Promise.all([
      fetch(`/api/legal-appointments/${id}`).then((r) => r.json()),
      fetch("/api/admin/legal-positions").then((r) => r.json()),
      fetch("/api/admin/departments").then((r) => r.json()),
    ]).then(([data, posData, depts]) => {
      setItem(data);
      const posArray = Array.isArray(posData) ? posData : (posData.data ?? []);
      setPositions(posArray);
      setDepartments(Array.isArray(depts) ? depts : []);
      setIdType(data.passportNumber ? "passport" : "id");
      setForm({
        positionId: data.positionId || "",
        entityName: data.entityName || "",
        departmentId: data.departmentId || "",
        fullName: data.fullName || "",
        idNumber: data.idNumber || "",
        passportNumber: data.passportNumber || "",
        nationality: data.nationality || "South African",
        gender: data.gender || "",
        race: data.race || "",
        disability: data.disability || "",
        email: data.email || "",
        phone: data.phone || "",
        address: data.address || "",
        taxNumber: data.taxNumber || "",
        employeeNumber: data.employeeNumber || "",
        appointmentDate: data.appointmentDate?.split("T")[0] || "",
        effectiveDate: data.effectiveDate?.split("T")[0] || "",
        endDate: data.endDate?.split("T")[0] || "",
        termLengthMonths: data.termLengthMonths ?? "",
        appointmentType: data.appointmentType || "",
        appointmentAuthority: data.appointmentAuthority || "",
        resolutionRef: data.resolutionRef || "",
        gazetteNumber: data.gazetteNumber || "",
        complianceNotes: data.complianceNotes || "",
      });
    }).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  function setField(key: string, value: string) {
    setForm((prev: any) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const payload: any = {
        ...form,
        departmentId: form.departmentId || null,
        gender: form.gender || null,
        race: form.race || null,
        disability: form.disability || null,
        endDate: form.endDate || null,
        termLengthMonths: form.termLengthMonths ? Number(form.termLengthMonths) : null,
        appointmentAuthority: form.appointmentAuthority || null,
        resolutionRef: form.resolutionRef || null,
        gazetteNumber: form.gazetteNumber || null,
        complianceNotes: form.complianceNotes || null,
      };
      if (idType === "id") {
        payload.idNumber = form.idNumber || null;
        payload.passportNumber = null;
      } else {
        payload.passportNumber = form.passportNumber || null;
        payload.idNumber = null;
      }

      const res = await fetch(`/api/legal-appointments/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const updated = await res.json();
        setItem((prev: any) => ({ ...prev, ...updated, position: positions.find((p) => p.id === updated.positionId) ?? prev.position }));
        setEditing(false);
      } else {
        const err = await res.json();
        setError(err.error || "Failed to save.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(newStatus: string, extra?: Record<string, string>) {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/legal-appointments/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, ...extra }),
      });
      if (res.ok) {
        const updated = await res.json();
        setItem((prev: any) => ({ ...prev, status: updated.status, terminationReason: updated.terminationReason, terminatedAt: updated.terminatedAt }));
        setShowTerminateInput(false);
        setTerminationReason("");
      } else {
        const err = await res.json();
        setError(err.error || "Failed to update status.");
      }
    } finally {
      setSaving(false);
    }
  }

  // ── Document Upload ──────────────────────────────────────────────────────────
  async function handleDocUpload(e: React.FormEvent) {
    e.preventDefault();
    setDocError("");
    const file = docFileRef.current?.files?.[0];
    if (!file) { setDocError("Please select a file."); return; }
    if (!docForm.documentType) { setDocError("Please select a document type."); return; }

    setDocUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("documentType", docForm.documentType);
      if (docForm.notes) fd.append("notes", docForm.notes);
      if (docForm.expiryDate) fd.append("expiryDate", docForm.expiryDate);

      const res = await fetch(`/api/legal-appointments/${id}/documents`, { method: "POST", body: fd });
      if (res.ok) {
        const doc = await res.json();
        setItem((prev: any) => ({ ...prev, documents: [doc, ...(prev.documents || [])] }));
        setDocForm({ documentType: "", notes: "", expiryDate: "" });
        if (docFileRef.current) docFileRef.current.value = "";
      } else {
        const err = await res.json();
        setDocError(err.error || "Upload failed.");
      }
    } finally {
      setDocUploading(false);
    }
  }

  async function handleDocDelete(docId: string) {
    if (!confirm("Delete this document?")) return;
    const res = await fetch(`/api/legal-appointments/${id}/documents?docId=${docId}`, { method: "DELETE" });
    if (res.ok) {
      setItem((prev: any) => ({ ...prev, documents: prev.documents.filter((d: any) => d.id !== docId) }));
    }
  }

  // ── Conflict Declaration ─────────────────────────────────────────────────────
  async function handleConflictSubmit(e: React.FormEvent) {
    e.preventDefault();
    setConflictError("");
    if (!conflictForm.declarationType) { setConflictError("Declaration type is required."); return; }
    if (!conflictForm.description) { setConflictError("Description is required."); return; }

    setConflictSaving(true);
    try {
      const res = await fetch(`/api/legal-appointments/${id}/conflicts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          declarationType: conflictForm.declarationType,
          entityName: conflictForm.entityName || null,
          description: conflictForm.description,
          interestValue: conflictForm.interestValue || null,
          relationshipType: conflictForm.relationshipType || null,
          managementPlan: conflictForm.managementPlan || null,
        }),
      });
      if (res.ok) {
        const conflict = await res.json();
        setItem((prev: any) => ({ ...prev, conflicts: [conflict, ...(prev.conflicts || [])] }));
        setConflictForm({ declarationType: "", entityName: "", description: "", interestValue: "", relationshipType: "", managementPlan: "" });
        setShowConflictForm(false);
      } else {
        const err = await res.json();
        setConflictError(err.error || "Failed to add declaration.");
      }
    } finally {
      setConflictSaving(false);
    }
  }

  async function handleConflictStatus(conflictId: string, newStatus: string) {
    const res = await fetch(`/api/legal-appointments/${id}/conflicts?conflictId=${conflictId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      const updated = await res.json();
      setItem((prev: any) => ({
        ...prev,
        conflicts: prev.conflicts.map((c: any) => c.id === conflictId ? updated : c),
      }));
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
  if (!item || item.error) return <div className="text-center py-8 text-gray-500">Appointment not found.</div>;

  const expiringSoon = isWithin90Days(item.endDate) && item.status === "ACTIVE";
  const currentPosition = positions.find((p) => p.id === item.positionId) ?? item.position;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Breadcrumb + Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href="/legal-appointments"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-0.5">
              <Link href="/legal-appointments" className="hover:text-blue-600">Legal Appointments</Link>
              <span>/</span>
              <span className="text-gray-700">{item.referenceNo}</span>
            </div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{item.referenceNo}</h1>
              <StatusBadge status={item.status} />
              {expiringSoon && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                  <AlertTriangle className="h-3 w-3" />Expiring Soon
                </span>
              )}
            </div>
            <p className="text-gray-500 text-sm mt-0.5">{item.position?.name} — {item.entityName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!editing && <Button variant="outline" onClick={() => setEditing(true)}><Edit className="h-4 w-4" />Edit</Button>}
          {editing && (
            <>
              <Button variant="outline" onClick={() => { setEditing(false); setError(""); }}><X className="h-4 w-4" />Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Changes
              </Button>
            </>
          )}
        </div>
      </div>

      {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3"><p className="text-sm text-red-600">{error}</p></div>}

      {/* Status Actions */}
      {item.status !== "TERMINATED" && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-blue-700">Status Actions:</span>
              {item.status === "DRAFT" && (
                <Button size="sm" variant="outline" className="text-xs text-green-700 border-green-300 hover:bg-green-50" onClick={() => handleStatusChange("ACTIVE")} disabled={saving}>
                  <CheckCircle2 className="h-3.5 w-3.5" />Activate
                </Button>
              )}
              {item.status === "ACTIVE" && (
                <>
                  <Button size="sm" variant="outline" className="text-xs text-yellow-700 border-yellow-300 hover:bg-yellow-50" onClick={() => handleStatusChange("SUSPENDED")} disabled={saving}>Suspend</Button>
                  <Button size="sm" variant="outline" className="text-xs text-orange-700 border-orange-300 hover:bg-orange-50" onClick={() => handleStatusChange("RESIGNED")} disabled={saving}>Mark Resigned</Button>
                  <Button size="sm" variant="outline" className="text-xs text-red-700 border-red-300 hover:bg-red-50" onClick={() => setShowTerminateInput(true)} disabled={saving}>Terminate</Button>
                  <Button size="sm" variant="outline" className="text-xs text-blue-700 border-blue-300 hover:bg-blue-50" onClick={() => handleStatusChange("RENEWED")} disabled={saving}>Mark Renewed</Button>
                </>
              )}
              {item.status === "SUSPENDED" && (
                <Button size="sm" variant="outline" className="text-xs text-green-700 border-green-300 hover:bg-green-50" onClick={() => handleStatusChange("ACTIVE")} disabled={saving}>
                  <CheckCircle2 className="h-3.5 w-3.5" />Reactivate
                </Button>
              )}
            </div>
            {showTerminateInput && (
              <div className="mt-3 flex flex-col gap-2">
                <Textarea
                  placeholder="Reason for termination (required)..."
                  value={terminationReason}
                  onChange={(e) => setTerminationReason(e.target.value)}
                  rows={2}
                  className="text-sm"
                />
                <div className="flex gap-2">
                  <Button size="sm" variant="destructive" disabled={saving || !terminationReason.trim()} onClick={() => handleStatusChange("TERMINATED", { terminationReason })}>
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    Confirm Termination
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setShowTerminateInput(false); setTerminationReason(""); }}>Cancel</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      {item.status === "TERMINATED" && item.terminationReason && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-red-700">Terminated: <span className="font-normal">{item.terminationReason}</span></p>
            {item.terminatedAt && <p className="text-xs text-red-500 mt-0.5">on {formatDateTime(item.terminatedAt)}</p>}
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="documents">Documents ({item.documents?.length || 0})</TabsTrigger>
          <TabsTrigger value="conflicts">Conflicts ({item.conflicts?.length || 0})</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
        </TabsList>

        {/* ── DETAILS TAB ── */}
        <TabsContent value="details" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader><CardTitle className="text-base">Position & Entity</CardTitle></CardHeader>
                <CardContent>
                  {editing ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <Label>Position</Label>
                        <Select value={form.positionId || "none"} onValueChange={(v) => setField("positionId", v === "none" ? "" : v)}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {positions.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="md:col-span-2">
                        <Label>Entity Name</Label>
                        <Input value={form.entityName} onChange={(e) => setField("entityName", e.target.value)} className="mt-1" />
                      </div>
                      <div className="md:col-span-2">
                        <Label>Department</Label>
                        <Select value={form.departmentId || "none"} onValueChange={(v) => setField("departmentId", v === "none" ? "" : v)}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No department</SelectItem>
                            {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ) : (
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div><dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Reference</dt><dd className="mt-1 text-sm font-mono text-gray-900">{item.referenceNo}</dd></div>
                      <div><dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Position</dt><dd className="mt-1 text-sm text-gray-900">{item.position?.name || "—"}</dd></div>
                      <div><dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Entity</dt><dd className="mt-1 text-sm text-gray-900">{item.entityName}</dd></div>
                      <div><dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Department</dt><dd className="mt-1 text-sm text-gray-900">{item.department?.name || "—"}</dd></div>
                    </dl>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Appointee</CardTitle></CardHeader>
                <CardContent>
                  {editing ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <Label>Full Name</Label>
                        <Input value={form.fullName} onChange={(e) => setField("fullName", e.target.value)} className="mt-1" />
                      </div>
                      <div className="md:col-span-2">
                        <Label>Identity Document</Label>
                        <div className="flex gap-4 mt-1 mb-2">
                          <label className="flex items-center gap-2 cursor-pointer text-sm">
                            <input type="radio" name="idTypeEdit" checked={idType === "id"} onChange={() => setIdType("id")} />SA ID
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer text-sm">
                            <input type="radio" name="idTypeEdit" checked={idType === "passport"} onChange={() => setIdType("passport")} />Passport
                          </label>
                        </div>
                        {idType === "id"
                          ? <Input value={form.idNumber} onChange={(e) => setField("idNumber", e.target.value)} placeholder="SA ID Number" maxLength={13} />
                          : <Input value={form.passportNumber} onChange={(e) => setField("passportNumber", e.target.value)} placeholder="Passport Number" />}
                      </div>
                      <div><Label>Nationality</Label><Input value={form.nationality} onChange={(e) => setField("nationality", e.target.value)} className="mt-1" /></div>
                      <div>
                        <Label>Gender</Label>
                        <Select value={form.gender || "none"} onValueChange={(v) => setField("gender", v === "none" ? "" : v)}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Not specified</SelectItem>
                            <SelectItem value="Male">Male</SelectItem>
                            <SelectItem value="Female">Female</SelectItem>
                            <SelectItem value="Non-binary">Non-binary</SelectItem>
                            <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
                            <SelectItem value="Not disclosed">Not disclosed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Race (EE Reporting)</Label>
                        <Select value={form.race || "none"} onValueChange={(v) => setField("race", v === "none" ? "" : v)}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Not specified</SelectItem>
                            <SelectItem value="African">African</SelectItem>
                            <SelectItem value="Coloured">Coloured</SelectItem>
                            <SelectItem value="Indian/Asian">Indian/Asian</SelectItem>
                            <SelectItem value="White">White</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                            <SelectItem value="Not disclosed">Not disclosed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Disability Status</Label>
                        <Select value={form.disability || "none"} onValueChange={(v) => setField("disability", v === "none" ? "" : v)}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Not specified</SelectItem>
                            <SelectItem value="No disability">No disability</SelectItem>
                            <SelectItem value="Has disability">Has disability</SelectItem>
                            <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setField("email", e.target.value)} className="mt-1" /></div>
                      <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setField("phone", e.target.value)} className="mt-1" /></div>
                      <div><Label>Tax Number</Label><Input value={form.taxNumber} onChange={(e) => setField("taxNumber", e.target.value)} className="mt-1" /></div>
                      <div><Label>Employee Number</Label><Input value={form.employeeNumber} onChange={(e) => setField("employeeNumber", e.target.value)} className="mt-1" /></div>
                      <div className="md:col-span-2"><Label>Address</Label><Textarea value={form.address} onChange={(e) => setField("address", e.target.value)} rows={2} className="mt-1" /></div>
                    </div>
                  ) : (
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div><dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Full Name</dt><dd className="mt-1 text-sm text-gray-900">{item.fullName}</dd></div>
                      <div><dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Nationality</dt><dd className="mt-1 text-sm text-gray-900">{item.nationality}</dd></div>
                      {item.gender && <div><dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Gender</dt><dd className="mt-1 text-sm text-gray-900">{item.gender}</dd></div>}
                      {item.race && <div><dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Race (EE)</dt><dd className="mt-1 text-sm text-gray-900">{item.race}</dd></div>}
                      {item.disability && <div><dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Disability Status</dt><dd className="mt-1 text-sm text-gray-900">{item.disability}</dd></div>}
                      {item.idNumber && <div><dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">SA ID Number</dt><dd className="mt-1 text-sm font-mono text-gray-900">{item.idNumber}</dd></div>}
                      {item.passportNumber && <div><dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Passport Number</dt><dd className="mt-1 text-sm font-mono text-gray-900">{item.passportNumber}</dd></div>}
                      {item.email && <div><dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Email</dt><dd className="mt-1 text-sm text-gray-900">{item.email}</dd></div>}
                      {item.phone && <div><dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Phone</dt><dd className="mt-1 text-sm text-gray-900">{item.phone}</dd></div>}
                      {item.taxNumber && <div><dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Tax Number</dt><dd className="mt-1 text-sm text-gray-900">{item.taxNumber}</dd></div>}
                      {item.employeeNumber && <div><dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Employee Number</dt><dd className="mt-1 text-sm text-gray-900">{item.employeeNumber}</dd></div>}
                      {item.address && <div className="sm:col-span-2"><dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Address</dt><dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{item.address}</dd></div>}
                    </dl>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Appointment Details</CardTitle></CardHeader>
                <CardContent>
                  {editing ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div><Label>Appointment Date</Label><Input type="date" value={form.appointmentDate} onChange={(e) => setField("appointmentDate", e.target.value)} className="mt-1" /></div>
                      <div><Label>Effective Date</Label><Input type="date" value={form.effectiveDate} onChange={(e) => setField("effectiveDate", e.target.value)} className="mt-1" /></div>
                      <div><Label>End Date</Label><Input type="date" value={form.endDate} onChange={(e) => setField("endDate", e.target.value)} className="mt-1" /></div>
                      <div><Label>Term Length (Months)</Label><Input type="number" min={1} value={form.termLengthMonths} onChange={(e) => setField("termLengthMonths", e.target.value)} className="mt-1" /></div>
                      <div className="md:col-span-2">
                        <Label>Appointment Type</Label>
                        <Select value={form.appointmentType || "none"} onValueChange={(v) => setField("appointmentType", v === "none" ? "" : v)}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {APPOINTMENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div><Label>Appointment Authority</Label><Input value={form.appointmentAuthority} onChange={(e) => setField("appointmentAuthority", e.target.value)} className="mt-1" /></div>
                      <div><Label>Resolution Reference</Label><Input value={form.resolutionRef} onChange={(e) => setField("resolutionRef", e.target.value)} className="mt-1" /></div>
                      <div><Label>Gazette Number</Label><Input value={form.gazetteNumber} onChange={(e) => setField("gazetteNumber", e.target.value)} className="mt-1" /></div>
                      <div className="md:col-span-2"><Label>Compliance Notes</Label><Textarea value={form.complianceNotes} onChange={(e) => setField("complianceNotes", e.target.value)} rows={3} className="mt-1" /></div>
                    </div>
                  ) : (
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div><dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Appointment Date</dt><dd className="mt-1 text-sm text-gray-900">{formatDate(item.appointmentDate)}</dd></div>
                      <div><dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Effective Date</dt><dd className="mt-1 text-sm text-gray-900">{formatDate(item.effectiveDate)}</dd></div>
                      {item.endDate && <div><dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">End Date</dt><dd className={cn("mt-1 text-sm", expiringSoon ? "text-amber-700 font-medium" : "text-gray-900")}>{formatDate(item.endDate)}{expiringSoon && " (Expiring Soon)"}</dd></div>}
                      {item.termLengthMonths && <div><dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Term Length</dt><dd className="mt-1 text-sm text-gray-900">{item.termLengthMonths} months</dd></div>}
                      <div><dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Appointment Type</dt><dd className="mt-1 text-sm text-gray-900">{item.appointmentType?.replace(/_/g, " ") || "—"}</dd></div>
                      {item.appointmentAuthority && <div><dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Authority</dt><dd className="mt-1 text-sm text-gray-900">{item.appointmentAuthority}</dd></div>}
                      {item.resolutionRef && <div><dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Resolution Ref</dt><dd className="mt-1 text-sm text-gray-900">{item.resolutionRef}</dd></div>}
                      {item.gazetteNumber && <div><dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Gazette Number</dt><dd className="mt-1 text-sm text-gray-900">{item.gazetteNumber}</dd></div>}
                      {item.complianceNotes && <div className="sm:col-span-2"><dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Compliance Notes</dt><dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{item.complianceNotes}</dd></div>}
                    </dl>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <Card>
                <CardHeader><CardTitle className="text-sm">Record Info</CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div><p className="text-xs text-gray-500">Created By</p><p className="font-medium">{item.createdBy?.name || "—"}</p></div>
                  <div><p className="text-xs text-gray-500">Created</p><p className="text-gray-600">{formatDateTime(item.createdAt)}</p></div>
                  <div><p className="text-xs text-gray-500">Updated</p><p className="text-gray-600">{formatDateTime(item.updatedAt)}</p></div>
                  {item.terminatedBy && <div><p className="text-xs text-gray-500">Terminated By</p><p className="font-medium">{item.terminatedBy.name}</p></div>}
                </CardContent>
              </Card>
              <ComplianceCard position={currentPosition} />
            </div>
          </div>
        </TabsContent>

        {/* ── DOCUMENTS TAB ── */}
        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" />Upload Document</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleDocUpload} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label>Document Type *</Label>
                  <Select value={docForm.documentType || "none"} onValueChange={(v) => setDocForm((f) => ({ ...f, documentType: v === "none" ? "" : v }))}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select type..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Select type...</SelectItem>
                      {DOCUMENT_TYPES.map((t) => <SelectItem key={t} value={t}>{formatDocType(t)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>File *</Label>
                  <Input type="file" ref={docFileRef} className="mt-1" />
                </div>
                <div>
                  <Label>Expiry Date <span className="text-gray-400 font-normal">(optional)</span></Label>
                  <Input type="date" value={docForm.expiryDate} onChange={(e) => setDocForm((f) => ({ ...f, expiryDate: e.target.value }))} className="mt-1" />
                </div>
                <div className="md:col-span-2">
                  <Label>Notes <span className="text-gray-400 font-normal">(optional)</span></Label>
                  <Textarea value={docForm.notes} onChange={(e) => setDocForm((f) => ({ ...f, notes: e.target.value }))} rows={2} className="mt-1" />
                </div>
                {docError && <p className="md:col-span-2 text-sm text-red-600">{docError}</p>}
                <div className="md:col-span-2 flex justify-end">
                  <Button type="submit" disabled={docUploading}>
                    {docUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    {docUploading ? "Uploading..." : "Upload"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">File</th>
                    <th className="hidden md:table-cell text-left px-4 py-3 font-medium text-gray-600">Expiry</th>
                    <th className="hidden md:table-cell text-left px-4 py-3 font-medium text-gray-600">Uploaded By</th>
                    <th className="hidden sm:table-cell text-left px-4 py-3 font-medium text-gray-600">Date</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {(item.documents || []).length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-6 text-gray-400">No documents uploaded</td></tr>
                  ) : (
                    (item.documents || []).map((doc: any) => (
                      <tr key={doc.id} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-700">{formatDocType(doc.documentType)}</td>
                        <td className="px-4 py-3">
                          <a href={doc.fileUrl || `/api/uploads/${doc.fileName}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate max-w-xs block">
                            {doc.originalName}
                          </a>
                          {doc.notes && <p className="text-xs text-gray-400 mt-0.5">{doc.notes}</p>}
                        </td>
                        <td className="hidden md:table-cell px-4 py-3 text-gray-600">{doc.expiryDate ? formatDate(doc.expiryDate) : "—"}</td>
                        <td className="hidden md:table-cell px-4 py-3 text-gray-600">{doc.uploadedBy?.name || "—"}</td>
                        <td className="hidden sm:table-cell px-4 py-3 text-gray-500 text-xs">{formatDate(doc.uploadedAt)}</td>
                        <td className="px-4 py-3">
                          <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-600 h-7 w-7" onClick={() => handleDocDelete(doc.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* ── CONFLICTS TAB ── */}
        <TabsContent value="conflicts" className="space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setShowConflictForm((v) => !v)}>
              <Plus className="h-4 w-4" />{showConflictForm ? "Cancel" : "Add Declaration"}
            </Button>
          </div>

          {showConflictForm && (
            <Card>
              <CardHeader><CardTitle className="text-base">Conflict of Interest Declaration</CardTitle></CardHeader>
              <CardContent>
                <form onSubmit={handleConflictSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label>Declaration Type *</Label>
                    <Select value={conflictForm.declarationType || "none"} onValueChange={(v) => setConflictForm((f) => ({ ...f, declarationType: v === "none" ? "" : v }))}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select type..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Select type...</SelectItem>
                        {CONFLICT_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Entity Name <span className="text-gray-400 font-normal">(optional)</span></Label>
                    <Input value={conflictForm.entityName} onChange={(e) => setConflictForm((f) => ({ ...f, entityName: e.target.value }))} className="mt-1" />
                  </div>
                  <div>
                    <Label>Interest Value <span className="text-gray-400 font-normal">(optional)</span></Label>
                    <Input value={conflictForm.interestValue} onChange={(e) => setConflictForm((f) => ({ ...f, interestValue: e.target.value }))} placeholder="e.g. R250 000 or 15%" className="mt-1" />
                  </div>
                  <div>
                    <Label>Relationship Type <span className="text-gray-400 font-normal">(optional)</span></Label>
                    <Input value={conflictForm.relationshipType} onChange={(e) => setConflictForm((f) => ({ ...f, relationshipType: e.target.value }))} placeholder="e.g. Spouse, Director" className="mt-1" />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Description *</Label>
                    <Textarea value={conflictForm.description} onChange={(e) => setConflictForm((f) => ({ ...f, description: e.target.value }))} rows={3} className="mt-1" placeholder="Describe the conflict or interest..." />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Management Plan <span className="text-gray-400 font-normal">(optional)</span></Label>
                    <Textarea value={conflictForm.managementPlan} onChange={(e) => setConflictForm((f) => ({ ...f, managementPlan: e.target.value }))} rows={2} className="mt-1" placeholder="How will this conflict be managed?" />
                  </div>
                  {conflictError && <p className="md:col-span-2 text-sm text-red-600">{conflictError}</p>}
                  <div className="md:col-span-2 flex justify-end">
                    <Button type="submit" disabled={conflictSaving}>
                      {conflictSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      {conflictSaving ? "Saving..." : "Submit Declaration"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Description</th>
                    <th className="hidden md:table-cell text-left px-4 py-3 font-medium text-gray-600">Entity</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                    <th className="px-4 py-3 font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(item.conflicts || []).length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-6 text-gray-400">No conflict declarations</td></tr>
                  ) : (
                    (item.conflicts || []).map((c: any) => (
                      <tr key={c.id} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{c.declarationType.replace(/_/g, " ")}</td>
                        <td className="px-4 py-3 text-gray-600 max-w-xs">
                          <p className="line-clamp-2">{c.description}</p>
                          {c.interestValue && <p className="text-xs text-gray-400 mt-0.5">Value: {c.interestValue}</p>}
                        </td>
                        <td className="hidden md:table-cell px-4 py-3 text-gray-600">{c.entityName || "—"}</td>
                        <td className="px-4 py-3">
                          <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium", CONFLICT_STATUS_COLORS[c.status] ?? "bg-gray-100 text-gray-700")}>
                            {c.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1 flex-wrap">
                            {c.status === "DISCLOSED" && (
                              <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => handleConflictStatus(c.id, "MANAGED")}>Mark Managed</Button>
                            )}
                            {(c.status === "DISCLOSED" || c.status === "MANAGED") && (
                              <Button size="sm" variant="outline" className="text-xs h-7 text-green-700 border-green-300" onClick={() => handleConflictStatus(c.id, "RESOLVED")}>Mark Resolved</Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* ── AUDIT LOG TAB ── */}
        <TabsContent value="audit">
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Action</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Changed By</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Changes</th>
                  </tr>
                </thead>
                <tbody>
                  {(item.auditLogs || []).length === 0 ? (
                    <tr><td colSpan={4} className="text-center py-6 text-gray-400">No audit history</td></tr>
                  ) : (
                    (item.auditLogs || []).map((log: any) => (
                      <tr key={log.id} className="border-b last:border-0 hover:bg-gray-50 align-top">
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">{formatDateTime(log.timestamp)}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">{log.action}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{log.changedBy?.name || "System"}</td>
                        <td className="px-4 py-3 text-gray-500 max-w-sm">
                          {log.changes ? (
                            <pre className="text-xs bg-gray-50 rounded p-2 overflow-x-auto whitespace-pre-wrap break-words">
                              {typeof log.changes === "string"
                                ? (() => { try { return JSON.stringify(JSON.parse(log.changes), null, 2); } catch { return log.changes; } })()
                                : JSON.stringify(log.changes, null, 2)}
                            </pre>
                          ) : "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
