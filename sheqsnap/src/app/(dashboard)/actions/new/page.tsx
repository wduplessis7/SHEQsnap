"use client";

export const dynamic = "force-dynamic";


import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function NewActionPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nearMissId = searchParams.get("nearMissId");
  const incidentId = searchParams.get("incidentId");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);

  const [form, setForm] = useState({
    description: "",
    ownerId: "",
    assignedGroupId: "",
    priority: "MEDIUM",
    dueDate: "",
    linkedType: nearMissId ? "NEAR_MISS" : incidentId ? "INCIDENT" : "OTHER",
    nearMissId: nearMissId || "",
    incidentId: incidentId || "",
    escalationFlag: false,
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/users").then((r) => r.json()),
      fetch("/api/admin/groups").then((r) => r.json()),
    ]).then(([userList, groupList]) => {
      setUsers(userList.filter((u: any) => u.active));
      setGroups(groupList);
    }).catch(() => {});
  }, []);

  function setField(key: string, value: any) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          nearMissId: form.nearMissId || null,
          incidentId: form.incidentId || null,
          assignedGroupId: form.assignedGroupId || null,
          dueDate: form.dueDate || null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (nearMissId) {
          router.push(`/near-misses/${nearMissId}`);
        } else if (incidentId) {
          router.push(`/incidents/${incidentId}`);
        } else {
          router.push(`/actions/${data.id}`);
        }
      } else {
        const err = await res.json();
        setError(err.error || "Failed to create action");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/actions"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Action</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {nearMissId && "Linked to near miss"}
            {incidentId && "Linked to incident"}
            {!nearMissId && !incidentId && "Standalone action"}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Action Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Description *</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
                placeholder="Describe the corrective action required..."
                rows={4}
                required
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Priority *</Label>
                <Select value={form.priority} onValueChange={(v) => setField("priority", v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Due Date</Label>
                <Input type="date" value={form.dueDate} onChange={(e) => setField("dueDate", e.target.value)} className="mt-1" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Assignment</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Action Owner *</Label>
              <Select value={form.ownerId} onValueChange={(v) => setField("ownerId", v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select owner" /></SelectTrigger>
                <SelectContent>
                  {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Assign to Group</Label>
              <Select value={form.assignedGroupId || "none"} onValueChange={(v) => setField("assignedGroupId", v === "none" ? "" : v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Optional group" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No group</SelectItem>
                  {groups.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2 flex items-center gap-3">
              <input
                type="checkbox"
                id="escalation"
                checked={form.escalationFlag}
                onChange={(e) => setField("escalationFlag", e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600"
              />
              <label htmlFor="escalation" className="text-sm font-medium text-gray-700">
                Flag for escalation (high-visibility actions)
              </label>
            </div>
          </CardContent>
        </Card>

        {(nearMissId || incidentId) && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <p className="text-sm text-blue-700">
                <span className="font-medium">Linked record: </span>
                {nearMissId ? `Near Miss (${nearMissId})` : `Incident (${incidentId})`}
              </p>
            </CardContent>
          </Card>
        )}

        {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3"><p className="text-sm text-red-600">{error}</p></div>}

        <div className="flex gap-3 justify-end">
          <Link href="/actions"><Button variant="outline">Cancel</Button></Link>
          <Button type="submit" disabled={saving || !form.ownerId}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "Saving..." : "Create Action"}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function NewActionPage() {
  return (
    <Suspense>
      <NewActionPageInner />
    </Suspense>
  );
}
