"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { Brain, Loader2, Printer, Info, AlertCircle, MessageSquare, CheckSquare, HelpCircle, Zap, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

interface ToolboxTalkResult {
  configured: boolean;
  title?: string;
  date?: string;
  facilitator?: string;
  duration?: string;
  safetyMessage?: string;
  keyPoints?: string[];
  discussionQuestions?: string[];
  actionItems?: string[];
  takeawayMessage?: string;
  message?: string;
}

export default function ToolboxTalkPage() {
  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);

  const [fromDate, setFromDate] = useState(thirtyDaysAgo.toISOString().split("T")[0]);
  const [toDate, setToDate] = useState(today.toISOString().split("T")[0]);
  const [topic, setTopic] = useState("");
  const [incidents, setIncidents] = useState<any[]>([]);
  const [nearMisses, setNearMisses] = useState<any[]>([]);
  const [selectedIncidents, setSelectedIncidents] = useState<Set<string>>(new Set());
  const [selectedNearMisses, setSelectedNearMisses] = useState<Set<string>>(new Set());
  const [loadingData, setLoadingData] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<ToolboxTalkResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [fromDate, toDate]);

  async function fetchData() {
    setLoadingData(true);
    try {
      const [incRes, nmRes] = await Promise.all([
        fetch(`/api/incidents?from=${fromDate}&to=${toDate}&limit=50`).then((r) => r.json()),
        fetch(`/api/near-misses?from=${fromDate}&to=${toDate}&limit=50`).then((r) => r.json()),
      ]);
      const incItems = incRes.items || [];
      const nmItems = nmRes.items || [];
      setIncidents(incItems);
      setNearMisses(nmItems);
      setSelectedIncidents(new Set(incItems.map((i: any) => i.id)));
      setSelectedNearMisses(new Set(nmItems.map((i: any) => i.id)));
    } catch {
      // ignore
    } finally {
      setLoadingData(false);
    }
  }

  function toggleIncident(id: string) {
    setSelectedIncidents((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleNearMiss(id: string) {
    setSelectedNearMisses((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    setResult(null);
    try {
      const selectedIncData = incidents.filter((i) => selectedIncidents.has(i.id));
      const selectedNmData = nearMisses.filter((i) => selectedNearMisses.has(i.id));

      const res = await fetch("/api/ai/toolbox-talk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          incidents: selectedIncData,
          nearMisses: selectedNmData,
          topic: topic || undefined,
          date: new Date().toLocaleDateString("en-ZA"),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Generation failed");
      } else {
        setResult(json);
        // Scroll to result
        setTimeout(() => {
          document.getElementById("toolbox-result")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
      }
    } catch {
      setError("Failed to connect to AI service");
    } finally {
      setGenerating(false);
    }
  }

  const totalSelected = selectedIncidents.size + selectedNearMisses.size;

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #toolbox-result, #toolbox-result * { visibility: visible; }
          #toolbox-result { position: absolute; left: 0; top: 0; width: 100%; padding: 20px; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
                <MessageSquare className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Toolbox Talk Generator</h1>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-purple-700 bg-purple-100 rounded px-1.5 py-0.5">
                AI Powered
              </span>
            </div>
            <p className="text-gray-500 text-sm mt-1">
              Generate structured toolbox talks from recent incidents and near misses using AI.
            </p>
          </div>
        </div>

        {/* Config section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Date range & topic */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-gray-700">Date Range & Topic</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">From</Label>
                  <Input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">To</Label>
                  <Input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">Focus Topic <span className="text-gray-400">(optional — AI will decide if blank)</span></Label>
                <Input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Working at heights, PPE compliance, Electrical safety..."
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>

          {/* Summary card */}
          <Card className="border-indigo-100 bg-gradient-to-br from-indigo-50 to-purple-50">
            <CardContent className="p-6 flex flex-col justify-between h-full">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-indigo-500" />
                  <span className="font-semibold text-gray-900">AI Toolbox Talk</span>
                </div>
                <p className="text-sm text-gray-600">
                  {loadingData ? "Loading records..." : (
                    <>
                      <span className="font-bold text-indigo-700">{totalSelected}</span> records selected
                      {" "}({selectedIncidents.size} incidents, {selectedNearMisses.size} near misses)
                    </>
                  )}
                </p>
                <p className="text-xs text-gray-500">
                  The AI will analyse selected records and generate a 15-minute safety briefing ready for your team.
                </p>
              </div>
              <Button
                onClick={handleGenerate}
                disabled={generating || totalSelected === 0}
                className="mt-4 w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white border-0 gap-2"
              >
                {generating ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />Generating...</>
                ) : (
                  <><Brain className="h-4 w-4" />Generate Toolbox Talk</>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
            <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Not configured notice */}
        {result && result.configured === false && (
          <div className="flex items-start gap-3 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
            <Info className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800">AI not configured</p>
              <p className="text-sm text-amber-700 mt-0.5">
                Add your <code className="bg-amber-100 px-1 rounded text-xs font-mono">ANTHROPIC_API_KEY</code> to the <code className="bg-amber-100 px-1 rounded text-xs font-mono">.env</code> file to enable Toolbox Talk generation.
              </p>
            </div>
          </div>
        )}

        {/* Record selectors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Incidents */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-500" />
                Incidents ({incidents.length})
                <button
                  className="ml-auto text-xs text-indigo-600 hover:underline"
                  onClick={() => setSelectedIncidents(new Set(incidents.map((i) => i.id)))}
                >
                  All
                </button>
                <button
                  className="text-xs text-gray-400 hover:underline"
                  onClick={() => setSelectedIncidents(new Set())}
                >
                  None
                </button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingData ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                </div>
              ) : incidents.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No incidents in this period</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {incidents.map((inc) => (
                    <label key={inc.id} className="flex items-start gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={selectedIncidents.has(inc.id)}
                        onChange={() => toggleIncident(inc.id)}
                        className="mt-0.5 h-3.5 w-3.5 rounded border-gray-300 text-indigo-600 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-mono text-blue-600">{inc.referenceNo}</span>
                          <Badge variant="outline" className="text-[10px] px-1 py-0">{inc.severityLevel}</Badge>
                        </div>
                        <p className="text-xs text-gray-600 truncate">{inc.description?.substring(0, 80)}...</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Near misses */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Zap className="h-4 w-4 text-orange-500" />
                Near Misses ({nearMisses.length})
                <button
                  className="ml-auto text-xs text-indigo-600 hover:underline"
                  onClick={() => setSelectedNearMisses(new Set(nearMisses.map((i) => i.id)))}
                >
                  All
                </button>
                <button
                  className="text-xs text-gray-400 hover:underline"
                  onClick={() => setSelectedNearMisses(new Set())}
                >
                  None
                </button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingData ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                </div>
              ) : nearMisses.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No near misses in this period</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {nearMisses.map((nm) => (
                    <label key={nm.id} className="flex items-start gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={selectedNearMisses.has(nm.id)}
                        onChange={() => toggleNearMiss(nm.id)}
                        className="mt-0.5 h-3.5 w-3.5 rounded border-gray-300 text-indigo-600 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-mono text-blue-600">{nm.referenceNo}</span>
                          <Badge variant="outline" className="text-[10px] px-1 py-0">{nm.severityLevel}</Badge>
                        </div>
                        <p className="text-xs text-gray-600 truncate">{nm.description?.substring(0, 80)}...</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Generated result */}
        {result && result.configured !== false && result.title && (
          <div id="toolbox-result" className="space-y-0">
            {/* Print header */}
            <Card className="border-2 border-indigo-200 shadow-lg">
              <CardContent className="p-0">
                {/* Document header */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white p-6 rounded-t-lg">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <MessageSquare className="h-5 w-5 text-indigo-200" />
                        <span className="text-indigo-200 text-sm font-medium uppercase tracking-wide">SHEQ Toolbox Talk</span>
                      </div>
                      <h2 className="text-2xl font-bold">{result.title}</h2>
                    </div>
                    <Button
                      onClick={() => window.print()}
                      variant="outline"
                      size="sm"
                      className="no-print bg-white/10 border-white/30 text-white hover:bg-white/20 gap-1.5"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      Print / Save PDF
                    </Button>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-white/20 text-sm">
                    <div>
                      <p className="text-indigo-200 text-xs">Date</p>
                      <p className="font-medium">{result.date}</p>
                    </div>
                    <div>
                      <p className="text-indigo-200 text-xs">Facilitator</p>
                      <p className="font-medium">{result.facilitator}</p>
                    </div>
                    <div>
                      <p className="text-indigo-200 text-xs">Duration</p>
                      <p className="font-medium">{result.duration}</p>
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {/* Safety message */}
                  {result.safetyMessage && (
                    <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
                      <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2">Opening Safety Message</p>
                      <p className="text-amber-900 leading-relaxed">{result.safetyMessage}</p>
                    </div>
                  )}

                  {/* Key points */}
                  {result.keyPoints && result.keyPoints.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <CheckSquare className="h-4 w-4 text-indigo-600" />
                        <h3 className="font-semibold text-gray-900">Key Safety Points</h3>
                      </div>
                      <ul className="space-y-2">
                        {result.keyPoints.map((point, i) => (
                          <li key={i} className="flex items-start gap-3">
                            <span className="mt-0.5 flex-shrink-0 h-5 w-5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">
                              {i + 1}
                            </span>
                            <span className="text-gray-800">{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Discussion questions */}
                  {result.discussionQuestions && result.discussionQuestions.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <HelpCircle className="h-4 w-4 text-blue-600" />
                        <h3 className="font-semibold text-gray-900">Discussion Questions</h3>
                      </div>
                      <ul className="space-y-2">
                        {result.discussionQuestions.map((q, i) => (
                          <li key={i} className="flex items-start gap-3">
                            <span className="mt-0.5 text-blue-500 text-sm font-bold shrink-0">Q{i + 1}.</span>
                            <span className="text-gray-800">{q}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Action items */}
                  {result.actionItems && result.actionItems.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Zap className="h-4 w-4 text-green-600" />
                        <h3 className="font-semibold text-gray-900">Team Commitments</h3>
                      </div>
                      <ul className="space-y-2">
                        {result.actionItems.map((item, i) => (
                          <li key={i} className="flex items-start gap-3">
                            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-green-400 shrink-0" />
                            <span className="text-gray-800">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Takeaway */}
                  {result.takeawayMessage && (
                    <div className="rounded-lg bg-green-50 border border-green-200 p-4">
                      <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-2">Remember</p>
                      <p className="text-green-900 font-medium italic">&ldquo;{result.takeawayMessage}&rdquo;</p>
                    </div>
                  )}

                  {/* Acknowledgement section */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Users className="h-4 w-4 text-gray-500" />
                      <h3 className="font-semibold text-gray-900">Attendee Acknowledgement</h3>
                    </div>
                    <p className="text-sm text-gray-500 mb-3">
                      By signing below, attendees confirm they have participated in and understood this toolbox talk.
                    </p>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                      {Array.from({ length: 10 }).map((_, i) => (
                        <div key={i} className="space-y-1">
                          <div className="border-b border-gray-300 h-7" />
                          <div className="flex justify-between text-[10px] text-gray-400">
                            <span>Name & Signature</span>
                            <span>Employee #</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-6 pt-4 border-t border-gray-200 grid grid-cols-2 gap-8">
                      <div className="space-y-1">
                        <div className="border-b border-gray-400 h-7" />
                        <p className="text-[10px] text-gray-500">Facilitator Signature</p>
                      </div>
                      <div className="space-y-1">
                        <div className="border-b border-gray-300 h-7" />
                        <p className="text-[10px] text-gray-500">Date</p>
                      </div>
                    </div>
                  </div>

                  <p className="text-[10px] text-gray-400 text-center pt-2 border-t border-gray-100">
                    Generated by SHEQSnap AI — {new Date().toLocaleDateString("en-ZA")}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Re-generate / Print buttons (outside print area) */}
            <div className="flex items-center justify-end gap-3 pt-2 no-print">
              <Button onClick={() => window.print()} variant="outline" className="gap-1.5">
                <Printer className="h-4 w-4" />
                Print / Save as PDF
              </Button>
              <Button
                onClick={handleGenerate}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white border-0 gap-1.5"
              >
                <Brain className="h-4 w-4" />
                Regenerate
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
