"use client";

import { useState } from "react";
import { Brain, Loader2, AlertCircle, TrendingUp, TrendingDown, Minus, ShieldAlert, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface PredictedRisk {
  rank: number;
  title: string;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  trend: "INCREASING" | "STABLE" | "DECREASING";
  description: string;
  recommendedActions: string[];
}

interface PredictiveRisksPanelProps {
  stats: any;
}

const RISK_STYLES: Record<string, { card: string; badge: string; rank: string }> = {
  CRITICAL: {
    card: "border-red-200 bg-red-50",
    badge: "bg-red-100 text-red-800 border-red-200",
    rank: "bg-red-500 text-white",
  },
  HIGH: {
    card: "border-orange-200 bg-orange-50",
    badge: "bg-orange-100 text-orange-800 border-orange-200",
    rank: "bg-orange-500 text-white",
  },
  MEDIUM: {
    card: "border-yellow-200 bg-yellow-50",
    badge: "bg-yellow-100 text-yellow-800 border-yellow-200",
    rank: "bg-yellow-500 text-white",
  },
  LOW: {
    card: "border-green-200 bg-green-50",
    badge: "bg-green-100 text-green-800 border-green-200",
    rank: "bg-green-500 text-white",
  },
};

const TREND_ICON = {
  INCREASING: <TrendingUp className="h-3.5 w-3.5 text-red-500" />,
  STABLE: <Minus className="h-3.5 w-3.5 text-yellow-500" />,
  DECREASING: <TrendingDown className="h-3.5 w-3.5 text-green-500" />,
};

const TREND_LABEL = {
  INCREASING: "Increasing",
  STABLE: "Stable",
  DECREASING: "Decreasing",
};

export function PredictiveRisksPanel({ stats }: PredictiveRisksPanelProps) {
  const [risks, setRisks] = useState<PredictedRisk[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/predictive-risks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stats }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed to generate risk forecast");
      } else {
        setRisks(json.risks ?? []);
        setGeneratedAt(new Date().toLocaleTimeString("en-ZA"));
      }
    } catch {
      setError("Failed to connect to AI service");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border border-purple-100 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600">
              <Brain className="h-4 w-4 text-white" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-gray-900">AI Predictive Risk Forecast</CardTitle>
              <p className="text-xs text-gray-500 mt-0.5">Top 3 highest risks based on your safety data</p>
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-purple-700 bg-purple-100 rounded px-1.5 py-0.5 ml-1">
              Beta
            </span>
          </div>
          <Button
            onClick={handleGenerate}
            disabled={loading}
            size="sm"
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white border-0 gap-1.5"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Brain className="h-3.5 w-3.5" />}
            {loading ? "Analysing..." : risks ? "Regenerate" : "Generate Forecast"}
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {/* Idle state */}
        {!risks && !loading && !error && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="p-3 rounded-full bg-purple-50 mb-3">
              <ShieldAlert className="h-6 w-6 text-purple-400" />
            </div>
            <p className="text-sm text-gray-500 max-w-sm">
              Click <span className="font-medium text-purple-600">Generate Forecast</span> to let AI analyse your safety data and surface the top 3 risks requiring attention.
            </p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
            <p className="text-sm text-gray-500">Analysing safety data...</p>
            <p className="text-xs text-gray-400">This may take up to 60 seconds</p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
            <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Results */}
        {risks && !loading && (
          <div className="space-y-4">
            {risks.map((risk) => {
              const style = RISK_STYLES[risk.riskLevel] ?? RISK_STYLES.MEDIUM;
              return (
                <div key={risk.rank} className={`rounded-xl border p-4 ${style.card}`}>
                  <div className="flex items-start gap-3">
                    <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${style.rank}`}>
                      {risk.rank}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <h3 className="text-sm font-semibold text-gray-900">{risk.title}</h3>
                        <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${style.badge}`}>
                          <ShieldAlert className="h-3 w-3" />
                          {risk.riskLevel}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] text-gray-600 bg-white/70 border border-gray-200 px-2 py-0.5 rounded-full">
                          {TREND_ICON[risk.trend]}
                          {TREND_LABEL[risk.trend]}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mb-3 leading-relaxed">{risk.description}</p>
                      <div>
                        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Recommended Actions</p>
                        <ul className="space-y-1">
                          {risk.recommendedActions.map((action, i) => (
                            <li key={i} className="flex items-start gap-1.5 text-sm text-gray-700">
                              <ChevronRight className="h-3.5 w-3.5 text-gray-400 mt-0.5 shrink-0" />
                              {action}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {generatedAt && (
              <p className="text-[10px] text-gray-400 text-right">
                Generated at {generatedAt} · Powered by Ollama — SHEQ Risk Analyst perspective
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
