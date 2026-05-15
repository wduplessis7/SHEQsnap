"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { X, CheckCircle2, Circle, ArrowRight, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getOnboardingForRole, type OnboardingStep } from "@/lib/onboarding-steps";
import { cn } from "@/lib/utils";

interface OnboardingProgress {
  id: string;
  userId: string;
  completedSteps: string;
  completedAt: string | null;
}

interface OnboardingModalProps {
  open?: boolean;
  onClose?: () => void;
}

export function OnboardingModal({ open, onClose }: OnboardingModalProps = {}) {
  const { data: session } = useSession();
  const user = session?.user as any;

  const [isOpen, setIsOpen] = useState(false);
  const [progress, setProgress] = useState<OnboardingProgress | null>(null);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const role = user?.role ?? "REPORTER";
  const onboarding = getOnboardingForRole(role);

  // Fetch progress from API
  const fetchProgress = useCallback(async () => {
    try {
      const res = await fetch("/api/onboarding");
      if (res.ok) {
        const data = await res.json();
        setProgress(data);
        if (data) {
          setCompletedSteps(JSON.parse(data.completedSteps || "[]"));
        }
      }
    } catch {
      // ignore
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (session?.user) {
      fetchProgress();
    }
  }, [session, fetchProgress]);

  // Auto-open logic: show if not completed and not dismissed this session
  useEffect(() => {
    if (!loaded) return;
    if (open !== undefined) {
      setIsOpen(open);
      return;
    }
    // No record (never started) or not yet completed
    if (progress === null || progress.completedAt === null) {
      const dismissed = sessionStorage.getItem("onboarding-dismissed");
      if (!dismissed) {
        setIsOpen(true);
      }
    }
  }, [loaded, progress, open]);

  const handleClose = () => {
    sessionStorage.setItem("onboarding-dismissed", "true");
    setIsOpen(false);
    onClose?.();
  };

  const toggleStep = async (stepId: string) => {
    const updated = completedSteps.includes(stepId)
      ? completedSteps.filter((s) => s !== stepId)
      : [...completedSteps, stepId];
    setCompletedSteps(updated);
    setSaving(true);
    try {
      await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completedSteps: updated }),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async () => {
    setSaving(true);
    try {
      await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          completedSteps: onboarding.steps.map((s) => s.id),
          completed: true,
        }),
      });
      setCompletedSteps(onboarding.steps.map((s) => s.id));
    } finally {
      setSaving(false);
    }
    setIsOpen(false);
    onClose?.();
  };

  const completedCount = completedSteps.filter((s) =>
    onboarding.steps.some((step) => step.id === s)
  ).length;
  const totalSteps = onboarding.steps.length;
  const progressPct = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="rounded-t-2xl bg-gradient-to-r from-green-600 to-green-500 p-6 text-white">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold leading-tight">{onboarding.welcomeTitle}</h2>
                <p className="text-sm text-green-100 mt-0.5">
                  {user?.name && `Hello, ${user.name}!`}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="shrink-0 rounded-lg p-1.5 text-white/70 hover:text-white hover:bg-white/20 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <p className="mt-3 text-sm text-green-50 leading-relaxed">
            {onboarding.welcomeMessage}
          </p>
          {/* Progress bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-green-100 mb-1.5">
              <span>{completedCount} of {totalSteps} steps completed</span>
              <span>{progressPct}%</span>
            </div>
            <div className="h-2 rounded-full bg-white/30">
              <div
                className="h-2 rounded-full bg-white transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Steps */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {onboarding.steps.map((step: OnboardingStep, idx: number) => {
            const done = completedSteps.includes(step.id);
            return (
              <div
                key={step.id}
                className={cn(
                  "flex items-start gap-3 rounded-xl border p-3 transition-colors",
                  done ? "border-green-200 bg-green-50" : "border-gray-200 bg-white hover:border-gray-300"
                )}
              >
                <button
                  onClick={() => toggleStep(step.id)}
                  className="mt-0.5 shrink-0 text-gray-400 hover:text-green-600 transition-colors"
                  aria-label={done ? "Mark incomplete" : "Mark complete"}
                >
                  {done ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <Circle className="h-5 w-5" />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-400">Step {idx + 1}</span>
                    {done && (
                      <span className="text-xs font-medium text-green-600">Done</span>
                    )}
                  </div>
                  <p className={cn("font-medium text-sm", done ? "text-green-700 line-through" : "text-gray-900")}>
                    {step.title}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{step.description}</p>
                </div>
                <Link
                  href={step.href}
                  onClick={handleClose}
                  className="shrink-0 flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 whitespace-nowrap"
                >
                  {step.action}
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="border-t p-4 flex items-center justify-between gap-3">
          <Button variant="ghost" size="sm" onClick={handleClose} className="text-gray-500">
            Skip for now
          </Button>
          <Button
            onClick={handleComplete}
            disabled={saving}
            className="bg-green-600 hover:bg-green-700 text-white"
            size="sm"
          >
            {saving ? "Saving..." : "Complete Onboarding"}
          </Button>
        </div>
      </div>
    </div>
  );
}
