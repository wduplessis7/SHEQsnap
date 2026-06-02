"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ORG_TYPES = [
  { value: "PRIVATE_COMPANY", label: "Private Company" },
  { value: "PUBLIC_COMPANY", label: "Public Company" },
  { value: "SOE", label: "SOE" },
  { value: "MUNICIPALITY", label: "Municipality" },
  { value: "GOVERNMENT_ENTITY", label: "Government Entity" },
  { value: "NPO", label: "NPO" },
  { value: "TRUST", label: "Trust" },
  { value: "BOARD", label: "Board" },
  { value: "COMMITTEE", label: "Committee" },
  { value: "OTHER", label: "Other" },
];

const APPOINTMENT_CATEGORIES = [
  { value: "BOARD", label: "Board" },
  { value: "EXECUTIVE", label: "Executive" },
  { value: "STATUTORY", label: "Statutory" },
  { value: "COMMITTEE", label: "Committee" },
  { value: "REGULATORY", label: "Regulatory" },
  { value: "OTHER", label: "Other" },
];

interface QuickFillPreset {
  label: string;
  data: Partial<FormState>;
}

const QUICK_FILL_PRESETS: QuickFillPreset[] = [
  {
    label: "Director (Companies Act)",
    data: {
      code: "DIR",
      orgType: "PRIVATE_COMPANY",
      appointmentCategory: "BOARD",
      isStatutory: true,
      requiresResolution: true,
    },
  },
  {
    label: "Company Secretary (Companies Act)",
    data: {
      code: "COSEC",
      orgType: "PUBLIC_COMPANY",
      isStatutory: true,
    },
  },
  {
    label: "Municipal Manager",
    data: {
      code: "MUNMGR",
      orgType: "MUNICIPALITY",
      isStatutory: true,
      requiresResolution: true,
      requiresBackgroundCheck: true,
      requiresGazettePublication: true,
    },
  },
  {
    label: "CFO",
    data: {
      code: "CFO",
      orgType: "PRIVATE_COMPANY",
      appointmentCategory: "EXECUTIVE",
    },
  },
  {
    label: "Board Chairperson",
    data: {
      code: "CHAIR",
      appointmentCategory: "BOARD",
      requiresResolution: true,
    },
  },
  {
    label: "Trustee",
    data: {
      code: "TRUSTEE",
      orgType: "TRUST",
      isStatutory: true,
    },
  },
];

interface FormState {
  name: string;
  code: string;
  orgType: string;
  appointmentCategory: string;
  description: string;
  isStatutory: boolean;
  termLengthMonths: string;
  renewalAllowed: boolean;
  minQualifications: string;
  eligibilityRules: string;
  requiresResolution: boolean;
  requiresBackgroundCheck: boolean;
  requiresDeclarationOfInterest: boolean;
  requiresGazettePublication: boolean;
  complianceNotes: string;
}

const defaultForm: FormState = {
  name: "",
  code: "",
  orgType: "",
  appointmentCategory: "",
  description: "",
  isStatutory: false,
  termLengthMonths: "",
  renewalAllowed: true,
  minQualifications: "",
  eligibilityRules: "",
  requiresResolution: false,
  requiresBackgroundCheck: false,
  requiresDeclarationOfInterest: false,
  requiresGazettePublication: false,
  complianceNotes: "",
};

