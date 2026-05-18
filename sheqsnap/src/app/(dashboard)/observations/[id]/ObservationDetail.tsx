"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
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
import { cn, formatDate } from "@/lib/utils";
import {
  Pencil,
  Plus,
  X,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileUp,
  ChevronLeft,
} from "lucide-react";

interface BehaviourAction {
  id: string;
  description: string;
  responsiblePerson: string;
  dueDate: string;
  status: string;
  closedAt: string | null;
  closedNote: string | null;
}

interface ObservationEvidence {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: string | null;
  uploadedAt: string;
}

interface BehaviourObservation {
  id: string;
  observationDate: string;
  location: string;
  site: string | null;
  shaft: string | null;
  plant: string | null;
  observerName: string;
  observerDepartment: string | null;
  teamObserved: string | null;
  contractorObserved: string | null;
  employeeObserved: string | null;
  workType: string;
  taskDescription: string;
  workContext: string | null;
  safeBehaviours: string | null;
  unsafeBehaviours: string | null;
  hazardsPresent: string | null;
  potentialConsequences: string | null;
  riskLevel: string | null;
  likelihoodScore: number | null;
  impactScore: number | null;
  riskScore: number | null;
  immediateActionTaken: string | null;
  workStopped: boolean;
  supervisorNotified: boolean;
  rootCauses: string | null;
  workerEngaged: boolean;
  workerFeedback: string | null;
  safetyCategory: string | null;
  behaviourType: string | null;
  status: string;
  createdAt: string;
  actions: BehaviourAction[];
  evidence: ObservationEvidence[];
}

function parseArr(val: string | null): string[] {
  if (!val) return [];
  try { return JSON.parse(val) as string[]; } catch { return []; }
}

function riskBadge(level: string | null) {
  if (!level) return null;
  const map: Record<string, string> = {
    HIGH: "bg-red-100 text-red-700",
    MEDIUM: "bg-amber-100 text-amber-700",
    LOW: "bg-green-100 text-green-700",
  };
  return (
    <span className={cn("inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold", map[level] || "bg-gray-100 text-gray-700")}>
      {level} RISK
    </span>
  );
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    OPEN: "bg-blue-100 text-blue-700",
    IN_PROGRESS: "bg-amber-100 text-amber-700",
    CLOSED: "bg-green-100 text-green-700",
  };
  return (
    <span className={cn("inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold", map[status] || "bg-gray-100 text-gray-700")}>
      {status.replace("_", " ")}
    </span>
  );
}

function actionStatusBadge(status: string) {
  const map: Record<string, string> = {
    OPEN: "bg-blue-100 text-blue-700",
    IN_PROGRESS: "bg-amber-100 text-amber-700",
    CLOSED: "bg-green-100 text-green-700",
  };
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold", map[status] || "bg-gray-100 text-gray-700")}>
      {status.replace("_", " ")}
    </span>
  );
}

