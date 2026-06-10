"use client";

import { useEffect, useState } from "react";
import { Brain, Save, CheckCircle, AlertCircle, Loader2, Eye, EyeOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Provider = "ollama" | "openai" | "gemini";

interface Config {
  provider: Provider;
  ollamaUrl: string;
  ollamaModel: string;
  openaiKey: string;
  openaiModel: string;
  geminiKey: string;
  geminiModel: string;
}

const PROVIDER_LABELS: Record<Provider, string> = {
  ollama: "Ollama (Local / Self-hosted)",
  openai: "OpenAI (GPT)",
  gemini: "Google Gemini",
};

export function AIConfigCard() {
  const [config, setConfig] = useState<Config>({
    provider: "ollama",
    ollamaUrl: "http://192.168.1.92:11434",
    ollamaModel: "qwen2.5:3b",
    openaiKey: "",
    openaiModel: "gpt-4o-mini",
    geminiKey: "",
    geminiModel: "gemini-1.5-flash",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [showOpenAiKey, setShowOpenAiKey] = useState(false);
  const [showGeminiKey, setShowGeminiKey] = useState(false);

  useEffect(() => {
    fetch("/api/admin/ai-config")
      .then((r) => r.json())
      .then((data) => setConfig((prev) => ({ ...prev, ...data })))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function setField<K extends keyof Config>(key: K, value: Config[K]) {
    setConfig((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
    setTestResult(null);
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      await fetch("/api/admin/ai-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    try {
      // Save first so the server reads the latest config
      await fetch("/api/admin/ai-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const res = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "incident",
          data: { description: "Test connection", severity: "LOW", category: "Test" },
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setTestResult({ ok: false, message: json.error || "Connection failed" });
      } else {
        setTestResult({ ok: true, message: `Connected — ${json.provider ?? config.provider}` });
      }
    } catch (err: any) {
      setTestResult({ ok: false, message: err.message || "Connection failed" });
    } finally {
      setTesting(false);
    }
  }

  if (loading) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600">
            <Brain className="h-4 w-4 text-white" />
          </div>
          <CardTitle className="text-base">AI Engine Configuration</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Provider selector */}
        <div>
          <Label className="text-xs">AI Provider</Label>
          <Select value={config.provider} onValueChange={(v) => setField("provider", v as Provider)}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.entries(PROVIDER_LABELS) as [Provider, string][]).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Ollama fields */}
        {config.provider === "ollama" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <Label className="text-xs">Ollama Server URL</Label>
              <Input
                className="mt-1 font-mono text-sm"
                value={config.ollamaUrl}
                onChange={(e) => setField("ollamaUrl", e.target.value)}
                placeholder="http://192.168.1.92:11434"
              />
            </div>
            <div>
              <Label className="text-xs">Model Name</Label>
              <Input
                className="mt-1 font-mono text-sm"
                value={config.ollamaModel}
                onChange={(e) => setField("ollamaModel", e.target.value)}
                placeholder="qwen2.5:3b"
              />
            </div>
          </div>
        )}

        {/* OpenAI fields */}
        {config.provider === "openai" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <Label className="text-xs">API Key</Label>
              <div className="relative mt-1">
                <Input
                  type={showOpenAiKey ? "text" : "password"}
                  className="font-mono text-sm pr-10"
                  value={config.openaiKey}
                  onChange={(e) => setField("openaiKey", e.target.value)}
                  placeholder="sk-..."
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  onClick={() => setShowOpenAiKey((v) => !v)}
                >
                  {showOpenAiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label className="text-xs">Model</Label>
              <Input
                className="mt-1 font-mono text-sm"
                value={config.openaiModel}
                onChange={(e) => setField("openaiModel", e.target.value)}
                placeholder="gpt-4o-mini"
              />
            </div>
          </div>
        )}

        {/* Gemini fields */}
        {config.provider === "gemini" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <Label className="text-xs">API Key</Label>
              <div className="relative mt-1">
                <Input
                  type={showGeminiKey ? "text" : "password"}
                  className="font-mono text-sm pr-10"
                  value={config.geminiKey}
                  onChange={(e) => setField("geminiKey", e.target.value)}
                  placeholder="AIza..."
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  onClick={() => setShowGeminiKey((v) => !v)}
                >
                  {showGeminiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label className="text-xs">Model</Label>
              <Input
                className="mt-1 font-mono text-sm"
                value={config.geminiModel}
                onChange={(e) => setField("geminiModel", e.target.value)}
                placeholder="gemini-1.5-flash"
              />
            </div>
          </div>
        )}

        {/* Test result */}
        {testResult && (
          <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${testResult.ok ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-600 border border-red-200"}`}>
            {testResult.ok
              ? <CheckCircle className="h-4 w-4 shrink-0" />
              : <AlertCircle className="h-4 w-4 shrink-0" />}
            {testResult.message}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button onClick={handleSave} disabled={saving} size="sm">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {saved ? "Saved!" : "Save"}
          </Button>
          <Button onClick={handleTest} disabled={testing || saving} size="sm" variant="outline">
            {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Brain className="h-3.5 w-3.5" />}
            Test Connection
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