export default function NewLegalPositionPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role;

  const [form, setForm] = useState<FormState>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function applyPreset(presetLabel: string) {
    if (presetLabel === "none") return;
    const preset = QUICK_FILL_PRESETS.find((p) => p.label === presetLabel);
    if (!preset) return;
    setForm((prev) => ({ ...prev, ...preset.data }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError("Position Name is required."); return; }
    if (!form.code.trim()) { setError("Position Code is required."); return; }
    if (!form.orgType) { setError("Organization Type is required."); return; }
    if (!form.appointmentCategory) { setError("Appointment Category is required."); return; }

    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/legal-positions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          termLengthMonths: form.termLengthMonths ? parseInt(form.termLengthMonths, 10) : null,
          minQualifications: form.minQualifications || null,
          eligibilityRules: form.eligibilityRules || null,
          description: form.description || null,
          complianceNotes: form.complianceNotes || null,
        }),
      });
      if (res.ok) {
        router.push("/admin/legal-positions");
      } else {
        const data = await res.json();
        setError(data.error || "Failed to create position.");
      }
    } finally {
      setSaving(false);
    }
  }

  if (userRole && userRole !== "ADMIN") {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Access denied.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/admin/legal-positions">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Legal Position</h1>
          <p className="text-gray-500 mt-0.5 text-sm">Define a statutory or governance appointment position</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Quick Fill */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">SA Statutory Quick Fill</CardTitle>
          </CardHeader>
          <CardContent>
            <Select onValueChange={applyPreset}>
              <SelectTrigger>
                <SelectValue placeholder="Select a preset to auto-fill fields..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Select a preset —</SelectItem>
                {QUICK_FILL_PRESETS.map((p) => (
                  <SelectItem key={p.label} value={p.label}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-400 mt-2">
              Selecting a preset will populate the fields below. You can still edit all values after.
            </p>
          </CardContent>
        </Card>

        {/* Core Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Position Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Position Name *</label>
                <Input
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                  placeholder="e.g. Director"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Position Code *</label>
                <Input
                  value={form.code}
                  onChange={(e) => setField("code", e.target.value)}
                  onBlur={(e) => setField("code", e.target.value.toUpperCase())}
                  placeholder="e.g. DIR"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Organization Type *</label>
                <Select value={form.orgType || "none"} onValueChange={(v) => setField("orgType", v === "none" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select org type..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select org type...</SelectItem>
                    {ORG_TYPES.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Appointment Category *</label>
                <Select value={form.appointmentCategory || "none"} onValueChange={(v) => setField("appointmentCategory", v === "none" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select category...</SelectItem>
                    {APPOINTMENT_CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
                rows={3}
                placeholder="Brief description of the position and its purpose..."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
          </CardContent>
        </Card>

        {/* Term & Statutory */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Term & Statutory Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="isStatutory"
                checked={form.isStatutory}
                onChange={(e) => setField("isStatutory", e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <label htmlFor="isStatutory" className="text-sm font-medium text-gray-700">
                Is Statutory Position
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Term Length (months)</label>
                <Input
                  type="number"
                  min={1}
                  value={form.termLengthMonths}
                  onChange={(e) => setField("termLengthMonths", e.target.value)}
                  placeholder="e.g. 36"
                />
              </div>
              <div className="flex items-center gap-3 mt-6">
                <input
                  type="checkbox"
                  id="renewalAllowed"
                  checked={form.renewalAllowed}
                  onChange={(e) => setField("renewalAllowed", e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <label htmlFor="renewalAllowed" className="text-sm font-medium text-gray-700">
                  Renewal Allowed
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Qualifications & Eligibility */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Qualifications & Eligibility</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Min Qualifications</label>
              <textarea
                value={form.minQualifications}
                onChange={(e) => setField("minQualifications", e.target.value)}
                rows={3}
                placeholder="Minimum qualifications required for this position..."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Eligibility Rules</label>
              <textarea
                value={form.eligibilityRules}
                onChange={(e) => setField("eligibilityRules", e.target.value)}
                rows={3}
                placeholder="Rules determining eligibility for this position..."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
          </CardContent>
        </Card>

        {/* Compliance Requirements */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Compliance Requirements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { id: "requiresResolution", label: "Requires Resolution" },
              { id: "requiresBackgroundCheck", label: "Requires Background Check" },
              { id: "requiresDeclarationOfInterest", label: "Requires Declaration of Interest" },
              { id: "requiresGazettePublication", label: "Requires Government Gazette Publication" },
            ].map(({ id, label }) => (
              <div key={id} className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id={id}
                  checked={form[id as keyof FormState] as boolean}
                  onChange={(e) => setField(id as keyof FormState, e.target.checked as any)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <label htmlFor={id} className="text-sm font-medium text-gray-700">{label}</label>
              </div>
            ))}

            <div className="pt-2">
              <label className="text-sm font-medium text-gray-700 block mb-1">Compliance Notes</label>
              <textarea
                value={form.complianceNotes}
                onChange={(e) => setField("complianceNotes", e.target.value)}
                rows={3}
                placeholder="Additional compliance notes or references..."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
          </CardContent>
        </Card>

        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <Link href="/admin/legal-positions">
            <Button variant="outline" type="button">Cancel</Button>
          </Link>
          <Button type="submit" disabled={saving}>
            {saving ? "Creating..." : "Create Position"}
          </Button>
        </div>
      </form>
    </div>
  );
}
