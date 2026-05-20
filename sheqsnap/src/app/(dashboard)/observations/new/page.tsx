"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { cn } from "@/lib/utils";
import { Plus, Trash2, ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";

const actionSchema = z.object({
  description: z.string().min(1, "Required"),
  responsiblePerson: z.string().min(1, "Required"),
  dueDate: z.string().min(1, "Required"),
  status: z.string(),
});

const formSchema = z.object({
  observationDate: z.string().min(1, "Required"),
  location: z.string().min(1, "Required"),
  site: z.string().optional(),
  shaft: z.string().optional(),
  plant: z.string().optional(),
  observerName: z.string().min(1, "Required"),
  observerDepartment: z.string().optional(),
  teamObserved: z.string().optional(),
  contractorObserved: z.string().optional(),
  employeeObserved: z.string().optional(),
  workType: z.enum(["ROUTINE", "NON_ROUTINE", "MAINTENANCE"]),
  taskDescription: z.string().min(1, "Required"),
  workContext: z.string().optional(),
  hazardsPresent: z.string().optional(),
  potentialConsequences: z.string().optional(),
  riskLevel: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  likelihoodScore: z.number().min(1).max(5).optional(),
  impactScore: z.number().min(1).max(5).optional(),
  safetyCategory: z.enum(["PPE","HOUSEKEEPING","EQUIPMENT","PROCEDURE","ENVIRONMENT","ERGONOMICS","OTHER"]).optional(),
  behaviourType: z.string().optional(),
  immediateActionTaken: z.string().optional(),
  workStopped: z.boolean(),
  supervisorNotified: z.boolean(),
  workerEngaged: z.boolean(),
  workerFeedback: z.string().optional(),
  actions: z.array(actionSchema),
});

type FormValues = z.infer<typeof formSchema>;

const ROOT_CAUSE_OPTIONS = [
  "Lack of Training",
  "Fatigue",
  "Equipment Issues",
  "Poor Procedure",
  "Poor Supervision",
  "Environmental Conditions",
  "Other",
];

const STEPS = ["Observation Details", "Task & Behaviour", "Hazards, Risk & Actions", "Engagement & Actions"];

export default function NewObservationPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const user = session?.user as { name?: string } | undefined;

  const [step, setStep] = useState(0);
  const [safeBehaviours, setSafeBehaviours] = useState<string[]>([]);
  const [unsafeBehaviours, setUnsafeBehaviours] = useState<string[]>([]);
  const [safeBehaviourInput, setSafeBehaviourInput] = useState("");
  const [unsafeBehaviourInput, setUnsafeBehaviourInput] = useState("");
  const [rootCauses, setRootCauses] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const now = new Date();
  const localNow = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors },
    trigger,
  } = useForm<FormValues, unknown, FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      observationDate: localNow,
      observerName: user?.name || "",
      workType: "ROUTINE",
      workStopped: false,
      supervisorNotified: false,
      workerEngaged: false,
      actions: [],
    },
  });

  const { fields: actionFields, append: appendAction, remove: removeAction } = useFieldArray({
    control,
    name: "actions",
  });

  const workerEngaged = watch("workerEngaged");
  const likelihoodScore = watch("likelihoodScore") ?? 1;
  const impactScore = watch("impactScore") ?? 1;
  const riskScore = likelihoodScore * impactScore;

  const stepFields: (keyof FormValues)[][] = [
    ["observationDate", "location", "observerName", "workType"],
    ["taskDescription"],
    [],
    [],
  ];

  const goNext = async () => {
    const valid = await trigger(stepFields[step] as (keyof FormValues)[]);
    if (valid) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const onSubmit = async (data: FormValues) => {
    setSubmitting(true);
    setSubmitError("");
    try {
      const payload = {
        ...data,
        safeBehaviours,
        unsafeBehaviours,
        rootCauses,
        riskScore,
      };
      const res = await fetch("/api/behaviour-observations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        setSubmitError(err.error || "Failed to save observation");
        return;
      }
      const created = await res.json();
      router.push(`/observations/${created.id}`);
    } catch {
      setSubmitError("An unexpected error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const addSafe = () => {
    if (safeBehaviourInput.trim()) {
      setSafeBehaviours((p) => [...p, safeBehaviourInput.trim()]);
      setSafeBehaviourInput("");
    }
  };

  const addUnsafe = () => {
    if (unsafeBehaviourInput.trim()) {
      setUnsafeBehaviours((p) => [...p, unsafeBehaviourInput.trim()]);
      setUnsafeBehaviourInput("");
    }
  };

  const toggleRootCause = (cause: string) => {
    setRootCauses((prev) =>
      prev.includes(cause) ? prev.filter((c) => c !== cause) : [...prev, cause]
    );
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">New Behaviour Observation</h1>
        <p className="text-gray-500 mt-1">Complete all steps to record the BBS observation</p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={i} className="flex items-center gap-2 flex-1">
            <div className={cn(
              "flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold shrink-0 transition-colors",
              i < step ? "bg-green-600 text-white" :
              i === step ? "bg-blue-600 text-white" :
              "bg-gray-200 text-gray-500"
            )}>
              {i < step ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
            </div>
            <span className={cn("text-xs font-medium hidden sm:block", i === step ? "text-blue-700" : i < step ? "text-green-700" : "text-gray-400")}>
              {label}
            </span>
            {i < STEPS.length - 1 && <div className={cn("flex-1 h-0.5", i < step ? "bg-green-400" : "bg-gray-200")} />}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Step 1: Observation Details */}
        {step === 0 && (
          <Card>
            <CardHeader><CardTitle>Observation Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="observationDate">Date & Time *</Label>
                  <Input id="observationDate" type="datetime-local" {...register("observationDate")} />
                  {errors.observationDate && <p className="text-xs text-red-600">{errors.observationDate.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="location">Location *</Label>
                  <Input id="location" placeholder="e.g. Main Shaft Level 3" {...register("location")} />
                  {errors.location && <p className="text-xs text-red-600">{errors.location.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="site">Site</Label>
                  <Input id="site" placeholder="Optional" {...register("site")} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="shaft">Shaft</Label>
                  <Input id="shaft" placeholder="Optional" {...register("shaft")} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="plant">Plant</Label>
                  <Input id="plant" placeholder="Optional" {...register("plant")} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="observerName">Observer Name *</Label>
                  <Input id="observerName" {...register("observerName")} />
                  {errors.observerName && <p className="text-xs text-red-600">{errors.observerName.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="observerDepartment">Observer Department</Label>
                  <Input id="observerDepartment" placeholder="Optional" {...register("observerDepartment")} />
                </div>
                <div className="space-y-1.5">
                  <Label>Work Type *</Label>
                  <Select defaultValue="ROUTINE" onValueChange={(v) => setValue("workType", v as "ROUTINE" | "NON_ROUTINE" | "MAINTENANCE")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ROUTINE">Routine</SelectItem>
                      <SelectItem value="NON_ROUTINE">Non-Routine</SelectItem>
                      <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t">
                <div className="space-y-1.5">
                  <Label htmlFor="teamObserved">Team Observed</Label>
                  <Input id="teamObserved" placeholder="Optional" {...register("teamObserved")} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="contractorObserved">Contractor Observed</Label>
                  <Input id="contractorObserved" placeholder="Optional" {...register("contractorObserved")} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="employeeObserved">Employee Observed</Label>
                  <Input id="employeeObserved" placeholder="Optional" {...register("employeeObserved")} />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Task & Behaviour */}
        {step === 1 && (
          <Card>
            <CardHeader><CardTitle>Task & Behaviour</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="taskDescription">Task Description *</Label>
                <Textarea id="taskDescription" rows={3} placeholder="Describe the task being observed..." {...register("taskDescription")} />
                {errors.taskDescription && <p className="text-xs text-red-600">{errors.taskDescription.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="workContext">Work Context</Label>
                <Textarea id="workContext" rows={2} placeholder="Any relevant context about the work environment..." {...register("workContext")} />
              </div>

              {/* Safe Behaviours */}
              <div className="space-y-2">
                <Label>Safe Behaviours Observed</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Type a safe behaviour and click Add"
                    value={safeBehaviourInput}
                    onChange={(e) => setSafeBehaviourInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSafe(); } }}
                  />
                  <Button type="button" variant="outline" onClick={addSafe}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {safeBehaviours.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {safeBehaviours.map((b, i) => (
                      <span key={i} className="inline-flex items-center gap-1 rounded-full bg-green-100 text-green-800 px-3 py-1 text-sm font-medium">
                        {b}
                        <button type="button" onClick={() => setSafeBehaviours((p) => p.filter((_, j) => j !== i))} className="ml-1 text-green-600 hover:text-green-900">×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Unsafe Behaviours */}
              <div className="space-y-2">
                <Label>Unsafe / At-Risk Behaviours Observed</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Type an unsafe behaviour and click Add"
                    value={unsafeBehaviourInput}
                    onChange={(e) => setUnsafeBehaviourInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addUnsafe(); } }}
                  />
                  <Button type="button" variant="outline" onClick={addUnsafe}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {unsafeBehaviours.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {unsafeBehaviours.map((b, i) => (
                      <span key={i} className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 px-3 py-1 text-sm font-medium">
                        {b}
                        <button type="button" onClick={() => setUnsafeBehaviours((p) => p.filter((_, j) => j !== i))} className="ml-1 text-amber-600 hover:text-amber-900">×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Hazards, Risk & Actions */}
        {step === 2 && (
          <Card>
            <CardHeader><CardTitle>Hazards, Risk & Actions</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="hazardsPresent">Hazards Present</Label>
                  <Textarea id="hazardsPresent" rows={3} placeholder="Describe identified hazards..." {...register("hazardsPresent")} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="potentialConsequences">Potential Consequences</Label>
                  <Textarea id="potentialConsequences" rows={3} placeholder="What could happen if not addressed..." {...register("potentialConsequences")} />
                </div>
              </div>

              {/* Risk Level */}
              <div className="space-y-2">
                <Label>Risk Level</Label>
                <div className="flex gap-3">
                  {(["LOW", "MEDIUM", "HIGH"] as const).map((level) => (
                    <label key={level} className={cn(
                      "flex items-center gap-2 cursor-pointer rounded-lg border-2 px-4 py-2 text-sm font-medium transition-colors",
                      watch("riskLevel") === level
                        ? level === "HIGH" ? "border-red-500 bg-red-50 text-red-700"
                          : level === "MEDIUM" ? "border-amber-500 bg-amber-50 text-amber-700"
                          : "border-green-500 bg-green-50 text-green-700"
                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                    )}>
                      <input type="radio" className="sr-only" value={level} {...register("riskLevel")} />
                      {level}
                    </label>
                  ))}
                </div>
              </div>

              {/* Likelihood & Impact */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label>Likelihood Score (1–5)</Label>
                  <Select
                    defaultValue="1"
                    onValueChange={(v) => setValue("likelihoodScore", Number(v) as 1 | 2 | 3 | 4 | 5)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[1,2,3,4,5].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Impact Score (1–5)</Label>
                  <Select
                    defaultValue="1"
                    onValueChange={(v) => setValue("impactScore", Number(v) as 1 | 2 | 3 | 4 | 5)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[1,2,3,4,5].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Risk Score (L × I)</Label>
                  <div className={cn(
                    "flex items-center justify-center h-10 rounded-md border text-lg font-bold",
                    riskScore >= 15 ? "bg-red-50 text-red-700 border-red-300" :
                    riskScore >= 6 ? "bg-amber-50 text-amber-700 border-amber-300" :
                    "bg-green-50 text-green-700 border-green-300"
                  )}>
                    {riskScore}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Risk category</Label>
                  <Select onValueChange={(v) => setValue("safetyCategory", v as FormValues["safetyCategory"])}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {["PPE","HOUSEKEEPING","EQUIPMENT","PROCEDURE","ENVIRONMENT","ERGONOMICS","OTHER"].map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="behaviourType">Behaviour Type</Label>
                  <Input id="behaviourType" placeholder="Optional" {...register("behaviourType")} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="immediateActionTaken">Immediate Action Taken</Label>
                <Textarea id="immediateActionTaken" rows={2} placeholder="Describe any immediate actions taken..." {...register("immediateActionTaken")} />
              </div>

              <div className="flex flex-wrap gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="h-4 w-4 rounded border-gray-300" {...register("workStopped")} />
                  <span className="text-sm font-medium text-gray-700">Work Stopped</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="h-4 w-4 rounded border-gray-300" {...register("supervisorNotified")} />
                  <span className="text-sm font-medium text-gray-700">Supervisor Notified</span>
                </label>
              </div>

              {/* Root Causes */}
              <div className="space-y-2">
                <Label>Root Causes</Label>
                <div className="flex flex-wrap gap-2">
                  {ROOT_CAUSE_OPTIONS.map((cause) => (
                    <label key={cause} className={cn(
                      "flex items-center gap-2 cursor-pointer rounded-full border px-3 py-1.5 text-sm transition-colors",
                      rootCauses.includes(cause) ? "border-blue-500 bg-blue-50 text-blue-700 font-medium" : "border-gray-200 text-gray-600 hover:border-gray-300"
                    )}>
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={rootCauses.includes(cause)}
                        onChange={() => toggleRootCause(cause)}
                      />
                      {cause}
                    </label>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Engagement & Actions */}
        {step === 3 && (
          <Card>
            <CardHeader><CardTitle>Worker Engagement & Actions</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              {/* Worker Engaged */}
              <div className="space-y-2">
                <Label>Worker Engaged?</Label>
                <div className="flex gap-3">
                  {[{ val: true, label: "Yes" }, { val: false, label: "No" }].map(({ val, label }) => (
                    <label key={label} className={cn(
                      "flex items-center gap-2 cursor-pointer rounded-lg border-2 px-6 py-2.5 text-sm font-medium transition-colors",
                      workerEngaged === val
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                    )}>
                      <input
                        type="radio"
                        className="sr-only"
                        checked={workerEngaged === val}
                        onChange={() => setValue("workerEngaged", val)}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              {workerEngaged && (
                <div className="space-y-1.5">
                  <Label htmlFor="workerFeedback">Worker Feedback</Label>
                  <Textarea id="workerFeedback" rows={3} placeholder="What did the worker say or acknowledge?" {...register("workerFeedback")} />
                </div>
              )}

              {/* Actions */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Follow-up Actions</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => appendAction({ description: "", responsiblePerson: "", dueDate: "", status: "OPEN" })}
                  >
                    <Plus className="h-4 w-4 mr-1" /> Add Action
                  </Button>
                </div>

                {actionFields.length === 0 && (
                  <p className="text-sm text-gray-400 italic">No actions added yet. Click &ldquo;Add Action&rdquo; to assign corrective actions.</p>
                )}

                {actionFields.map((field, index) => (
                  <div key={field.id} className="rounded-lg border border-gray-200 p-4 space-y-3 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Action {index + 1}</span>
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => removeAction(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Description *</Label>
                      <Input placeholder="What needs to be done?" {...register(`actions.${index}.description`)} />
                      {errors.actions?.[index]?.description && <p className="text-xs text-red-600">{errors.actions[index]?.description?.message}</p>}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label>Responsible Person *</Label>
                        <Input placeholder="Who is responsible?" {...register(`actions.${index}.responsiblePerson`)} />
                        {errors.actions?.[index]?.responsiblePerson && <p className="text-xs text-red-600">{errors.actions[index]?.responsiblePerson?.message}</p>}
                      </div>
                      <div className="space-y-1.5">
                        <Label>Due Date *</Label>
                        <Input type="date" {...register(`actions.${index}.dueDate`)} />
                        {errors.actions?.[index]?.dueDate && <p className="text-xs text-red-600">{errors.actions[index]?.dueDate?.message}</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {submitError && (
                <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">{submitError}</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setStep((s) => Math.max(s - 1, 0))}
            disabled={step === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Back
          </Button>

          {step < STEPS.length - 1 ? (
            <Button type="button" onClick={goNext}>
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button type="submit" disabled={submitting} className="bg-green-600 hover:bg-green-700 text-white">
              {submitting ? "Saving..." : "Submit Observation"}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