export default function ObservationDetail({ observation: initialObs }: { observation: BehaviourObservation }) {
  const router = useRouter();
  const [observation, setObservation] = useState(initialObs);
  const [actions, setActions] = useState<BehaviourAction[]>(initialObs.actions);

  // Action status update state
  const [updatingAction, setUpdatingAction] = useState<string | null>(null);
  const [closingNote, setClosingNote] = useState<Record<string, string>>({});

  // Add action dialog
  const [addActionOpen, setAddActionOpen] = useState(false);
  const [newAction, setNewAction] = useState({ description: "", responsiblePerson: "", dueDate: "" });
  const [addingAction, setAddingAction] = useState(false);
  const [addActionError, setAddActionError] = useState("");

  const updateActionStatus = async (actionId: string, newStatus: string) => {
    setUpdatingAction(actionId);
    try {
      const payload: Record<string, unknown> = { status: newStatus };
      if (newStatus === "CLOSED" && closingNote[actionId]) {
        payload.closedNote = closingNote[actionId];
      }
      const res = await fetch(`/api/behaviour-observations/${observation.id}/actions/${actionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const updated = await res.json();
        setActions((prev) => prev.map((a) => a.id === actionId ? updated : a));
      }
    } finally {
      setUpdatingAction(null);
    }
  };

  const handleAddAction = async () => {
    if (!newAction.description.trim() || !newAction.responsiblePerson.trim() || !newAction.dueDate) {
      setAddActionError("All fields are required");
      return;
    }
    setAddingAction(true);
    setAddActionError("");
    try {
      const res = await fetch(`/api/behaviour-observations/${observation.id}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAction),
      });
      if (!res.ok) {
        const err = await res.json();
        setAddActionError(err.error || "Failed to add action");
        return;
      }
      const created = await res.json();
      setActions((prev) => [...prev, created]);
      setNewAction({ description: "", responsiblePerson: "", dueDate: "" });
      setAddActionOpen(false);
    } finally {
      setAddingAction(false);
    }
  };

  const safe = parseArr(observation.safeBehaviours);
  const unsafe = parseArr(observation.unsafeBehaviours);
  const rootCauses = parseArr(observation.rootCauses);

  return (
    <div className="space-y-6">
      {/* Back + header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <Link href="/observations" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-2">
            <ChevronLeft className="h-4 w-4 mr-1" /> Back to Observations
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Observation Detail</h1>
          <div className="flex items-center flex-wrap gap-2 mt-2">
            <span className="text-sm text-gray-500">{formatDate(observation.observationDate)}</span>
            <span className="text-gray-300">·</span>
            <span className="text-sm text-gray-600 font-medium">{observation.location}</span>
            {riskBadge(observation.riskLevel)}
            {statusBadge(observation.status)}
          </div>
        </div>
        <Link href={`/observations/${observation.id}/edit`}>
          <Button variant="outline">
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </Link>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Observation details (2/3 width) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Observer & Task */}
          <Card>
            <CardHeader><CardTitle className="text-base">Observer & Task</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-gray-500">Observer:</span> <span className="font-medium text-gray-900">{observation.observerName}</span></div>
                {observation.observerDepartment && <div><span className="text-gray-500">Department:</span> <span className="text-gray-700">{observation.observerDepartment}</span></div>}
                {observation.site && <div><span className="text-gray-500">Site:</span> <span className="text-gray-700">{observation.site}</span></div>}
                {observation.shaft && <div><span className="text-gray-500">Shaft:</span> <span className="text-gray-700">{observation.shaft}</span></div>}
                {observation.plant && <div><span className="text-gray-500">Plant:</span> <span className="text-gray-700">{observation.plant}</span></div>}
                <div><span className="text-gray-500">Work Type:</span> <span className="text-gray-700 capitalize">{observation.workType.replace("_", " ")}</span></div>
                {observation.teamObserved && <div><span className="text-gray-500">Team:</span> <span className="text-gray-700">{observation.teamObserved}</span></div>}
                {observation.contractorObserved && <div><span className="text-gray-500">Contractor:</span> <span className="text-gray-700">{observation.contractorObserved}</span></div>}
                {observation.employeeObserved && <div><span className="text-gray-500">Employee:</span> <span className="text-gray-700">{observation.employeeObserved}</span></div>}
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Task Description</p>
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{observation.taskDescription}</p>
              </div>
              {observation.workContext && (
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Work Context</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{observation.workContext}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Behaviours */}
          {(safe.length > 0 || unsafe.length > 0) && (
            <Card>
              <CardHeader><CardTitle className="text-base">Observed Behaviours</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {safe.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-2">Safe Behaviours</p>
                    <div className="flex flex-wrap gap-2">
                      {safe.map((b, i) => (
                        <span key={i} className="inline-flex items-center rounded-full bg-green-100 text-green-800 px-3 py-1 text-sm font-medium">
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />{b}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {unsafe.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2">Unsafe / At-Risk Behaviours</p>
                    <div className="flex flex-wrap gap-2">
                      {unsafe.map((b, i) => (
                        <span key={i} className="inline-flex items-center rounded-full bg-amber-100 text-amber-800 px-3 py-1 text-sm font-medium">
                          <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />{b}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Hazards & Risk */}
          <Card>
            <CardHeader><CardTitle className="text-base">Hazards & Risk</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div className="text-center">
                  <p className="text-xs text-gray-500">Likelihood</p>
                  <p className="text-2xl font-bold text-gray-900">{observation.likelihoodScore ?? "—"}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500">Impact</p>
                  <p className="text-2xl font-bold text-gray-900">{observation.impactScore ?? "—"}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500">Risk Score</p>
                  <p className={cn("text-2xl font-bold",
                    (observation.riskScore ?? 0) >= 15 ? "text-red-600" :
                    (observation.riskScore ?? 0) >= 6 ? "text-amber-600" : "text-green-600"
                  )}>{observation.riskScore ?? "—"}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500">Category</p>
                  <p className="text-sm font-semibold text-gray-700">{observation.safetyCategory || "—"}</p>
                </div>
              </div>
              {observation.hazardsPresent && (
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Hazards Present</p>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">{observation.hazardsPresent}</p>
                </div>
              )}
              {observation.potentialConsequences && (
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Potential Consequences</p>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">{observation.potentialConsequences}</p>
                </div>
              )}
              <div className="flex flex-wrap gap-4 text-sm">
                <span className={cn("flex items-center gap-1", observation.workStopped ? "text-red-700 font-medium" : "text-gray-400")}>
                  {observation.workStopped ? "⛔ Work Stopped" : "Work Not Stopped"}
                </span>
                <span className={cn("flex items-center gap-1", observation.supervisorNotified ? "text-blue-700 font-medium" : "text-gray-400")}>
                  {observation.supervisorNotified ? "✓ Supervisor Notified" : "Supervisor Not Notified"}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Immediate Action & Root Causes */}
          {(observation.immediateActionTaken || rootCauses.length > 0) && (
            <Card>
              <CardHeader><CardTitle className="text-base">Response</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {observation.immediateActionTaken && (
                  <div>
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Immediate Action Taken</p>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{observation.immediateActionTaken}</p>
                  </div>
                )}
                {rootCauses.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-2">Root Causes</p>
                    <div className="flex flex-wrap gap-2">
                      {rootCauses.map((c, i) => (
                        <span key={i} className="inline-flex items-center rounded-full bg-gray-100 text-gray-700 px-3 py-1 text-sm">{c}</span>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Worker Engagement */}
          <Card>
            <CardHeader><CardTitle className="text-base">Worker Engagement</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm mb-2">
                <span className={cn("font-medium", observation.workerEngaged ? "text-green-700" : "text-gray-500")}>
                  {observation.workerEngaged ? "✓ Worker was engaged" : "Worker was not engaged"}
                </span>
              </div>
              {observation.workerFeedback && (
                <p className="text-sm text-gray-700 whitespace-pre-wrap italic">&ldquo;{observation.workerFeedback}&rdquo;</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Actions panel (1/3 width) */}
        <div className="space-y-4">
          {/* Actions */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Follow-up Actions</CardTitle>
                <Button size="sm" variant="outline" onClick={() => setAddActionOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {actions.length === 0 && (
                <p className="text-sm text-gray-400 italic">No actions assigned yet.</p>
              )}
              {actions.map((action) => {
                const isOverdue = new Date(action.dueDate) < new Date() && action.status !== "CLOSED";
                return (
                  <div key={action.id} className={cn("rounded-lg border p-3 space-y-2", isOverdue ? "border-red-200 bg-red-50" : "border-gray-200")}>
                    <p className="text-sm font-medium text-gray-800">{action.description}</p>
                    <div className="text-xs text-gray-500 space-y-0.5">
                      <p><span className="font-medium">Responsible:</span> {action.responsiblePerson}</p>
                      <p className={cn(isOverdue ? "text-red-600 font-medium" : "")}>
                        <Clock className="h-3 w-3 inline mr-1" />
                        Due: {formatDate(action.dueDate)}
                        {isOverdue && " — OVERDUE"}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      {actionStatusBadge(action.status)}
                      <Select
                        value={action.status}
                        onValueChange={(v) => updateActionStatus(action.id, v)}
                        disabled={updatingAction === action.id}
                      >
                        <SelectTrigger className="h-7 text-xs w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="OPEN">Open</SelectItem>
                          <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                          <SelectItem value="CLOSED">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {action.status !== "CLOSED" && (
                      <Input
                        className="h-7 text-xs"
                        placeholder="Closing note (optional)"
                        value={closingNote[action.id] || ""}
                        onChange={(e) => setClosingNote((prev) => ({ ...prev, [action.id]: e.target.value }))}
                      />
                    )}
                    {action.closedNote && (
                      <p className="text-xs text-gray-500 italic">Note: {action.closedNote}</p>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Evidence */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Evidence</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {observation.evidence.length === 0 && (
                <p className="text-sm text-gray-400 italic">No evidence attached yet.</p>
              )}
              {observation.evidence.map((ev) => (
                <div key={ev.id} className="flex items-center gap-2 text-sm">
                  <FileUp className="h-4 w-4 text-gray-400 shrink-0" />
                  <a href={ev.fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate">
                    {ev.fileName}
                  </a>
                </div>
              ))}
              <Button variant="outline" size="sm" className="w-full" disabled title="Coming soon">
                <FileUp className="h-4 w-4 mr-2" />
                Attach Evidence (Coming Soon)
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add Action Dialog */}
      <Dialog.Root open={addActionOpen} onOpenChange={setAddActionOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-xl shadow-2xl z-50 p-6">
            <div className="flex items-center justify-between mb-4">
              <Dialog.Title className="text-lg font-semibold text-gray-900">Add Follow-up Action</Dialog.Title>
              <Dialog.Close asChild>
                <button className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                  <X className="h-5 w-5" />
                </button>
              </Dialog.Close>
            </div>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="newActionDesc">Description *</Label>
                <Textarea
                  id="newActionDesc"
                  rows={3}
                  placeholder="What needs to be done?"
                  value={newAction.description}
                  onChange={(e) => setNewAction((p) => ({ ...p, description: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="newActionResponsible">Responsible Person *</Label>
                  <Input
                    id="newActionResponsible"
                    placeholder="Name"
                    value={newAction.responsiblePerson}
                    onChange={(e) => setNewAction((p) => ({ ...p, responsiblePerson: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="newActionDue">Due Date *</Label>
                  <Input
                    id="newActionDue"
                    type="date"
                    value={newAction.dueDate}
                    onChange={(e) => setNewAction((p) => ({ ...p, dueDate: e.target.value }))}
                  />
                </div>
              </div>
              {addActionError && (
                <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">{addActionError}</p>
              )}
              <div className="flex justify-end gap-3">
                <Dialog.Close asChild>
                  <Button variant="outline">Cancel</Button>
                </Dialog.Close>
                <Button onClick={handleAddAction} disabled={addingAction}>
                  {addingAction ? "Adding..." : "Add Action"}
                </Button>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
