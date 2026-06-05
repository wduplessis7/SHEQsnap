"use client";

import { useState } from "react";
import { Brain, Loader2, Info, AlertCircle, CheckSquare, ShieldAlert, TrendingUp, Search, Lightbulb } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface AIAnalysisResult {
  configured: boolean;
  summary?: string;
  rootCauses?: string[];
  immediateActions?: string[];
  preventiveMeasures?: string[];
  investigationChecklist?: string[];
  riskLevel?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  patternNote?: string | null;
  message?: string;
}

interface AIAnalysisPanelProps {
  entityType: "incident" | "near-miss";
  entityData: any;
}

const RISK_COLORS: Record<string, string> = {
  LOW: "bg-green-100 text-green-800 border-green-200",
  MEDIUM: "bg-yellow-100 text-yellow-800 border-yellow-200",
  HIGH: "bg-orange-100 text-orange-800 border-orange-200",
  CRITICAL: "bg-red-100 text-red-800 border-red-200",
};

export function AIAnalysisPanel({ entityType, entityData }: AIAnalysisPanelProps) {
  const [result, setResult] = useState<AIAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAnalyse() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: entityType,
          data: {
            description: entityData.description,
            severity: entityData.severityLevel,
            category: entityData.incidentType || entityData.riskCategory,
            rootCause: entityData.rootCause,
            investigationNotes: entityData.investigationNotes,
            department: entityData.department?.name,
            location: entityData.location,
          },
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Analysis failed");
      } else {
        setResult(json);
      }
    } catch (err: any) {
      setError("Failed to connect to AI service");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border border-indigo-100 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
              <Brain className="h-4 w-4 text-white" />
            </div>
            <CardTitle className="text-base font-semibold text-gray-900">AI Safety Analysis</CardTitle>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-purple-700 bg-purple-100 rounded px-1.5 py-0.5">
              Beta
            </span>
          </div>
          {!result && !loading && (
            <Button
              onClick={handleAnalyse}
              size="sm"
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white border-0 gap-1.5"
            >
              <Brain className="h-3.5 w-3.5" />
              Analyse with AI
            </Button>
          )}
          {result && !loading && (
            <Button
              onClick={handleAnalyse}
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs"
            >
              <Brain className="h-3 w-3" />
              Re-analyse
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {/* Not yet analysed */}
        {!result && !loading && !error && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="p-3 rounded-full bg-indigo-50 mb-3">
              <Brain className="h-6 w-6 text-indigo-400" />
            </div>
            <p className="text-sm text-gray-500 max-w-xs">
              Click <span className="font-medium text-indigo-600">Analyse with AI</span> to get instant root cause analysis, recommended actions, and an investigation checklist.
            </p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
            <p className="text-sm text-gray-500">Analysing with AI...</p>
            <p className="text-xs text-gray-400">Senior Safety Officer perspective</p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
            <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Not configured */}
        {result && result.configured === false && (
          <div className="flex items-start gap-3 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
            <Info className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800">AI not configured</p>
              <p className="text-sm text-amber-700 mt-0.5">
                Ollama is not reachable. Check that the Ollama service is running and <code className="bg-amber-100 px-1 rounded text-xs font-mono">OLLAMA_URL</code> is set correctly.
              </p>
            </div>
          </div>
        )}

        {/* Results */}
        {result && result.configured !== false && result.summary && (
          <div className="space-y-5">
            {/* Risk Level */}
            {result.riskLevel && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">AI Risk Assessment:</span>
                <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border ${RISK_COLORS[result.riskLevel] || RISK_COLORS.MEDIUM}`}>
                  <ShieldAlert className="h-3 w-3" />
                  {result.riskLevel}
                </span>
              </div>
            )}

            {/* Summary */}
            <div className="rounded-lg bg-amber-50 border border-amber-100 p-4">
              <div className="flex items-center gap-1.5 mb-2">
                <Lightbulb className="h-3.5 w-3.5 text-amber-600" />
                <span className="text-xs font-semibold text-amber-800 uppercase tracking-wide">Summary</span>
              </div>
              <p className="text-sm text-amber-900 leading-relaxed">{result.summary}</p>
            </div>

            {/* Root Causes */}
            {result.rootCauses && result.rootCauses.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Search className="h-3.5 w-3.5 text-red-500" />
                  <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Root Causes</span>
                </div>
                <ul className="space-y-1.5">
                  {result.rootCauses.map((cause, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-red-400 shrink-0" />
                      <span className="text-sm text-gray-700">{cause}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Immediate Actions */}
            {result.immediateActions && result.immediateActions.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <AlertCircle className="h-3.5 w-3.5 text-orange-500" />
                  <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Immediate Actions</span>
                </div>
                <ul className="space-y-1.5">
                  {result.immediateActions.map((action, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-orange-400 shrink-0" />
                      <span className="text-sm text-gray-700">{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Preventive Measures */}
            {result.preventiveMeasures && result.preventiveMeasures.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                  <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Preventive Measures</span>
                </div>
                <ul className="space-y-1.5">
                  {result.preventiveMeasures.map((measure, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-green-400 shrink-0" />
                      <span className="text-sm text-gray-700">{measure}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Investigation Checklist */}
            {result.investigationChecklist && result.investigationChecklist.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <CheckSquare className="h-3.5 w-3.5 text-blue-500" />
                  <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Investigation Checklist</span>
                </div>
                <ul className="space-y-2">
                  {result.investigationChecklist.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        className="mt-0.5 h-3.5 w-3.5 rounded border-gray-300 text-blue-600 shrink-0"
                        readOnly
                      />
                      <span className="text-sm text-gray-700">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Pattern Note */}
            {result.patternNote && (
              <div className="rounded-lg bg-indigo-50 border border-indigo-100 p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Brain className="h-3 w-3 text-indigo-500" />
                  <span className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">Pattern Observation</span>
                </div>
                <p className="text-sm text-indigo-800">{result.patternNote}</p>
              </div>
            )}

            <p className="text-[10px] text-gray-400 text-right">Powered by Ollama (Mistral 7B) — Senior Safety Officer perspective</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
