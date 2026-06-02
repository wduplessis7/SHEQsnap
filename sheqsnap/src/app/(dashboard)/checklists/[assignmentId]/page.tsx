"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useOfflineSubmit } from '@/hooks/useOfflineSubmit';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  Star,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn, formatDate, formatDateTime } from "@/lib/utils";

interface TemplateItem {
  id: string;
  label: string;
  description: string | null;
  type: "CHECKBOX" | "YES_NO" | "TEXT" | "RATING" | "PHOTO";
  required: boolean;
  order: number;
}

interface ItemResponse {
  templateItemId: string;
  value: string | null;
  templateItem: TemplateItem;
}

interface Submission {
  id: string;
  notes: string | null;
  submittedAt: string;
  submittedBy: { id: string; name: string };
  responses: ItemResponse[];
}

interface Assignment {
  id: string;
  status: "PENDING" | "IN_PROGRESS" | "SUBMITTED" | "OVERDUE";
  dueDate: string | null;
  submittedAt: string | null;
  template: {
    id: string;
    title: string;
    category: string;
    items: TemplateItem[];
  };
  assignedToUser: { id: string; name: string; email: string };
  submission: Submission | null;
}

type ResponsesMap = Record<string, string>;

function dueDateClass(dueDate: string | null): string {
  if (!dueDate) return "text-gray-400";
  const due = new Date(dueDate);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const diffDays = Math.round((dueDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return "text-red-600 font-medium";
  if (diffDays === 1) return "text-orange-500 font-medium";
  return "text-gray-500";
}

function CheckboxItem({
  item,
  value,
  onChange,
  readOnly,
}: {
  item: TemplateItem;
  value: string;
  onChange: (v: string) => void;
  readOnly: boolean;
}) {
  const checked = value === "true";
  return (
    <button
      type="button"
      disabled={readOnly}
      onClick={() => onChange(checked ? "false" : "true")}
      className={cn(
        "flex items-center gap-3 w-full text-left p-3 rounded-lg border-2 transition-colors min-h-[52px]",
        checked
          ? "border-green-500 bg-green-50"
          : "border-gray-200 bg-white hover:border-gray-300",
        readOnly && "cursor-default"
      )}
    >
      <div
        className={cn(
          "w-6 h-6 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
          checked ? "border-green-500 bg-green-500" : "border-gray-300"
        )}
      >
        {checked && (
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
      <span className="text-sm text-gray-700">{checked ? "Checked" : "Not checked"}</span>
    </button>
  );
}

function YesNoItem({
  item,
  value,
  onChange,
  readOnly,
}: {
  item: TemplateItem;
  value: string;
  onChange: (v: string) => void;
  readOnly: boolean;
}) {
  return (
    <div className="flex gap-3">
      <button
        type="button"
        disabled={readOnly}
        onClick={() => onChange("yes")}
        className={cn(
          "flex-1 min-h-[52px] rounded-lg border-2 font-semibold text-base transition-colors",
          value === "yes"
            ? "border-green-500 bg-green-500 text-white"
            : "border-gray-200 bg-white text-gray-700 hover:border-green-300 hover:bg-green-50",
          readOnly && "cursor-default"
        )}
      >
        Yes
      </button>
      <button
        type="button"
        disabled={readOnly}
        onClick={() => onChange("no")}
        className={cn(
          "flex-1 min-h-[52px] rounded-lg border-2 font-semibold text-base transition-colors",
          value === "no"
            ? "border-red-500 bg-red-500 text-white"
            : "border-gray-200 bg-white text-gray-700 hover:border-red-300 hover:bg-red-50",
          readOnly && "cursor-default"
        )}
      >
        No
      </button>
    </div>
  );
}

function RatingItem({
  item,
  value,
  onChange,
  readOnly,
}: {
  item: TemplateItem;
  value: string;
  onChange: (v: string) => void;
  readOnly: boolean;
}) {
  const selected = parseInt(value) || 0;
  return (
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={readOnly}
          onClick={() => onChange(String(n))}
          className={cn(
            "flex-1 min-h-[52px] rounded-lg border-2 font-semibold text-base transition-colors",
            n <= selected
              ? "border-yellow-400 bg-yellow-400 text-white"
              : "border-gray-200 bg-white text-gray-600 hover:border-yellow-300 hover:bg-yellow-50",
            readOnly && "cursor-default"
          )}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

function PhotoItem({
  item,
  value,
  onChange,
  readOnly,
}: {
  item: TemplateItem;
  value: string;
  onChange: (v: string) => void;
  readOnly: boolean;
}) {
  return (
    <div>
      {readOnly ? (
        <p className="text-sm text-gray-500">{value || "No photo attached"}</p>
      ) : (
        <label className="block">
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors min-h-[80px] flex flex-col items-center justify-center gap-2",
              value ? "border-green-400 bg-green-50" : "border-gray-300 hover:border-gray-400"
            )}
          >
            {value ? (
              <>
                <CheckCircle className="h-6 w-6 text-green-500" />
                <span className="text-sm text-green-700 truncate max-w-full px-2">{value}</span>
                <span className="text-xs text-gray-400">Click to change</span>
              </>
            ) : (
              <>
                <Star className="h-6 w-6 text-gray-400" />
                <span className="text-sm text-gray-500">Tap to attach photo</span>
              </>
            )}
          </div>
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onChange(file.name);
            }}
          />
        </label>
      )}
    </div>
  );
}

export default function ChecklistFormPage() {
  const params = useParams();
  const router = useRouter();
  const assignmentId = params.assignmentId as string;

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [responses, setResponses] = useState<ResponsesMap>({});
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { submit, isOnline } = useOfflineSubmit();

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/checklists/assignments/${assignmentId}`);
        if (!res.ok) throw new Error("Failed to load");
        const data: Assignment = await res.json();
        setAssignment(data);

        // Pre-populate responses from existing submission
        if (data.submission) {
          const map: ResponsesMap = {};
          for (const r of data.submission.responses) {
            map[r.templateItemId] = r.value ?? "";
          }
          setResponses(map);
          setNotes(data.submission.notes ?? "");
        }
      } catch {
        setError("Failed to load checklist. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [assignmentId]);

  const saveDraft = useCallback(
    async (currentResponses: ResponsesMap) => {
      if (!assignment) return;
      if (assignment.status === "SUBMITTED") return;
      if (!navigator.onLine) return;
      setSaving(true);
      try {
        await fetch(`/api/checklists/assignments/${assignmentId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "IN_PROGRESS" }),
        });
      } catch {
        // silent fail for auto-save
      } finally {
        setSaving(false);
      }
    },
    [assignment, assignmentId]
  );

  function handleResponseChange(itemId: string, value: string) {
    setResponses((prev) => {
      const next = { ...prev, [itemId]: value };

      // debounced auto-save
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        saveDraft(next);
      }, 2000);

      return next;
    });
  }

  async function handleSubmit() {
    if (!assignment) return;
    setSubmitting(true);
    setError(null);
    setShowConfirm(false);
    try {
      const responses_payload = Object.entries(responses).map(([templateItemId, value]) => ({
        templateItemId,
        value: String(value),
      }));

      const result = await submit({
        url: `/api/checklists/assignments/${assignmentId}/submit`,
        body: { notes, responses: responses_payload },
        entityType: 'Checklist',
        description: `Checklist: ${assignment?.template?.title ?? assignmentId}`,
      });

      if (result.offline) {
        router.push('/checklists?saved=offline');
        return;
      }
      if (!result.ok) {
        setError(result.error ?? 'Failed to submit checklist');
        return;
      }
      router.push('/checklists?submitted=1');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="space-y-4">
        <Link href="/checklists">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </Link>
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            {error || "Checklist not found."}
          </CardContent>
        </Card>
      </div>
    );
  }

  const items = assignment.template.items;
  const isReadOnly = assignment.status === "SUBMITTED";
  const isOverdue = assignment.status === "OVERDUE";

  // Progress
  const requiredItems = items.filter((i) => i.required);
  const answeredRequired = requiredItems.filter(
    (i) => responses[i.id] !== undefined && responses[i.id] !== ""
  ).length;
  const totalAnswered = items.filter(
    (i) => responses[i.id] !== undefined && responses[i.id] !== ""
  ).length;
  const allRequiredAnswered = answeredRequired === requiredItems.length;
  const progressPct = items.length > 0 ? Math.round((totalAnswered / items.length) * 100) : 0;

  // Success state
  if (submitted) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <Link href="/checklists">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
            Back to Checklists
          </Button>
        </Link>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Checklist submitted successfully!</h2>
              <p className="text-gray-500 mt-2">{assignment.template.title}</p>
            </div>
            <Link href="/checklists">
              <Button variant="success">Back to My Checklists</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Read-only state for already submitted
  if (isReadOnly && assignment.submission) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <Link href="/checklists">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </Link>
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900">{assignment.template.title}</h1>
            <Badge variant="secondary">{assignment.template.category}</Badge>
            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-green-100 text-green-800">
              SUBMITTED
            </span>
          </div>
          <p className="text-sm text-gray-500">
            Submitted {formatDateTime(assignment.submission.submittedAt)} by{" "}
            {assignment.submission.submittedBy.name}
          </p>
        </div>

        <div className="space-y-4">
          {items.map((item) => {
            const resp = assignment.submission!.responses.find(
              (r) => r.templateItemId === item.id
            );
            const val = resp?.value ?? "";
            return (
              <Card key={item.id}>
                <CardContent className="p-4 space-y-3">
                  <div>
                    <p className="font-medium text-gray-900">
                      {item.label}
                      {item.required && <span className="text-red-500 ml-1">*</span>}
                    </p>
                    {item.description && (
                      <p className="text-sm text-gray-500 mt-0.5">{item.description}</p>
                    )}
                  </div>
                  <div className="text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2 min-h-[40px]">
                    {val || <span className="text-gray-400 italic">No response</span>}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Back + Header */}
      <Link href="/checklists">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </Link>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold text-gray-900">{assignment.template.title}</h1>
          <Badge variant="secondary">{assignment.template.category}</Badge>
        </div>
        {assignment.dueDate && (
          <p className={cn("text-sm", dueDateClass(assignment.dueDate))}>
            Due: {formatDate(assignment.dueDate)}
          </p>
        )}
      </div>

      {/* Overdue banner */}
      {isOverdue && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
          <p className="text-sm text-red-700 font-medium">This checklist is overdue</p>
        </div>
      )}

      {/* Progress */}
      <Card>
        <CardContent className="p-4 space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>{totalAnswered} of {items.length} items answered</span>
            <span>{progressPct}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-green-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          {requiredItems.length > 0 && (
            <p className="text-xs text-gray-400">
              {answeredRequired}/{requiredItems.length} required answered
            </p>
          )}
        </CardContent>
      </Card>

      {/* Form items */}
      <div className="space-y-4">
        {items.map((item) => {
          const value = responses[item.id] ?? "";
          return (
            <Card key={item.id}>
              <CardContent className="p-4 space-y-3">
                <div>
                  <p className="font-semibold text-gray-900 text-base leading-snug">
                    {item.label}
                    {item.required && <span className="text-red-500 ml-1">*</span>}
                  </p>
                  {item.description && (
                    <p className="text-sm text-gray-500 mt-1">{item.description}</p>
                  )}
                </div>

                {item.type === "CHECKBOX" && (
                  <CheckboxItem
                    item={item}
                    value={value}
                    onChange={(v) => handleResponseChange(item.id, v)}
                    readOnly={false}
                  />
                )}
                {item.type === "YES_NO" && (
                  <YesNoItem
                    item={item}
                    value={value}
                    onChange={(v) => handleResponseChange(item.id, v)}
                    readOnly={false}
                  />
                )}
                {item.type === "TEXT" && (
                  <Textarea
                    value={value}
                    onChange={(e) => handleResponseChange(item.id, e.target.value)}
                    placeholder="Enter your response..."
                    rows={3}
                    className="min-h-[80px]"
                  />
                )}
                {item.type === "RATING" && (
                  <RatingItem
                    item={item}
                    value={value}
                    onChange={(v) => handleResponseChange(item.id, v)}
                    readOnly={false}
                  />
                )}
                {item.type === "PHOTO" && (
                  <>
                    <PhotoItem
                      item={item}
                      value={value}
                      onChange={(v) => handleResponseChange(item.id, v)}
                      readOnly={false}
                    />
                    {!isOnline && (
                      <p className="text-xs text-amber-500 mt-1">Photos cannot be captured offline — fill in other fields and add photos when back online</p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Notes */}
      <Card>
        <CardContent className="p-4 space-y-2">
          <p className="font-medium text-gray-700">Additional Notes (optional)</p>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any additional notes or observations..."
            rows={3}
          />
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Offline indicator */}
      {!isOnline && (
        <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
          <span>⚡</span>
          <span>You are offline — your answers will be saved and submitted automatically when you reconnect</span>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pb-8">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => saveDraft(responses)}
          disabled={saving}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Save Draft
        </Button>
        <Button
          variant="success"
          className="flex-1 min-h-[44px]"
          disabled={!allRequiredAnswered || submitting}
          onClick={() => setShowConfirm(true)}
        >
          Submit Checklist
        </Button>
      </div>

      {/* Confirm dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Checklist</DialogTitle>
            <DialogDescription>
              Are you sure you want to submit this checklist? You will not be able to edit it after
              submission.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)}>
              Cancel
            </Button>
            <Button variant="success" onClick={handleSubmit} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Confirm Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
