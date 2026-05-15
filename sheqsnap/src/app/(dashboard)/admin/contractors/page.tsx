"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { RefreshCw, Edit, HardHat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export default function AdminContractorsPage() {
  const [contractors, setContractors] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingContractor, setEditingContractor] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    companyId: "",
    responsiblePersonId: "",
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ctrRes, compRes, userRes] = await Promise.all([
        fetch("/api/admin/contractors"),
        fetch("/api/admin/companies"),
        fetch("/api/admin/users"),
      ]);
      if (ctrRes.ok) setContractors(await ctrRes.json());
      if (compRes.ok) setCompanies(await compRes.json());
      if (userRes.ok) {
        const all = await userRes.json();
        setUsers(all.filter((u: any) => ["SAFETY_OFFICER", "MANAGER", "ADMIN"].includes(u.role)));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  function openEdit(contractor: any) {
    setEditingContractor(contractor);
    setForm({
      companyId: contractor.companyId || "",
      responsiblePersonId: contractor.responsiblePersonId || "",
    });
    setError("");
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!editingContractor) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/users/${editingContractor.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingContractor.name,
          email: editingContractor.email,
          role: editingContractor.role,
          active: editingContractor.active,
          companyId: form.companyId || null,
          responsiblePersonId: form.responsiblePersonId || null,
        }),
      });
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

  function setField(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contractor Users</h1>
          <p className="text-gray-500 mt-1">{contractors.length} contractor{contractors.length !== 1 ? "s" : ""}</p>
        </div>
        <Button variant="outline" size="icon" onClick={fetchData}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <Card>
        {contractors.length === 0 && !loading ? (
          <div className="py-16 flex flex-col items-center gap-3 text-gray-400">
            <HardHat className="h-12 w-12 text-gray-300" />
            <p className="text-lg font-medium">No contractor users found</p>
            <p className="text-sm">Create a user with role CONTRACTOR via User Management.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Company</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Department</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Responsible Person</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8">
                      <RefreshCw className="h-5 w-5 animate-spin mx-auto text-gray-400" />
                    </td>
                  </tr>
                ) : (
                  contractors.map((contractor) => (
                    <tr key={contractor.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{contractor.name}</td>
                      <td className="px-4 py-3 text-gray-600">{contractor.email}</td>
                      <td className="px-4 py-3 text-gray-600">{contractor.company?.name || <span className="text-orange-500 text-xs">Not assigned</span>}</td>
                      <td className="px-4 py-3 text-gray-600">{contractor.department?.name || "—"}</td>
                      <td className="px-4 py-3 text-gray-600">{contractor.responsiblePerson?.name || <span className="text-orange-500 text-xs">Not assigned</span>}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${contractor.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                          {contractor.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(contractor)}>
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Contractor: {editingContractor?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Company</Label>
              <Select value={form.companyId || "none"} onValueChange={(v) => setField("companyId", v === "none" ? "" : v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="No company" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No company</SelectItem>
                  {companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Responsible Person (Internal Approver)</Label>
              <Select value={form.responsiblePersonId || "none"} onValueChange={(v) => setField("responsiblePersonId", v === "none" ? "" : v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="No responsible person" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name} ({u.role.replace(/_/g, " ")})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
