"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Search, BookOpen, Rocket, Users, AlertTriangle, FileWarning, CheckSquare, ClipboardList, ClipboardCheck, HardHat, BarChart3, Settings, Shield, ArrowRight, CheckCircle2, Circle, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { helpArticles, categories, getArticlesByCategory } from "@/lib/help-articles";
import { getOnboardingForRole } from "@/lib/onboarding-steps";
import { OnboardingModal } from "@/components/onboarding/onboarding-modal";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  BookOpen,
  Users,
  AlertTriangle,
  FileWarning,
  CheckSquare,
  ClipboardList,
  ClipboardCheck,
  HardHat,
  BarChart3,
  Settings,
  Shield,
};

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  "Modules": "Detailed guides for each module in the system.",
  "Administration": "System configuration and user management guides.",
  "Reference": "Compliance, audit trails, and technical reference.",
};

interface OnboardingProgress {
  id: string;
  userId: string;
  completedSteps: string;
  completedAt: string | null;
}

export default function HelpPage() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const role = user?.role ?? "REPORTER";
  const isAdmin = role === "ADMIN";

  const [search, setSearch] = useState("");
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [progress, setProgress] = useState<OnboardingProgress | null | undefined>(undefined);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

  const onboarding = getOnboardingForRole(role);

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
      setProgress(null);
    }
  }, []);

  useEffect(() => {
    if (session?.user) {
      fetchProgress();
    }
  }, [session, fetchProgress]);

  const handleResetProgress = async () => {
    await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completedSteps: [], completed: false }),
    });
    setCompletedSteps([]);
    setProgress((prev) => (prev ? { ...prev, completedAt: null, completedSteps: "[]" } : null));
  };

  const completedCount = completedSteps.filter((s) =>
    onboarding.steps.some((step) => step.id === s)
  ).length;
  const totalSteps = onboarding.steps.length;
  const progressPct = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;

  const filtered = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.toLowerCase();
    return helpArticles.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q)
    );
  }, [search]);

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Onboarding Checklist Card */}
      {progress !== undefined && onboarding.steps.length > 0 && (
        <Card className="border-2 border-green-400 bg-green-50 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-600">
                  <Rocket className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-green-900">Onboarding Checklist</h2>
                  <p className="text-sm text-green-700">
                    {completedCount} of {totalSteps} steps completed
                    {progress?.completedAt ? " · Completed!" : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleResetProgress}
                    className="text-xs text-green-700 hover:text-green-900"
                  >
                    Reset progress
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={() => setShowOnboardingModal(true)}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {progress?.completedAt ? "Review Onboarding" : "Continue Onboarding"}
                </Button>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-4">
              <div className="h-2.5 rounded-full bg-green-200">
                <div
                  className="h-2.5 rounded-full bg-green-600 transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>

            {/* Step preview */}
            <div className="mt-4 space-y-1.5">
              {onboarding.steps.slice(0, 4).map((step) => {
                const done = completedSteps.includes(step.id);
                return (
                  <div key={step.id} className="flex items-center gap-2 text-sm">
                    {done ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                    ) : (
                      <Circle className="h-4 w-4 text-green-400 shrink-0" />
                    )}
                    <span className={cn(done ? "text-green-700 line-through" : "text-green-900")}>
                      {step.title}
                    </span>
                  </div>
                );
              })}
              {totalSteps > 4 && (
                <p className="text-xs text-green-600 pl-6">
                  +{totalSteps - 4} more steps &mdash; click &ldquo;Continue Onboarding&rdquo; to see all
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Hero */}
      <div className="text-center space-y-4 py-8">
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100">
            <BookOpen className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Help Centre</h1>
        <p className="text-gray-500 max-w-xl mx-auto">
          Everything you need to know about using SHEQsnap. Search for a topic or browse the categories below.
        </p>

        {/* Search */}
        <div className="relative max-w-lg mx-auto mt-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            placeholder="Search articles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-12 h-12 text-base rounded-xl border-gray-300 shadow-sm"
          />
        </div>
      </div>

      {/* Search results */}
      {filtered !== null && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
            {filtered.length} result{filtered.length !== 1 ? "s" : ""} for &ldquo;{search}&rdquo;
          </h2>
          {filtered.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-gray-400">
                No articles found. Try a different search term.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {filtered.map((article) => {
                const Icon = ICON_MAP[article.icon] || BookOpen;
                return (
                  <ArticleCard key={article.slug} article={article} Icon={Icon} />
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Category sections */}
      {filtered === null &&
        categories.map((category) => {
          const articles = getArticlesByCategory(category);
          return (
            <div key={category} className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{category}</h2>
                <p className="text-sm text-gray-500 mt-1">{CATEGORY_DESCRIPTIONS[category]}</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {articles.map((article) => {
                  const Icon = ICON_MAP[article.icon] || BookOpen;
                  return (
                    <ArticleCard key={article.slug} article={article} Icon={Icon} />
                  );
                })}
              </div>
            </div>
          );
        })}

      {/* Onboarding modal (controlled from this page) */}
      {showOnboardingModal && (
        <OnboardingModal
          open={showOnboardingModal}
          onClose={() => {
            setShowOnboardingModal(false);
            fetchProgress();
          }}
        />
      )}
    </div>
  );
}

function ArticleCard({
  article,
  Icon,
}: {
  article: { slug: string; title: string; description: string };
  Icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Link href={`/help/${article.slug}`}>
      <Card className="h-full hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group">
        <CardContent className="p-5 flex flex-col gap-3 h-full">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 group-hover:bg-blue-100 transition-colors">
            <Icon className="h-5 w-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
              {article.title}
            </h3>
            <p className="text-sm text-gray-500 mt-1 leading-relaxed">{article.description}</p>
          </div>
          <div className="flex items-center text-sm text-blue-600 font-medium">
            Read more
            <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
