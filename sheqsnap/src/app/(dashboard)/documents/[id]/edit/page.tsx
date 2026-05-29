"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { ArrowLeft, Save, Send, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DocEditor } from "@/components/documents/doc-editor";
import { cn } from "@/lib/utils";

type SaveState = "idle" | "saving" | "saved" | "error";

export default function EditDocumentPage({ params }: { params: { id: string } }) {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const vidParam = searchParams.get("vid");
  const user = session?.user as any;

  const [doc,        setDoc]        = useState<any>(null);
  const [version,    setVersion]    = useState<any>(null);
  const [content,    setContent]    = useState<string>("{}");
  const [changeNotes, setChangeNotes] = useState("");
  const [saveState,  setSaveState]  = useState<SaveState>("idle");
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState("");

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchDoc = useCallback(async () => {
    const [docRes, verRes] = await Promise.all([
      fetch(`/api/documents/${params.id}`),
      vidParam ? fetch(`/api/documents/${params.id}/versions/${vidParam}`) : Promise.resolve(null),
    ]);
    if (!docRes.ok) { router.replace("/documents"); return; }
    const docData = await docRes.json();
    setDoc(docData);

    if (verRes && verRes.ok) {
      const verData = await verRes.json();
      setVersion(verData);
      setContent(verData.content || "{}");
      setChangeNotes(verData.changeNotes || "");
    } else if (docData.versions?.length > 0) {
      const latest = docData.versions[0];
      setVersion(latest);
      setContent(latest.content || "{}");
      setChangeNotes(latest.changeNotes || "");
    }
  }, [params.id, vidParam, router]);

  useEffect(() => { fetchDoc(); }, [fetchDoc]);

  async function doSave(c: string, notes: string) {
    if (!version) return;
    setSaveState("saving");
    try {
      const res = await fetch(`/api/documents/${params.id}/versions/${version.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: c, changeNotes: notes }),
      });
      if (!res.ok) throw new Error("Save failed");
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2000);
    } catch {
      setSaveState("error");
    }
  }

  function handleContentChange(json: string) {
    setContent(json);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveState("saving");
    saveTimer.current = setTimeout(() => doSave(json, changeNotes), 1500);
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError("");
    try {
      await doSave(content, changeNotes);
      const res = await fetch(`/api/documents/${params.id}/versions/${version.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Submit failed");
      }
      router.push(`/documents/${params.id}`);
    } catch (err: any) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  if (!doc || !version) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  const isEditable = version.status === "DRAFT";
  const allowed    = ["SAFETY_OFFICER", "MANAGER", "ADMIN"];
  if (user && !allowed.includes(user.role)) {
    router.replace(`/documents/${params.id}`);
    return null;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <Link href={`/documents/${params.id}`}>
          <Button variant="ghost" size="sm" className="gap-1 text-gray-500 shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-gray-400">{doc.docNumber}</span>
            <span className="text-gray-300">·</span>
            <h1 className="text-sm font-semibold text-gray-900 truncate">{doc.title}</h1>
            <span className="text-gray-300">·</span>
            <span className="text-xs text-gray-400">v{version.versionNumber}</span>
          </div>
        </div>

        {/* Save indicator */}
        <div className="flex items-center gap-1 text-xs shrink-0">
          {saveState === "saving" && <span className="text-gray-400 flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" />Saving…</span>}
          {saveState === "saved"  && <span className="text-green-600 flex items-center gap-1"><CheckCircle className="h-3 w-3" />Saved</span>}
          {saveState === "error"  && <span className="text-red-500">Save failed</span>}
        </div>

        {isEditable && (
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={() => doSave(content, changeNotes)} disabled={saveState === "saving"}>
              <Save className="h-4 w-4 mr-1" /> Save
            </Button>
            <Button
              size="sm"
              className="bg-[#1A1A1A] text-white hover:bg-black"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
              Submit for Review
            </Button>
          </div>
        )}
      </div>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Editor area */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
          )}
          {!isEditable && (
            <div className="mb-4 rounded-lg bg-yellow-50 border border-yellow-200 px-4 py-3 text-sm text-yellow-800">
              This version is <strong>{version.status.replace(/_/g, " ")}</strong> and cannot be edited.
            </div>
          )}
          <div className="max-w-3xl mx-auto">
            <DocEditor
              content={content}
              onChange={handleContentChange}
              editable={isEditable}
              placeholder="Start writing your document content here…"
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-72 border-l border-gray-200 bg-white overflow-y-auto p-4 space-y-5 hidden lg:block">
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Version Info</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Version</span>
                <span className="font-mono font-semibold">{version.versionNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Status</span>
                <span className={cn(
                  "text-xs font-semibold px-2 py-0.5 rounded-full",
                  version.status === "DRAFT"        && "bg-gray-100 text-gray-700",
                  version.status === "UNDER_REVIEW"  && "bg-yellow-100 text-yellow-800",
                  version.status === "APPROVED"      && "bg-blue-100 text-blue-800",
                  version.status === "PUBLISHED"     && "bg-green-100 text-green-800",
                )}>
                  {version.status.replace(/_/g, " ")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Author</span>
                <span className="font-medium text-right text-xs">{version.author?.name}</span>
              </div>
            </div>
          </div>

          {isEditable && (
            <div>
              <Label htmlFor="changeNotes" className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 block">
                Change Notes
              </Label>
              <textarea
                id="changeNotes"
                rows={4}
                placeholder="What changed in this version?"
                value={changeNotes}
                onChange={e => {
                  setChangeNotes(e.target.value);
                  if (saveTimer.current) clearTimeout(saveTimer.current);
                  saveTimer.current = setTimeout(() => doSave(content, e.target.value), 1500);
                }}
                className="w-full text-xs px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-900 resize-none"
              />
            </div>
          )}

          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Approval Workflow</h3>
            <div className="space-y-2">
              {version.workflowSteps?.map((step: any, i: number) => (
                <div key={step.id} className="flex items-center gap-2">
                  <div className={cn(
                    "w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
                    step.status === "APPROVED"           && "bg-green-500 text-white",
                    step.status === "CHANGES_REQUESTED"  && "bg-red-400 text-white",
                    step.status === "PENDING"            && "bg-gray-200 text-gray-500",
                  )}>
                    {step.status === "APPROVED" ? "✓" : step.status === "CHANGES_REQUESTED" ? "✗" : i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">
                      {step.action === "APPROVE" ? "Approve" : "Review"} — {step.assignedRole || step.assignedUser?.name}
                    </p>
                    {step.completedBy && (
                      <p className="text-xs text-gray-400">{step.completedBy.name}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
