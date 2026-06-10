"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, RefreshCw, GraduationCap, Stethoscope } from "lucide-react";
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

const MEDICAL_TYPES = [
  "Pre-Employment Medical",
  "Periodic Medical (Annual)",
  "Exit Medical",
  "Fitness Certificate",
  "Audiometry Test",
  "Spirometry Test",
  "Vision Test",
  "Occupational Health Assessment",
  "Other",
];

const MEDICAL_RESULTS = [
  "Fit for Duty",
  "Fit with Restrictions",
  "Temporarily Unfit",
  "Unfit for Duty",
  "Pending Results",
];

interface Department {
  id: string;
  name: string;
}

export default function NewInductionPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [validityOption, setValidityOption] = useState("none");
  const [recordType, setRecordType] = useState<"induction" | "medical">("induction");

  const [form, setForm] = useState({
    inducteeName: "",
    inducteeType: "employee",
    inductionType: "",
    conductedByName: "",
    conductedDate: new Date().toISOString().slice(0, 10),
    expiryDate: "",
    departmentId: "",
    notes: "",
    medicalResult: "",
    medicalProvider: "",
  });

  useEffect(() => {
    fetch("/api/admin/departments")
      .then((r) => r.json())
      .then((d) => setDepartments(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  // Reset type when switching record type
  const handleRecordTypeChange = (type: "induction" | "medical") => {
    setRecordType(type);
    setForm((f) => ({ ...f, inductionType: "", medicalResult: "", medicalProvider: "" }));
    setValidityOption(type === "medical" ? "12" : "none");
  };

  const isMedical = recordType === "medical";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.inducteeName.trim()) { setError("Name is required."); return; }
    if (!form.inductionType) { setError(`${isMedical ? "Medical" : "Induction"} type is required.`); return; }
    if (!form.conductedByName.trim()) { setError(`${isMedical ? "Examining doctor" : "Conducted by"} is required.`); return; }
    if (!form.conductedDate) { setError("Date is required."); return; }
    setError("");
    setSaving(true);

    const payload: any = {
      recordType,
      inducteeName: form.inducteeName.trim(),
      inducteeType: form.inducteeType,
      inductionType: form.inductionType,
      conductedByName: form.conductedByName.trim(),
      conductedDate: form.conductedDate,
      departmentId: form.departmentId || null,
      notes: form.notes.trim() || null,
    };

    if (isMedical) {
      payload.medicalResult = form.medicalResult || null;
      payload.medicalProvider = form.medicalProvider.trim() || null;
    }

    if (validityOption === "custom" && form.expiryDate) {
      payload.expiryDate = form.expiryDate;
    } else if (validityOption !== "none" && validityOption !== "custom") {
      payload.validityMonths = Number(validityOption);
    }

    try {
      const res = await fetch("/api/inductions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        setError(err.error || "Failed to save record.");
        return;
      }
      const created = await res.json();
      router.push(`/inductions/${created.id}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/inductions">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            New {isMedical ? "Medical Record" : "Induction"}
          </h1>
          <p className="text-gray-500 mt-0.5">
            {isMedical ? "Log an occupational health / medical fitness record" : "Log a new employee or contractor induction"}
          </p>
        </div>
      </div>

      {/* Record type toggle */}
      <div className="flex gap-2 p-1 bg-gray-100 rounded-lg w-fit">
        <button
          type="button"
          onClick={() => handleRecordTypeChange("induction")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            !isMedical ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <GraduationCap className="h-4 w-4" />
          Induction
        </button>
        <button
          type="button"
          onClick={() => handleRecordTypeChange("medical")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            isMedical ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <Stethoscope className="h-4 w-4" />
          Medical
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {isMedical ? "Patient Details" : "Inductee Details"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="inducteeName">
                  {isMedical ? "Employee / Contractor Name" : "Inductee Name"} *
                </Label>
                <Input
                  id="inducteeName"
                  value={form.inducteeName}
                  onChange={(e) => setForm((f) => ({ ...f, inducteeName: e.target.value }))}
                  placeholder="Full name"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inducteeType">Type *</Label>
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
              <Label htmlFor="inductionType">
                {isMedical ? "Medical Type" : "Induction Type"} *
              </Label>
              <Select
                value={form.inductionType}
                onValueChange={(v) => setForm((f) => ({ ...f, inductionType: v }))}
              >
                <SelectTrigger id="inductionType">
                  <SelectValue placeholder={`Select ${isMedical ? "medical" : "induction"} type`} />
                </SelectTrigger>
                <SelectContent>
                  {(isMedical ? MEDICAL_TYPES : INDUCTION_TYPES).map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {isMedical ? "Medical Details" : "Induction Details"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="conductedByName">
                  {isMedical ? "Examining Doctor / OMP" : "Conducted By"} *
                </Label>
                <Input
                  id="conductedByName"
                  value={form.conductedByName}
                  onChange={(e) => setForm((f) => ({ ...f, conductedByName: e.target.value }))}
                  placeholder={isMedical ? "Dr. / OMP name" : "Name of person conducting"}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="conductedDate">
                  {isMedical ? "Examination Date" : "Conducted Date"} *
                </Label>
                <Input
                  id="conductedDate"
                  type="date"
                  value={form.conductedDate}
                  onChange={(e) => setForm((f) => ({ ...f, conductedDate: e.target.value }))}
                />
              </div>
            </div>

            {isMedical && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="medicalResult">Medical Result</Label>
                  <Select
                    value={form.medicalResult || "none"}
                    onValueChange={(v) => setForm((f) => ({ ...f, medicalResult: v === "none" ? "" : v }))}
                  >
                    <SelectTrigger id="medicalResult">
                      <SelectValue placeholder="Select result" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Not recorded</SelectItem>
                      {MEDICAL_RESULTS.map((r) => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="medicalProvider">Clinic / Health Provider</Label>
                  <Input
                    id="medicalProvider"
                    value={form.medicalProvider}
                    onChange={(e) => setForm((f) => ({ ...f, medicalProvider: e.target.value }))}
                    placeholder="e.g. Medirite Occupational Health"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="validity">
                  {isMedical ? "Certificate Validity" : "Validity Period"}
                </Label>
                <Select value={validityOption} onValueChange={setValidityOption}>
                  <SelectTrigger id="validity">
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
                  <Label htmlFor="expiryDate">
                    {isMedical ? "Certificate Expiry Date" : "Expiry Date"}
                  </Label>
                  <Input
                    id="expiryDate"
                    type="date"
                    value={form.expiryDate}
                    onChange={(e) => setForm((f) => ({ ...f, expiryDate: e.target.value }))}
                  />
                </div>
              )}
            </div>

            {departments.length > 0 && (
              <div className="space-y-1.5">
                <Label htmlFor="departmentId">Department</Label>
                <Select
                  value={form.departmentId || "none"}
                  onValueChange={(v) => setForm((f) => ({ ...f, departmentId: v === "none" ? "" : v }))}
                >
                  <SelectTrigger id="departmentId">
                    <SelectValue placeholder="Select department (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No department</SelectItem>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="notes">
                {isMedical ? "Restrictions / Notes" : "Notes"}
              </Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder={isMedical ? "Any restrictions, observations, or follow-up notes..." : "Any additional notes..."}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">{error}</p>
        )}

        <div className="flex justify-end gap-3">
          <Link href="/inductions">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" disabled={saving}>
            {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
            {isMedical ? "Save Medical Record" : "Save Induction"}
          </Button>
        </div>
      </form>
    </div>
  );
}
