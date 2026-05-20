"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const CHANGE_TYPES = [
  "Process",
  "Equipment / Plant",
  "Document / Procedure",
  "Personnel",
  "Temporary Change",
  "Other",
];

export default function NewMocPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const userName = (session?.user as any)?.name || "";
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    title: "",
    changeType: "",
    description: "",
    reason: "",
    riskAssessment: "",
    affectedAreas: "",
    proposedDate: "",
    implementationDate: "",
    reviewDate: "",
    requestedByName: userName,
  });

  const handleSubmit = async (e: React.FormEvent, submitStatus: string) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }
    if (!form.changeType) {
      setError("Change type is required.");
      return;
    }
    if (!form.description.trim()) {
      setError("Description is required.");
      return;
    }
    if (!form.reason.trim()) {
      setError("Reason / justification is required.");
      return;
    }
    setError("");
    setSaving(true);

    try {
      const res = await fetch("/api/moc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          changeType: form.changeType,
          description: form.description.trim(),
          reason: form.reason.trim(),
          riskAssessment: form.riskAssessment.trim() || null,
          affectedAreas: form.affectedAreas.trim() || null,
          proposedDate: form.proposedDate || null,
          implementationDate: form.implementationDate || null,
          reviewDate: form.reviewDate || null,
          requestedByName: form.requestedByName.trim() || userName,
          status: submitStatus,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        setError(err.error || "Failed to save change request.");
        return;
      }
      const created = await res.json();
      router.push(`/moc/${created.id}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/moc">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Change Request</h1>
          <p className="text-gray-500 mt-0.5">Submit a Management of Change request</p>
        </div>
      </div>

      <form className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Change Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Brief title describing the change"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="changeType">Change Type *</Label>
              <Select
                value={form.changeType}
                onValueChange={(v) => setForm((f) => ({ ...f, changeType: v }))}
              >
                <SelectTrigger id="changeType">
                  <SelectValue placeholder="Select change type" />
                </SelectTrigger>
                <SelectContent>
                  {CHANGE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Description of Change *</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Describe what is changing in detail..."
                rows={4}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reason">Reason / Justification *</Label>
              <Textarea
                id="reason"
                value={form.reason}
                onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                placeholder="Why is this change necessary?"
                rows={3}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="riskAssessment">Risk Assessment</Label>
              <Textarea
                id="riskAssessment"
                value={form.riskAssessment}
                onChange={(e) => setForm((f) => ({ ...f, riskAssessment: e.target.value }))}
                placeholder="Potential risks and mitigations (optional)..."
                rows={3}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="affectedAreas">Affected Areas / Departments</Label>
              <Input
                id="affectedAreas"
                value={form.affectedAreas}
                onChange={(e) => setForm((f) => ({ ...f, affectedAreas: e.target.value }))}
                placeholder="Which areas or departments are affected? (optional)"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dates & Requester</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="proposedDate">Proposed Date</Label>
                <Input
                  id="proposedDate"
                  type="date"
                  value={form.proposedDate}
                  onChange={(e) => setForm((f) => ({ ...f, proposedDate: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="implementationDate">Implementation Date</Label>
                <Input
                  id="implementationDate"
                  type="date"
                  value={form.implementationDate}
                  onChange={(e) => setForm((f) => ({ ...f, implementationDate: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reviewDate">Review Date</Label>
                <Input
                  id="reviewDate"
                  type="date"
                  value={form.reviewDate}
                  onChange={(e) => setForm((f) => ({ ...f, reviewDate: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="requestedByName">Requested By</Label>
              <Input
                id="requestedByName"
                value={form.requestedByName}
                onChange={(e) => setForm((f) => ({ ...f, requestedByName: e.target.value }))}
                placeholder="Your name"
              />
            </div>
          </CardContent>
        </Card>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">{error}</p>
        )}

        <div className="flex justify-end gap-3">
          <Link href="/moc">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            onClick={(e) => handleSubmit(e as any, "draft")}
          >
            {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
            Save as Draft
          </Button>
          <Button
            type="button"
            disabled={saving}
            onClick={(e) => handleSubmit(e as any, "pending_approval")}
          >
            {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
            Submit for Approval
          </Button>
        </div>
      </form>
    </div>
  );
}
