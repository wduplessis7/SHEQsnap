"use client";

export const dynamic = "force-dynamic";


import { useEffect, useState } from "react";
import { Plus, Edit, Trash2, RefreshCw, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export default function AdminGroupsPage() {
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", description: "" });

  const fetchData = async () => {
    setLoading(true);
    try {
      setGroups(await fetch("/api/admin/groups").then((r) => r.json()));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  function openCreate() {
    setEditingGroup(null);
    setForm({ name: "", description: "" });
    setError("");
    setDialogOpen(true);
  }

  function openEdit(group: any) {
    setEditingGroup(group);
    setForm({ name: group.name, description: group.description || "" });
    setError("");
    setDialogOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const url = editingGroup ? `/api/admin/groups/${editingGroup.id}` : "/api/admin/groups";
      const method = editingGroup ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (res.ok) {
        await fetchData();
        setDialogOpen(false);
      } else {
        const err = await res.json();
        setError(err.error || "Failed to save");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(group: any) {
    if (!confirm(`Delete group "${group.name}"?`)) return;
    await fetch(`/api/admin/groups/${group.id}`, { method: "DELETE" });
    fetchData();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Groups</h1>
          <p className="text-gray-500 mt-1">{groups.length} groups</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={fetchData}><RefreshCw className="h-4 w-4" /></Button>
          <Button onClick={openCreate}><Plus className="h-4 w-4" />Add Group</Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><RefreshCw className="h-6 w-6 animate-spin text-gray-400" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((group) => (
            <Card key={group.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-500" />
                    <h3 className="font-semibold">{group.name}</h3>
                  </div>
                  {group.description && <p className="text-sm text-gray-500 mt-1">{group.description}</p>}
                  <p className="text-xs text-gray-400 mt-2">{group._count?.members || 0} members</p>
                  {group.members?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {group.members.slice(0, 5).map((m: any) => (
                        <span key={m.user.id} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{m.user.name}</span>
                      ))}
                      {group.members.length > 5 && <span className="text-xs text-gray-400">+{group.members.length - 5} more</span>}
                    </div>
                  )}
                </div>
                <div className="flex gap-1 ml-2">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(group)}><Edit className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={() => handleDelete(group)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingGroup ? "Edit Group" : "New Group"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Group Name *</Label><Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className="mt-1" required /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} className="mt-1" rows={3} /></div>
            {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : editingGroup ? "Save Changes" : "Create Group"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
