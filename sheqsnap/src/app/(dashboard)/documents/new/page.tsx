"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";

const DOC_TYPES = [
  { value: "POLICY",    label: "Policy",    desc: "High-level organizational commitment. Requires admin approval." },
  { value: "PROCEDURE", label: "Procedure", desc: "Step-by-step SOP or work instruction. Manager approval required." },
  { value: "ONE_PAGER", label: "One-Pager", desc: "Toolbox talk, quick-ref card, or job aid. Safety officer approval." },
];

const CATEGORIES = [
  "Safety", "Health", "Environment", "Quality", "Emergency Response",
  "HR & Welfare", "Legal & Compliance", "Operational", "Training",
];

const REVIEW_INTERVALS = [
  { value: "3",  label: "Every 3 months" },
  { value: "6",  label: "Every 6 months" },
  { value: "12", label: "Annually" },
  { value: "24", label: "Every 2 years" },
];

export default function NewDocumentPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const user = session?.user as any;

  const [form, setForm] = useState({
    title: "",
    type: "",
    description: "",
    category: "",
    tags: "",
    reviewInterval: "12",
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  const allowed = ["SAFETY_OFFICER", "MANAGER", "ADMIN"];
  if (user && !allowed.includes(user.role)) {
    router.replace("/documents");
    return null;
  }

  function setField(k: string, v: string) {
    setForm(prev => ({ ...prev, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.type) {
      setError("Title and document type are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create document");
      }
      const doc = await res.json();
      router.push(`/documents/${doc.id}/edit?vid=${doc.latestVersionId}`);
    } catch (err: any) {
      setError(err.message);
      setSaving(false);
    }
  }

  const selectedType = DOC_TYPES.find(t => t.value === form.type);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/documents">
          <Button variant="ghost" size="sm" className="gap-1 text-gray-500">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">New Document</h1>
          <p className="text-sm text-gray-500">Create a controlled document</p>
        </div>
      </div>

      <Card className="shadow-none border-gray-200">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-5">

            <div className="space-y-1.5">
              <Label htmlFor="type" className="font-semibold">Document Type <span className="text-red-500">*</span></Label>
              <div className="grid grid-cols-3 gap-3">
                {DOC_TYPES.map(t => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setField("type", t.value)}
                    className={`relative p-3 rounded-lg border-2 text-left transition-all ${
                      form.type === t.value
                        ? "border-[#1A1A1A] bg-[#FFFC41]/10"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <p className="font-semibold text-sm">{t.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5 leading-snug">{t.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="title" className="font-semibold">Title <span className="text-red-500">*</span></Label>
              <Input
                id="title"
                placeholder="e.g. Working at Heights Procedure"
                value={form.title}
                onChange={e => setField("title", e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description" className="font-semibold">Description</Label>
              <textarea
                id="description"
                rows={3}
                placeholder="Brief description of what this document covers…"
                value={form.description}
                onChange={e => setField("description", e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="category" className="font-semibold">Category</Label>
                <Select value={form.category} onValueChange={v => setField("category", v)}>
                  <SelectTrigger id="category"><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="review" className="font-semibold">Review Cycle</Label>
                <Select value={form.reviewInterval} onValueChange={v => setField("reviewInterval", v)}>
                  <SelectTrigger id="review"><SelectValue placeholder="Select interval" /></SelectTrigger>
                  <SelectContent>
                    {REVIEW_INTERVALS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tags" className="font-semibold">Tags <span className="text-gray-400 font-normal">(comma-separated)</span></Label>
              <Input
                id="tags"
                placeholder="e.g. mining, fall protection, legal"
                value={form.tags}
                onChange={e => setField("tags", e.target.value)}
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Link href="/documents">
                <Button type="button" variant="outline">Cancel</Button>
              </Link>
              <Button
                type="submit"
                disabled={saving || !form.title || !form.type}
                className="bg-[#1A1A1A] text-white hover:bg-black min-w-[140px]"
              >
                {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating…</> : "Create & Start Editing"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
