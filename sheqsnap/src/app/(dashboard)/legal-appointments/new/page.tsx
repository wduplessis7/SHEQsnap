"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Save, Loader2, CheckCircle, ShieldCheck, FileText, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const APPOINTMENT_TYPES = ["PERMANENT", "ACTING", "INTERIM", "TEMPORARY", "FIXED_TERM", "EX_OFFICIO"];
const STEPS = ["Position & Entity", "Appointee Details", "Appointment Details"];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {STEPS.map((label, idx) => {
        const stepNum = idx + 1;
        const done = stepNum < current;
        const active = stepNum === current;
        return (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-colors",
                  done && "bg-blue-600 border-blue-600 text-white",
                  active && "bg-white border-blue-600 text-blue-600",
                  !done && !active && "bg-white border-gray-300 text-gray-400"
                )}
              >
                {done ? <CheckCircle className="h-4 w-4" /> : stepNum}
              </div>
              <span className={cn("text-xs mt-1 font-medium whitespace-nowrap", active ? "text-blue-600" : done ? "text-blue-500" : "text-gray-400")}>
                {label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div className={cn("flex-1 h-0.5 mx-2 mb-4", done ? "bg-blue-600" : "bg-gray-200")} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function ComplianceCard({ position }: { position: any }) {
  if (!position) return null;
  const flags = [
    position.isStatutory && { label: "Statutory appointment", icon: ShieldCheck, color: "text-blue-600" },
    position.requiresResolution && { label: "Board resolution required", icon: FileText, color: "text-amber-600" },
    position.requiresBackgroundCheck && { label: "Background check required", icon: AlertCircle, color: "text-orange-600" },
    position.requiresDeclarationOfInterest && { label: "Declaration of interest required", icon: FileText, color: "text-purple-600" },
    position.requiresGazettePublication && { label: "Gazette publication required", icon: FileText, color: "text-red-600" },
  ].filter(Boolean) as { label: string; icon: any; color: string }[];

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-blue-800">Compliance Requirements — {position.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5 pt-0">
        {flags.length === 0 ? (
          <p className="text-sm text-blue-600">No special compliance requirements.</p>
        ) : (
          flags.map(({ label, icon: Icon, color }) => (
            <div key={label} className="flex items-center gap-2">
              <Icon className={cn("h-4 w-4 flex-shrink-0", color)} />
              <span className="text-sm text-blue-800">{label}</span>
            </div>
          ))
        )}
        {position.complianceNotes && (
          <p className="text-xs text-blue-700 mt-2 border-t border-blue-200 pt-2">{position.complianceNotes}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function NewLegalAppointmentPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [positions, setPositions] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [selectedPosition, setSelectedPosition] = useState<any>(null);
  const [idType, setIdType] = useState<"id" | "passport">("id");

  const [form, setForm] = useState({
    // Step 1
    positionId: "",
    entityName: "",
    departmentId: "",
    // Step 2
    fullName: "",
    idNumber: "",
    passportNumber: "",
    nationality: "South African",
    gender: "",
    race: "",
    disability: "",
    email: "",
    phone: "",
    address: "",
    taxNumber: "",
    employeeNumber: "",
    // Step 3
    appointmentDate: new Date().toISOString().split("T")[0],
    effectiveDate: new Date().toISOString().split("T")[0],
    endDate: "",
    termLengthMonths: "",
    appointmentType: "",
    appointmentAuthority: "",
    resolutionRef: "",
    gazetteNumber: "",
    complianceNotes: "",
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/legal-positions").then((r) => r.json()),
      fetch("/api/admin/departments").then((r) => r.json()),
    ]).then(([posData, depts]) => {
      const posArray = Array.isArray(posData) ? posData : (posData.data ?? []);
      setPositions(posArray.filter((p: any) => p.isActive !== false));
      setDepartments(Array.isArray(depts) ? depts : []);
    }).catch(() => {});
  }, []);

  function setField(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handlePositionChange(id: string) {
    setField("positionId", id);
    const pos = positions.find((p) => p.id === id) ?? null;
    setSelectedPosition(pos);
  }

  function validateStep(): string {
    if (step === 1) {
      if (!form.positionId) return "Please select a position.";
      if (!form.entityName.trim()) return "Entity Name is required.";
    }
    if (step === 2) {
      if (!form.fullName.trim()) return "Full Name is required.";
      if (!form.nationality.trim()) return "Nationality is required.";
    }
    if (step === 3) {
      if (!form.appointmentDate) return "Appointment Date is required.";
      if (!form.effectiveDate) return "Effective Date is required.";
      if (!form.appointmentType) return "Appointment Type is required.";
    }
    return "";
  }

  function handleNext() {
    const err = validateStep();
    if (err) { setError(err); return; }
    setError("");
    setStep((s) => s + 1);
  }

  function handleBack() {
    setError("");
    setStep((s) => s - 1);
  }

  async function handleSubmit() {
    const err = validateStep();
    if (err) { setError(err); return; }
    setError("");
    setSaving(true);
    try {
      const payload: any = {
        positionId: form.positionId,
        entityName: form.entityName,
        departmentId: form.departmentId || null,
        fullName: form.fullName,
        nationality: form.nationality,
        gender: form.gender || null,
        race: form.race || null,
        disability: form.disability || null,
        email: form.email || null,
        phone: form.phone || null,
        address: form.address || null,
        taxNumber: form.taxNumber || null,
        employeeNumber: form.employeeNumber || null,
        appointmentDate: form.appointmentDate,
        effectiveDate: form.effectiveDate,
        endDate: form.endDate || null,
        termLengthMonths: form.termLengthMonths ? Number(form.termLengthMonths) : null,
        appointmentType: form.appointmentType,
        appointmentAuthority: form.appointmentAuthority || null,
        resolutionRef: form.resolutionRef || null,
        gazetteNumber: form.gazetteNumber || null,
        complianceNotes: form.complianceNotes || null,
      };
      if (idType === "id") {
        payload.idNumber = form.idNumber || null;
      } else {
        payload.passportNumber = form.passportNumber || null;
      }

      const res = await fetch("/api/legal-appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        router.push(`/legal-appointments/${data.id}`);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to create appointment.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/legal-appointments"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Legal Appointment</h1>
          <p className="text-gray-500 text-sm mt-0.5">Register a new statutory or legal appointment</p>
        </div>
      </div>

      <StepIndicator current={step} />

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Step 1 */}
      {step === 1 && (
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Position & Entity</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Position *</Label>
                <Select value={form.positionId || "none"} onValueChange={(v) => handlePositionChange(v === "none" ? "" : v)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select a position" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select position...</SelectItem>
                    {positions.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}{p.code ? ` (${p.code})` : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedPosition && <ComplianceCard position={selectedPosition} />}

              <div>
                <Label>Entity Name *</Label>
                <Input
                  value={form.entityName}
                  onChange={(e) => setField("entityName", e.target.value)}
                  placeholder="Company, municipality, or organisation name"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Department <span className="text-gray-400 font-normal">(optional)</span></Label>
                <Select value={form.departmentId || "none"} onValueChange={(v) => setField("departmentId", v === "none" ? "" : v)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select department" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No department</SelectItem>
                    {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Appointee Details</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label>Full Name *</Label>
              <Input value={form.fullName} onChange={(e) => setField("fullName", e.target.value)} placeholder="Full legal name" className="mt-1" />
            </div>

            <div className="md:col-span-2">
              <Label>Identity Document</Label>
              <div className="flex gap-4 mt-1 mb-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="idType" checked={idType === "id"} onChange={() => setIdType("id")} />
                  <span className="text-sm">SA ID Number</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="idType" checked={idType === "passport"} onChange={() => setIdType("passport")} />
                  <span className="text-sm">Passport Number</span>
                </label>
              </div>
              {idType === "id" ? (
                <Input value={form.idNumber} onChange={(e) => setField("idNumber", e.target.value)} placeholder="SA ID Number (13 digits)" className="mt-1" maxLength={13} />
              ) : (
                <Input value={form.passportNumber} onChange={(e) => setField("passportNumber", e.target.value)} placeholder="Passport number" className="mt-1" />
              )}
            </div>

            <div>
              <Label>Nationality *</Label>
              <Input value={form.nationality} onChange={(e) => setField("nationality", e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Gender</Label>
              <Select value={form.gender || "none"} onValueChange={(v) => setField("gender", v === "none" ? "" : v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select gender" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select gender...</SelectItem>
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
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select race" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select race...</SelectItem>
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
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select disability status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select...</SelectItem>
                  <SelectItem value="No disability">No disability</SelectItem>
                  <SelectItem value="Has disability">Has disability</SelectItem>
                  <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setField("email", e.target.value)} placeholder="email@example.com" className="mt-1" />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setField("phone", e.target.value)} placeholder="+27 xx xxx xxxx" className="mt-1" />
            </div>
            <div>
              <Label>Tax Number</Label>
              <Input value={form.taxNumber} onChange={(e) => setField("taxNumber", e.target.value)} placeholder="SARS tax reference" className="mt-1" />
            </div>
            <div>
              <Label>Employee Number</Label>
              <Input value={form.employeeNumber} onChange={(e) => setField("employeeNumber", e.target.value)} placeholder="Internal employee number" className="mt-1" />
            </div>
            <div className="md:col-span-2">
              <Label>Address</Label>
              <Textarea value={form.address} onChange={(e) => setField("address", e.target.value)} placeholder="Residential or postal address" rows={3} className="mt-1" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3 */}
      {step === 3 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Appointment Details</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Appointment Date *</Label>
              <Input type="date" value={form.appointmentDate} onChange={(e) => setField("appointmentDate", e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Effective Date *</Label>
              <Input type="date" value={form.effectiveDate} onChange={(e) => setField("effectiveDate", e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>End Date <span className="text-gray-400 font-normal">(optional)</span></Label>
              <Input type="date" value={form.endDate} onChange={(e) => setField("endDate", e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Term Length (Months) <span className="text-gray-400 font-normal">(optional)</span></Label>
              <Input type="number" min={1} value={form.termLengthMonths} onChange={(e) => setField("termLengthMonths", e.target.value)} placeholder="e.g. 24" className="mt-1" />
            </div>
            <div className="md:col-span-2">
              <Label>Appointment Type *</Label>
              <Select value={form.appointmentType || "none"} onValueChange={(v) => setField("appointmentType", v === "none" ? "" : v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select type...</SelectItem>
                  {APPOINTMENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Appointment Authority <span className="text-gray-400 font-normal">(optional)</span></Label>
              <Input value={form.appointmentAuthority} onChange={(e) => setField("appointmentAuthority", e.target.value)} placeholder="Minister, Board, etc." className="mt-1" />
            </div>
            <div>
              <Label>Resolution Reference <span className="text-gray-400 font-normal">(optional)</span></Label>
              <Input value={form.resolutionRef} onChange={(e) => setField("resolutionRef", e.target.value)} placeholder="Board resolution ref" className="mt-1" />
            </div>
            {selectedPosition?.requiresGazettePublication && (
              <div>
                <Label>Gazette Number</Label>
                <Input value={form.gazetteNumber} onChange={(e) => setField("gazetteNumber", e.target.value)} placeholder="Government gazette number" className="mt-1" />
              </div>
            )}
            <div className="md:col-span-2">
              <Label>Compliance Notes <span className="text-gray-400 font-normal">(optional)</span></Label>
              <Textarea value={form.complianceNotes} onChange={(e) => setField("complianceNotes", e.target.value)} placeholder="Any additional compliance notes..." rows={3} className="mt-1" />
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between pt-2">
        <div>
          {step > 1 && (
            <Button variant="outline" onClick={handleBack}><ArrowLeft className="h-4 w-4" />Back</Button>
          )}
          {step === 1 && (
            <Link href="/legal-appointments"><Button variant="outline">Cancel</Button></Link>
          )}
        </div>
        <div>
          {step < 3 && (
            <Button onClick={handleNext}>Next<ArrowRight className="h-4 w-4" /></Button>
          )}
          {step === 3 && (
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "Creating..." : "Create Appointment"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
