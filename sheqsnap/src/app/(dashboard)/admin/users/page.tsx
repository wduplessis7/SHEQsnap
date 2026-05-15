"use client";

export const dynamic = "force-dynamic";


import { useEffect, useState } from "react";
import { Plus, Edit, UserX, UserCheck, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

const ROLES = ["ADMIN", "SAFETY_OFFICER", "MANAGER", "REPORTER", "VIEWER", "CONTRACTOR"];
const ROLE_COLORS: Record<string, any> = {
  ADMIN: "destructive",
  SAFETY_OFFICER: "default",
  MANAGER: "secondary",
  REPORTER: "outline",
  VIEWER: "secondary",
  CONTRACTOR: "outline",
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "REPORTER",
    departmentId: "",
    active: true,
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [userRes, deptRes] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/admin/departments"),
      ]);
      setUsers(await userRes.json());
      setDepartments(await deptRes.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  function openCreate() {
    setEditingUser(null);
    setForm({ name: "", email: "", password: "", role: "REPORTER", departmentId: "", active: true });
    setError("");
    setDialogOpen(true);
  }

  function openEdit(user: any) {
    setEditingUser(user);
    setForm({ name: user.name, email: user.email, password: "", role: user.role, departmentId: user.departmentId || "", active: user.active });
    setError("");
    setDialogOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const url = editingUser ? `/api/admin/users/${editingUser.id}` : "/api/admin/users";
      const method = editingUser ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, departmentId: form.departmentId || null }),
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

  async function handleToggleActive(user: any) {
    if (!confirm(`${user.active ? "Deactivate" : "Activate"} user ${user.name}?`)) return;
    await fetch(`/api/admin/users/${user.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...user, active: !user.active }),
    });
    fetchData();
  }

  function setField(key: string, value: any) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-500 mt-1">{users.length} users</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={fetchData}><RefreshCw className="h-4 w-4" /></Button>
          <Button onClick={openCreate}><Plus className="h-4 w-4" />Add User</Button>
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Role</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Department</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-8"><RefreshCw className="h-5 w-5 animate-spin mx-auto text-gray-400" /></td></tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{user.name}</td>
                    <td className="px-4 py-3 text-gray-600">{user.email}</td>
                    <td className="px-4 py-3">
                      <Badge variant={ROLE_COLORS[user.role] || "secondary"}>{user.role.replace(/_/g, " ")}</Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{user.department?.name || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${user.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {user.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(user)}><Edit className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className={`h-7 w-7 ${user.active ? "text-red-400 hover:text-red-600" : "text-green-400 hover:text-green-600"}`} onClick={() => handleToggleActive(user)}>
                          {user.active ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingUser ? "Edit User" : "New User"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Full Name *</Label><Input value={form.name} onChange={(e) => setField("name", e.target.value)} className="mt-1" required /></div>
            <div><Label>Email *</Label><Input type="email" value={form.email} onChange={(e) => setField("email", e.target.value)} className="mt-1" required /></div>
            <div><Label>{editingUser ? "New Password (leave blank to keep)" : "Password *"}</Label><Input type="password" value={form.password} onChange={(e) => setField("password", e.target.value)} className="mt-1" placeholder="Password123!" /></div>
            <div><Label>Role *</Label>
              <Select value={form.role} onValueChange={(v) => setField("role", v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{r.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Department</Label>
              <Select value={form.departmentId || "none"} onValueChange={(v) => setField("departmentId", v === "none" ? "" : v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No department</SelectItem>
                  {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {editingUser && (
              <div className="flex items-center gap-3">
                <input type="checkbox" id="active" checked={form.active} onChange={(e) => setField("active", e.target.checked)} className="h-4 w-4" />
                <label htmlFor="active" className="text-sm">Account Active</label>
              </div>
            )}
            {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : editingUser ? "Save Changes" : "Create User"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
