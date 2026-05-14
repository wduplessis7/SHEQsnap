"use client";

export const dynamic = "force-dynamic";


import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { INCIDENT_TYPES, INJURY_TYPES } from "@/lib/utils";

export default function NewIncidentPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [departments, setDepartments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  const [form, setForm] = useState({
    dateOfIncident: new Date().toISOString().split("T")[0],
    dateReported: new Date().toISOString().split("T")[0],
    departmentId: "",
    location: "",
    incidentType: "",
    description: "",
    personsInvolved: "",
    injuryType: "None",
    severityLevel: "LOW",
    rootCause: "",
    immediateAction: "",
    investigationNotes: "",
    assignedUserId: "",
    dueDate: "",
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/departments").then((r) => r.json()),
      fetch("/api/admin/users").then((r) => r.json()),
    ]).then(([depts, users]) => {
      setDepartments(depts);
      setUsers(users.filter((u: any) => u.active));
    }).catch(() => {});
  }, []);

  function setField(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          departmentId: form.departmentId || null,
          assignedUserId: form.assignedUserId || null,
          dueDate: form.dueDate || null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        router.push(`/incidents/${data.id}`);
      } else {
        const err = await res.json();
        setError(err.error || "Failed to create incident");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/incidents"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Report Incident</h1>
          <p className="text-gray-500 text-sm mt-0.5">Record a new safety incident</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Basic Information</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Date of Incident *</Label>
              <Input type="date" value={form.dateOfIncident} onChange={(e) => setField("dateOfIncident", e.target.value)} required className="mt-1" />
            </div>
            <div>
              <Label>Date Reported</Label>
              <Input type="date" value={form.dateReported} onChange={(e) => setField("dateReported", e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Department</Label>
              <Select value={form.departmentId} onValueChange={(v) => setField("departmentId", v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No department</SelectItem>
                  {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Incident Type *</Label>
              <Select value={form.incidentType} onValueChange={(v) => setField("incidentType", v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {INCIDENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label>Location *</Label>
              <Input value={form.location} onChange={(e) => setField("location", e.target.value)} placeholder="Specific location of incident" required className="mt-1" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Incident Details</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Severity Level *</Label>
              <Select value={form.severityLevel} onValueChange={(v) => setField("severityLevel", v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Injury Type</Label>
              <Select value={form.injuryType} onValueChange={(v) => setField("injuryType", v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INJURY_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label>Description *</Label>
              <Textarea value={form.description} onChange={(e) => setField("description", e.target.value)} placeholder="Detailed description of the incident..." rows={4} required className="mt-1" />
            </div>
            <div className="md:col-span-2">
              <Label>Persons Involved</Label>
              <Textarea value={form.personsInvolved} onChange={(e) => setField("personsInvolved", e.target.value)} placeholder="Names and roles of persons involved..." rows={2} className="mt-1" />
            </div>
            <div className="md:col-span-2">
              <Label>Immediate Action Taken</Label>
              <Textarea value={form.immediateAction} onChange={(e) => setField("immediateAction", e.target.value)} placeholder="Immediate corrective actions taken..." rows={3} className="mt-1" />
            </div>
            <div className="md:col-span-2">
              <Label>Root Cause</Label>
              <Textarea value={form.rootCause} onChange={(e) => setField("rootCause", e.target.value)} placeholder="Identified root cause..." rows={2} className="mt-1" />
            </div>
            <div className="md:col-span-2">
              <Label>Investigation Notes</Label>
              <Textarea value={form.investigationNotes} onChange={(e) => setField("investigationNotes", e.target.value)} placeholder="Investigation findings and notes..." rows={3} className="mt-1" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Assignment</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Assign To</Label>
              <Select value={form.assignedUserId} onValueChange={(v) => setField("assignedUserId", v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select assignee" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Unassigned</SelectItem>
                  {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Due Date</Label>
              <Input type="date" value={form.dueDate} onChange={(e) => setField("dueDate", e.target.value)} className="mt-1" />
            </div>
          </CardContent>
        </Card>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <Link href="/incidents"><Button variant="outline">Cancel</Button></Link>
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "Saving..." : "Submit Incident"}
          </Button>
        </div>
      </form>
    </div>
  );
}
