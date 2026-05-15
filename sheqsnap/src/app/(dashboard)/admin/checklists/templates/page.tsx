"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Plus, Search, Edit, Copy, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";

export default function ChecklistTemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (statusFilter !== "all") params.set("isActive", statusFilter === "active" ? "true" : "false");
    try {
      const res = await fetch(`/api/checklists/templates?${params}`);
      const data = await res.json();
      setTemplates(data.items ?? data);
      setTotal(data.total ?? data.length ?? 0);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  async function handleDuplicate(id: string) {
    if (!confirm("Duplicate this template?")) return;
    const res = await fetch(`/api/checklists/templates/${id}/duplicate`, { method: "POST" });
    if (res.ok) fetchTemplates();
    else alert("Failed to duplicate template");
  }

  async function handleDeactivate(tmpl: any) {
    if (!confirm(`${tmpl.isActive ? "Deactivate" : "Activate"} "${tmpl.title}"?`)) return;
    const res = await fetch(`/api/checklists/templates/${tmpl.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !tmpl.isActive }),
    });
    if (res.ok) fetchTemplates();
    else alert("Failed to update template status");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Checklist Templates</h1>
          <p className="text-gray-500 mt-1">{total} template{total !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={fetchTemplates}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Link href="/admin/checklists/templates/new">
            <Button>
              <Plus className="h-4 w-4" />
              New Template
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search templates..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Title</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Category</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Items</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-8">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto text-gray-400" />
                  </td>
                </tr>
              ) : templates.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-gray-400">
                    <ClipboardListIcon />
                    <p className="mt-2">No templates found</p>
                    <Link href="/admin/checklists/templates/new" className="mt-2 inline-block text-green-600 hover:underline text-sm">
                      Create your first template
                    </Link>
                  </td>
                </tr>
              ) : (
                templates.map((tmpl) => (
                  <tr key={tmpl.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{tmpl.title}</td>
                    <td className="px-4 py-3 text-gray-600">{tmpl.category?.replace(/_/g, " ") || "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{tmpl._count?.items ?? tmpl.items?.length ?? 0}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${tmpl.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {tmpl.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Link href={`/admin/checklists/templates/${tmpl.id}/edit`}>
                          <Button variant="ghost" size="sm" className="h-7 px-2">
                            <Edit className="h-3.5 w-3.5 mr-1" />
                            Edit
                          </Button>
                        </Link>
                        <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => handleDuplicate(tmpl.id)}>
                          <Copy className="h-3.5 w-3.5 mr-1" />
                          Duplicate
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`h-7 px-2 ${tmpl.isActive ? "text-red-500 hover:text-red-700" : "text-green-600 hover:text-green-700"}`}
                          onClick={() => handleDeactivate(tmpl)}
                        >
                          {tmpl.isActive ? "Deactivate" : "Activate"}
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
    </div>
  );
}

function ClipboardListIcon() {
  return (
    <svg className="h-10 w-10 mx-auto text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  );
}
