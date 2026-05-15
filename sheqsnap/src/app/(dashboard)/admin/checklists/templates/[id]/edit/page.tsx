"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Plus, X, ChevronUp, ChevronDown, ArrowLeft, RefreshCw } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const CATEGORIES = ["GENERAL", "INSPECTION", "TOOLBOX_TALK", "SAFETY_WALK", "PERMIT", "OTHER"];
const ITEM_TYPES = ["CHECKBOX", "YES_NO", "TEXT", "RATING", "PHOTO"];

interface ChecklistItem {
  id?: string;
  label: string;
  type: string;
  required: boolean;
  description: string;
}

function blankItem(): ChecklistItem {
  return { label: "", type: "CHECKBOX", required: false, description: "" };
}

export default function EditTemplatePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loadingTemplate, setLoadingTemplate] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "GENERAL",
    isActive: true,
  });
  const [items, setItems] = useState<ChecklistItem[]>([]);

  useEffect(() => {
    async function load() {
      setLoadingTemplate(true);
      try {
        const res = await fetch(`/api/checklists/templates/${id}`);
        if (!res.ok) { setError("Template not found"); return; }
        const data = await res.json();
        setForm({
          title: data.title || "",
          description: data.description || "",
          category: data.category || "GENERAL",
          isActive: data.isActive ?? true,
        });
        setItems(
          (data.items || [])
            .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
            .map((item: any) => ({
              id: item.id,
              label: item.label || "",
              type: item.type || "CHECKBOX",
              required: item.required ?? false,
              description: item.description || "",
            }))
        );
      } finally {
        setLoadingTemplate(false);
      }
    }
    load();
  }, [id]);

  function setField(key: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateItem(index: number, key: keyof ChecklistItem, value: string | boolean) {
    setItems((prev) => prev.map((item, i) => i === index ? { ...item, [key]: value } : item));
  }

  function addItem() {
    setItems((prev) => [...prev, blankItem()]);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function moveItem(index: number, direction: "up" | "down") {
    const newItems = [...items];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newItems.length) return;
    [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
    setItems(newItems);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { setError("Title is required"); return; }
    if (items.length === 0) { setError("At least one item is required"); return; }
    if (items.some((item) => !item.label.trim())) { setError("All items must have a label"); return; }

    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/checklists/templates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          items: items.map((item, i) => ({ ...item, order: i })),
        }),
      });
      if (res.ok) {
        router.push("/admin/checklists/templates");
      } else {
        const err = await res.json();
        setError(err.error || "Failed to save template");
      }
    } finally {
      setSaving(false);
    }
  }

  if (loadingTemplate) {
    return (
      <div className="flex items-center justify-center py-16">
        <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/admin/checklists/templates">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Template</h1>
          <p className="text-gray-500 mt-1">Update template details and items</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Template Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Title *</Label>
              <Input
                value={form.title}
                onChange={(e) => setField("title", e.target.value)}
                className="mt-1"
                required
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
                className="mt-1"
                rows={3}
              />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setField("category", v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={form.isActive}
                onChange={(e) => setField("isActive", e.target.checked)}
                className="h-4 w-4"
              />
              <label htmlFor="isActive" className="text-sm text-gray-600">Active</label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Checklist Items ({items.length})</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addItem}>
              <Plus className="h-4 w-4 mr-1" />
              Add Item
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {items.map((item, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3 bg-gray-50">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-gray-500">Item {index + 1}</span>
                  <div className="flex gap-1">
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveItem(index, "up")} disabled={index === 0}>
                      <ChevronUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveItem(index, "down")} disabled={index === items.length - 1}>
                      <ChevronDown className="h-3.5 w-3.5" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={() => removeItem(index)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Label *</Label>
                    <Input
                      value={item.label}
                      onChange={(e) => updateItem(index, "label", e.target.value)}
                      className="mt-1 h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Type</Label>
                    <Select value={item.type} onValueChange={(v) => updateItem(index, "type", v)}>
                      <SelectTrigger className="mt-1 h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ITEM_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Description (optional)</Label>
                  <Input
                    value={item.description}
                    onChange={(e) => updateItem(index, "description", e.target.value)}
                    className="mt-1 h-8 text-sm"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`required-${index}`}
                    checked={item.required}
                    onChange={(e) => updateItem(index, "required", e.target.checked)}
                    className="h-4 w-4"
                  />
                  <label htmlFor={`required-${index}`} className="text-sm text-gray-600">Required</label>
                </div>
              </div>
            ))}
            {items.length === 0 && (
              <p className="text-center text-gray-400 py-4 text-sm">No items. Click &quot;Add Item&quot; to add one.</p>
            )}
          </CardContent>
        </Card>

        {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>}

        <div className="flex gap-3 justify-end">
          <Link href="/admin/checklists/templates">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
