"use client";

export const dynamic = "force-dynamic";


import { useEffect, useState } from "react";
import { Plus, Edit, Trash2, RefreshCw, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export default function AdminDepartmentsPage() {
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", site: "" });

  const fetchData = async () => {
    setLoading(true);
    try {
      setDepartments(await fetch("/api/admin/departments").then((r) => r.json()));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  function openCreate() {
    setEditingDept(null);
    setForm({ name: "", site: "" });
    setError("");
    setDialogOpen(true);
  }

  function openEdit(dept: any) {
    setEditingDept(dept);
    setForm({ name: dept.name, site: dept.site || "" });
    setError("");
    setDialogOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const url = editingDept ? `/api/admin/departments/${editingDept.id}` : "/api/admin/departments";
      const method = editingDept ? "PUT" : "POST";
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

  async function handleDelete(dept: any) {
    if (!confirm(`Delete department "${dept.name}"?`)) return;
    await fetch(`/api/admin/departments/${dept.id}`, { method: "DELETE" });
    fetchData();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Departments & Sites</h1>
          <p className="text-gray-500 mt-1">{departments.length} departments</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={fetchData}><RefreshCw className="h-4 w-4" /></Button>
          <Button onClick={openCreate}><Plus className="h-4 w-4" />Add Department</Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><RefreshCw className="h-6 w-6 animate-spin text-gray-400" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map((dept) => (
            <Card key={dept.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-green-500" />
                    <h3 className="font-semibold">{dept.name}</h3>
                  </div>
                  {dept.site && <p className="text-sm text-gray-500 mt-1">{dept.site}</p>}
                  <div className="mt-2 flex gap-4 text-xs text-gray-400">
                    <span>{dept._count?.users || 0} users</span>
                    <span>{dept._count?.nearMisses || 0} near misses</span>
                    <span>{dept._count?.incidents || 0} incidents</span>
                  </div>
                </div>
                <div className="flex gap-1 ml-2">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(dept)}><Edit className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={() => handleDelete(dept)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingDept ? "Edit Department" : "New Department"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Department Name *</Label><Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className="mt-1" required /></div>
            <div><Label>Site / Location</Label><Input value={form.site} onChange={(e) => setForm((p) => ({ ...p, site: e.target.value }))} placeholder="e.g. Main Site, Branch Office" className="mt-1" /></div>
            {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : editingDept ? "Save Changes" : "Create Department"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
