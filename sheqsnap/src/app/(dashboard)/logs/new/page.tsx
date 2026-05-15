"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save } from "lucide-react";
import { useSession } from "next-auth/react";

const LOG_TYPES = [
  { value: "INSPECTION", label: "Inspection" },
  { value: "TOOLBOX_TALK", label: "Toolbox Talk" },
  { value: "MEETING_MINUTES", label: "Meeting Minutes" },
  { value: "SAFETY_FILE", label: "Safety File" },
  { value: "PERMIT", label: "Permit" },
  { value: "INCIDENT_LOG", label: "Incident Log" },
  { value: "OTHER", label: "Other" },
];

export default function NewLogEntryPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const user = (session?.user as any) || {};
  const isContractor = user.role === "CONTRACTOR";

  const [companies, setCompanies] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    title: "",
    logType: "",
    entryDate: new Date().toISOString().split("T")[0],
    companyId: "",
    departmentId: "",
    description: "",
  });

  useEffect(() => {
    const fetchMeta = async () => {
      const [compRes, deptRes] = await Promise.all([
        fetch("/api/admin/companies"),
        fetch("/api/admin/departments"),
      ]);
      if (compRes.ok) setCompanies(await compRes.json());
      if (deptRes.ok) setDepartments(await deptRes.json());
    };
    fetchMeta();
  }, []);

  function setField(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!form.title || !form.logType) {
      setError("Title and Log Type are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          companyId: form.companyId || null,
          departmentId: form.departmentId || null,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        router.push(`/logs/${created.id}`);
      } else {
        const err = await res.json();
        setError(err.error || "Failed to create log entry");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Link href="/logs">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Log Entry</h1>
          <p className="text-gray-500 mt-1">
            {isContractor
              ? "Your entry will be submitted for approval."
              : "Create a new safety register entry."}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Log Entry Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Title *</Label>
            <Input
              value={form.title}
              onChange={(e) => setField("title", e.target.value)}
              placeholder="e.g. Monthly Safety Inspection - Main Site"
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Log Type *</Label>
              <Select value={form.logType} onValueChange={(v) => setField("logType", v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {LOG_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Entry Date *</Label>
              <Input
                type="date"
                value={form.entryDate}
                onChange={(e) => setField("entryDate", e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          {!isContractor && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Company (optional)</Label>
                <Select value={form.companyId || "none"} onValueChange={(v) => setField("companyId", v === "none" ? "" : v)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="No company" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No company</SelectItem>
                    {companies.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Department (optional)</Label>
                <Select value={form.departmentId || "none"} onValueChange={(v) => setField("departmentId", v === "none" ? "" : v)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="No department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No department</SelectItem>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div>
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setField("description", e.target.value)}
              placeholder="Describe the log entry, findings, outcomes..."
              className="mt-1"
              rows={5}
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-1" />
              {saving ? "Saving..." : "Create Log Entry"}
            </Button>
            <Link href="/logs">
              <Button variant="outline">Cancel</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
