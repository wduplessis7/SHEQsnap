"use client";

export const dynamic = "force-dynamic";


import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Loader2, WifiOff } from "lucide-react";
import { useOfflineSubmitWithFiles } from "@/hooks/useOfflineSubmit";
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

  const { submitWithFiles, isOnline } = useOfflineSubmitWithFiles();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const [form, setForm] = useState({
    description: "",
    ownerId: "",
    assignedGroupId: "",
    priority: "MEDIUM",
    actionClass: "NORMAL",
    dueDate: "",
    linkedType: nearMissId ? "NEAR_MISS" : incidentId ? "INCIDENT" : "OTHER",
    nearMissId: nearMissId || "",
    incidentId: incidentId || "",
    escalationFlag: false,
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/users").then((r) => r.json()),
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
      const result = await submitWithFiles({
        url: "/api/actions",
        body: {
          ...form,
          nearMissId: form.nearMissId || null,
          incidentId: form.incidentId || null,
          assignedGroupId: form.assignedGroupId || null,
          dueDate: form.dueDate || null,
        },
        entityType: "Action",
        description: `Action: ${form.description.slice(0, 60)}`,
        files: selectedFiles.map((file) => ({ file, entityIdField: "actionId" })),
      });

      if (result.offline) {
        router.push("/actions?saved=offline");
        return;
      }
      if (!result.ok) {
        setError(result.error ?? "Failed to create action");
        return;
      }
      const data = result.data;
      if (nearMissId) {
        router.push(`/near-misses/${nearMissId}`);
      } else if (incidentId) {
        router.push(`/incidents/${incidentId}`);
      } else {
        router.push(`/actions/${data.id}`);
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
                <Label>Action Class *</Label>
                <Select value={form.actionClass} onValueChange={(v) => {
                  setField("actionClass", v);
                  if (v !== "NORMAL") setField("dueDate", "");
                }}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">Class A — Same day</SelectItem>
                    <SelectItem value="B">Class B — Within 3 days</SelectItem>
                    <SelectItem value="C">Class C — Within 7 days</SelectItem>
                    <SelectItem value="NORMAL">Normal — Custom date</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Due Date{form.actionClass === "NORMAL" ? " *" : " (auto-set by class)"}</Label>
              <Input
                type="date"
                value={form.dueDate}
                onChange={(e) => setField("dueDate", e.target.value)}
                className="mt-1"
                disabled={form.actionClass !== "NORMAL"}
                placeholder={form.actionClass === "A" ? "Today" : form.actionClass === "B" ? "+3 days" : form.actionClass === "C" ? "+7 days" : ""}
              />
              {form.actionClass !== "NORMAL" && (
                <p className="text-xs text-gray-400 mt-1">
                  {form.actionClass === "A" && "Due date will be set to end of today"}
                  {form.actionClass === "B" && "Due date will be set to 3 days from now"}
                  {form.actionClass === "C" && "Due date will be set to 7 days from now"}
                </p>
              )}
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

        <Card>
          <CardHeader><CardTitle className="text-base">Attachments</CardTitle></CardHeader>
          <CardContent>
            <input
              type="file"
              multiple
              accept="image/*,application/pdf,.doc,.docx"
              onChange={(e) => setSelectedFiles(Array.from(e.target.files ?? []))}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
            />
            {selectedFiles.length > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                {selectedFiles.length} file{selectedFiles.length > 1 ? "s" : ""} selected
                {!isOnline && " — will upload when reconnected"}
              </p>
            )}
          </CardContent>
        </Card>

        {!isOnline && (
          <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
            <WifiOff className="h-4 w-4 flex-shrink-0" />
            <span>You are offline — this action will be saved locally and submitted automatically when you reconnect</span>
          </div>
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
