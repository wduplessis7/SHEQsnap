"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { Plus, Edit, RefreshCw, Building2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

export default function AdminCompaniesPage() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    registrationNo: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    siteId: "",
    responsiblePersonId: "",
    active: true,
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [compRes, deptRes, userRes] = await Promise.all([
        fetch("/api/admin/companies"),
        fetch("/api/admin/departments"),
        fetch("/api/admin/users"),
      ]);
      if (compRes.ok) setCompanies(await compRes.json());
      if (deptRes.ok) setDepartments(await deptRes.json());
      if (userRes.ok) {
        const allUsers = await userRes.json();
        setUsers(allUsers.filter((u: any) => ["SAFETY_OFFICER", "MANAGER", "ADMIN"].includes(u.role)));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  function openCreate() {
    setEditingCompany(null);
    setForm({ name: "", registrationNo: "", contactName: "", contactEmail: "", contactPhone: "", siteId: "", responsiblePersonId: "", active: true });
    setError("");
    setDialogOpen(true);
  }

  function openEdit(company: any) {
    setEditingCompany(company);
    setForm({
      name: company.name,
      registrationNo: company.registrationNo || "",
      contactName: company.contactName || "",
      contactEmail: company.contactEmail || "",
      contactPhone: company.contactPhone || "",
      siteId: company.siteId || "",
      responsiblePersonId: company.responsiblePersonId || "",
      active: company.active,
    });
    setError("");
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setError("Company name is required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const url = editingCompany ? `/api/admin/companies/${editingCompany.id}` : "/api/admin/companies";
      const method = editingCompany ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          siteId: form.siteId || null,
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

  async function handleDelete(company: any) {
    if (!confirm(`Deactivate company "${company.name}"? This will not delete existing records.`)) return;
    await fetch(`/api/admin/companies/${company.id}`, { method: "DELETE" });
    fetchData();
  }

  function setField(key: string, value: any) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contractor Companies</h1>
          <p className="text-gray-500 mt-1">{companies.length} {companies.length !== 1 ? "companies" : "company"}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={fetchData}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" />
            Add Company
          </Button>
        </div>
      </div>

      <Card>
        {companies.length === 0 && !loading ? (
          <div className="py-16 flex flex-col items-center gap-3 text-gray-400">
            <Building2 className="h-12 w-12 text-gray-300" />
            <p className="text-lg font-medium">No companies added yet</p>
            <Button size="sm" onClick={openCreate} className="mt-2">
              <Plus className="h-4 w-4 mr-1" />
              Add First Company
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Company</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Registration No</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Contact</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Responsible Person</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Site</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Contractors</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8">
                      <RefreshCw className="h-5 w-5 animate-spin mx-auto text-gray-400" />
                    </td>
                  </tr>
                ) : (
                  companies.map((company) => (
                    <tr key={company.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{company.name}</td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">{company.registrationNo || "—"}</td>
                      <td className="px-4 py-3 text-gray-600">
                        <div>
                          {company.contactName && <p className="font-medium text-gray-800">{company.contactName}</p>}
                          {company.contactEmail && <p className="text-xs text-gray-500">{company.contactEmail}</p>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{company.responsiblePerson?.name || "—"}</td>
                      <td className="px-4 py-3 text-gray-600">{company.site?.name || "—"}</td>
                      <td className="px-4 py-3 text-gray-600">{company._count?.contractors ?? 0}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${company.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                          {company.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(company)}>
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={() => handleDelete(company)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingCompany ? "Edit Company" : "New Company"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <div>
              <Label>Company Name *</Label>
              <Input value={form.name} onChange={(e) => setField("name", e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Registration Number</Label>
              <Input value={form.registrationNo} onChange={(e) => setField("registrationNo", e.target.value)} className="mt-1" placeholder="2023/012345/07" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Contact Name</Label>
                <Input value={form.contactName} onChange={(e) => setField("contactName", e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Contact Phone</Label>
                <Input value={form.contactPhone} onChange={(e) => setField("contactPhone", e.target.value)} className="mt-1" />
              </div>
            </div>
            <div>
              <Label>Contact Email</Label>
              <Input type="email" value={form.contactEmail} onChange={(e) => setField("contactEmail", e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Assigned Site / Department</Label>
              <Select value={form.siteId} onValueChange={(v) => setField("siteId", v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="No site" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No site</SelectItem>
                  {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Responsible Person (Internal)</Label>
              <Select value={form.responsiblePersonId} onValueChange={(v) => setField("responsiblePersonId", v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="No responsible person" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name} ({u.role.replace(/_/g, " ")})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {editingCompany && (
              <div className="flex items-center gap-3">
                <input type="checkbox" id="company-active" checked={form.active} onChange={(e) => setField("active", e.target.checked)} className="h-4 w-4" />
                <label htmlFor="company-active" className="text-sm">Company Active</label>
              </div>
            )}
            {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : editingCompany ? "Save Changes" : "Create Company"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
