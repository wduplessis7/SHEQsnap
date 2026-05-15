"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const DAYS_OF_WEEK = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];

export default function NewSchedulePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [templates, setTemplates] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);

  const [form, setForm] = useState({
    templateId: "",
    assignType: "user" as "user" | "group",
    assignedToUserId: "",
    assignedToGroupId: "",
    startDate: "",
    dueTime: "17:00",
    recurrence: "ONCE",
    dayOfWeek: "MONDAY",
    dayOfMonth: "1",
    endDate: "",
  });

  useEffect(() => {
    async function loadOptions() {
      const [tmplRes, userRes, groupRes] = await Promise.all([
        fetch("/api/checklists/templates?isActive=true"),
        fetch("/api/admin/users"),
        fetch("/api/admin/groups"),
      ]);
      const tmplData = await tmplRes.json();
      setTemplates(tmplData.items ?? tmplData);
      if (userRes.ok) setUsers(await userRes.json());
      if (groupRes.ok) setGroups(await groupRes.json());
    }
    loadOptions();
  }, []);

  function setField(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.templateId) { setError("Please select a template"); return; }
    if (form.assignType === "user" && !form.assignedToUserId) { setError("Please select a user"); return; }
    if (form.assignType === "group" && !form.assignedToGroupId) { setError("Please select a group"); return; }
    if (!form.startDate) { setError("Start date is required"); return; }

    setSaving(true);
    setError("");

    const payload: any = {
      templateId: form.templateId,
      startDate: form.startDate,
      dueTime: form.dueTime,
      recurrence: form.recurrence,
    };
    if (form.assignType === "user") payload.assignedToUserId = form.assignedToUserId;
    else payload.assignedToGroupId = form.assignedToGroupId;
    if (form.recurrence === "WEEKLY") payload.dayOfWeek = form.dayOfWeek;
    if (form.recurrence === "MONTHLY") payload.dayOfMonth = parseInt(form.dayOfMonth);
    if (form.recurrence !== "ONCE" && form.endDate) payload.endDate = form.endDate;

    try {
      const res = await fetch("/api/checklists/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        router.push("/admin/checklists/schedules");
      } else {
        const err = await res.json();
        setError(err.error || "Failed to create schedule");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/admin/checklists/schedules">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Schedule</h1>
          <p className="text-gray-500 mt-1">Assign a checklist template on a recurring schedule</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Schedule Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Template *</Label>
              <Select value={form.templateId} onValueChange={(v) => setField("templateId", v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select a template..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Assign To *</Label>
              <div className="flex gap-2 mt-1">
                <Button
                  type="button"
                  variant={form.assignType === "user" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setField("assignType", "user")}
                >
                  User
                </Button>
                <Button
                  type="button"
                  variant={form.assignType === "group" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setField("assignType", "group")}
                >
                  Group
                </Button>
              </div>
            </div>

            {form.assignType === "user" ? (
              <div>
                <Label>User *</Label>
                <Select value={form.assignedToUserId} onValueChange={(v) => setField("assignedToUserId", v)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select a user..." />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.name} ({u.email})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div>
                <Label>Group *</Label>
                <Select value={form.assignedToGroupId} onValueChange={(v) => setField("assignedToGroupId", v)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select a group..." />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map((g) => (
                      <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date *</Label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setField("startDate", e.target.value)}
                  className="mt-1"
                  required
                />
              </div>
              <div>
                <Label>Due Time</Label>
                <Input
                  type="time"
                  value={form.dueTime}
                  onChange={(e) => setField("dueTime", e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label>Recurrence</Label>
              <Select value={form.recurrence} onValueChange={(v) => setField("recurrence", v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ONCE">Once</SelectItem>
                  <SelectItem value="DAILY">Daily</SelectItem>
                  <SelectItem value="WEEKLY">Weekly</SelectItem>
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.recurrence === "WEEKLY" && (
              <div>
                <Label>Day of Week</Label>
                <Select value={form.dayOfWeek} onValueChange={(v) => setField("dayOfWeek", v)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS_OF_WEEK.map((d) => (
                      <SelectItem key={d} value={d}>{d.charAt(0) + d.slice(1).toLowerCase()}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {form.recurrence === "MONTHLY" && (
              <div>
                <Label>Day of Month</Label>
                <Select value={form.dayOfMonth} onValueChange={(v) => setField("dayOfMonth", v)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 31 }, (_, i) => String(i + 1)).map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {form.recurrence !== "ONCE" && (
              <div>
                <Label>End Date (optional)</Label>
                <Input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setField("endDate", e.target.value)}
                  className="mt-1"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>}

        <div className="flex gap-3 justify-end">
          <Link href="/admin/checklists/schedules">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" disabled={saving}>
            {saving ? "Creating..." : "Create Schedule"}
          </Button>
        </div>
      </form>
    </div>
  );
}
