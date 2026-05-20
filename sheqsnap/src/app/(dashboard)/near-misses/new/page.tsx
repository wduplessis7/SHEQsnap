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
import { RISK_CATEGORIES, RISK_CATEGORY_GROUPS } from "@/lib/utils";

export default function NewNearMissPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [departments, setDepartments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  const [form, setForm] = useState({
    dateReported: new Date().toISOString().split("T")[0],
    departmentId: "",
    location: "",
    description: "",
    riskCategory: "",
    severityLevel: "LOW",
    immediateAction: "",
    assignedUserId: "",
    targetCloseDate: "",
    contractorsInvolved: false,
    contractorDetails: "",
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
      const res = await fetch("/api/near-misses", {
        method: "POST",
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
        const data = await res.json();
        router.push(`/near-misses/${data.id}`);
      } else {
        const err = await res.json();
        setError(err.error || "Failed to create near miss");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/near-misses">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Report Near Miss</h1>
          <p className="text-gray-500 text-sm mt-0.5">Report a new near miss incident</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Date Reported *</Label>
              <Input
                type="date"
                value={form.dateReported}
                onChange={(e) => setField("dateReported", e.target.value)}
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label>Department</Label>
              <Select value={form.departmentId || "none"} onValueChange={(v) => setField("departmentId", v === "none" ? "" : v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No department</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label>Location *</Label>
              <Input
                value={form.location}
                onChange={(e) => setField("location", e.target.value)}
                placeholder="e.g. Warehouse Bay 3, Production Line A"
                required
                className="mt-1"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Incident Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Risk Category *</Label>
              <Select value={form.riskCategory} onValueChange={(v) => setField("riskCategory", v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
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
              <Label>Severity Level *</Label>
              <Select value={form.severityLevel} onValueChange={(v) => setField("severityLevel", v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label>Description *</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
                placeholder="Describe what happened, what could have happened, and the circumstances..."
                rows={4}
                required
                className="mt-1"
              />
            </div>
            <div className="md:col-span-2">
              <Label>Immediate Action Taken</Label>
              <Textarea
                value={form.immediateAction}
                onChange={(e) => setField("immediateAction", e.target.value)}
                placeholder="Describe any immediate corrective actions taken..."
                rows={3}
                className="mt-1"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contractor Involvement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="contractorsInvolved"
                checked={form.contractorsInvolved}
                onChange={(e) => setForm((prev) => ({ ...prev, contractorsInvolved: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300 text-blue-600"
              />
              <Label htmlFor="contractorsInvolved">Contractors were involved in this near miss</Label>
            </div>
            {form.contractorsInvolved && (
              <div>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Assignment</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Assign To</Label>
              <Select value={form.assignedUserId || "none"} onValueChange={(v) => setField("assignedUserId", v === "none" ? "" : v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select assignee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Target Close Date</Label>
              <Input
                type="date"
                value={form.targetCloseDate}
                onChange={(e) => setField("targetCloseDate", e.target.value)}
                className="mt-1"
              />
            </div>
          </CardContent>
        </Card>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <Link href="/near-misses">
            <Button variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "Saving..." : "Submit Near Miss"}
          </Button>
        </div>
      </form>
    </div>
  );
}
