"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { ChevronLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

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

export default function EditLegalPositionPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role;

  const [position, setPosition] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState<FormState>({
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
  });

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/legal-positions/${id}`);
        if (res.ok) {
          const data = await res.json();
          setPosition(data);
          setForm({
            name: data.name ?? "",
            code: data.code ?? "",
            orgType: data.orgType ?? "",
            appointmentCategory: data.appointmentCategory ?? "",
            description: data.description ?? "",
            isStatutory: data.isStatutory ?? false,
            termLengthMonths: data.termLengthMonths != null ? String(data.termLengthMonths) : "",
            renewalAllowed: data.renewalAllowed ?? true,
            minQualifications: data.minQualifications ?? "",
            eligibilityRules: data.eligibilityRules ?? "",
            requiresResolution: data.requiresResolution ?? false,
            requiresBackgroundCheck: data.requiresBackgroundCheck ?? false,
            requiresDeclarationOfInterest: data.requiresDeclarationOfInterest ?? false,
            requiresGazettePublication: data.requiresGazettePublication ?? false,
            complianceNotes: data.complianceNotes ?? "",
          });
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
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
      const res = await fetch(`/api/admin/legal-positions/${id}`, {
        method: "PUT",
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
        setError(data.error || "Failed to save changes.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive() {
    const reason = window.prompt(
      `Archive "${position?.name}"?\n\nPlease provide a reason for archiving:`
    );
    if (reason === null) return;
    setArchiving(true);
    try {
      const res = await fetch(`/api/admin/legal-positions/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (res.ok) {
        router.push("/admin/legal-positions");
      } else {
        alert("Failed to archive position.");
      }
    } finally {
      setArchiving(false);
    }
  }

  if (userRole && userRole !== "ADMIN") {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Access denied.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!position) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Position not found.</p>
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
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">Edit Legal Position</h1>
            {!position.isActive && (
              <Badge className="bg-gray-100 text-gray-500 border-gray-200">Archived</Badge>
            )}
          </div>
          <p className="text-gray-500 mt-0.5 text-sm">{position.name} &mdash; {position.code}</p>
        </div>
      </div>

      {/* Archived info banner */}
      {!position.isActive && (
        <div className="rounded-md bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          <p className="font-medium">This position has been archived</p>
          {position.archivedAt && (
            <p className="mt-0.5">Archived on {formatDate(position.archivedAt)}</p>
          )}
          {position.archivedReason && (
            <p className="mt-0.5">Reason: {position.archivedReason}</p>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
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
            ].map(({ id: fieldId, label }) => (
              <div key={fieldId} className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id={fieldId}
                  checked={form[fieldId as keyof FormState] as boolean}
                  onChange={(e) => setField(fieldId as keyof FormState, e.target.checked as any)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <label htmlFor={fieldId} className="text-sm font-medium text-gray-700">{label}</label>
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

        <div className="flex gap-3 justify-between">
          {/* Archive button on the left */}
          <div>
            {position.isActive && (
              <Button
                type="button"
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                onClick={handleArchive}
                disabled={archiving}
              >
                {archiving ? "Archiving..." : "Archive Position"}
              </Button>
            )}
          </div>

          {/* Save / Cancel on the right */}
          <div className="flex gap-3">
            <Link href="/admin/legal-positions">
              <Button variant="outline" type="button">Cancel</Button>
            </Link>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
