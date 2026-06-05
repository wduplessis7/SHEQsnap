import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { licenseHasModule } from "@/lib/license";

const OLLAMA_URL = process.env.OLLAMA_URL || "http://192.168.1.92:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen2.5:3b";

function extractJson(text: string): string {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (match) return match[1].trim();
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start !== -1 && end !== -1) return text.slice(start, end + 1);
  const objStart = text.indexOf("{");
  const objEnd = text.lastIndexOf("}");
  if (objStart !== -1 && objEnd !== -1) return text.slice(objStart, objEnd + 1);
  return text.trim();
}

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!await licenseHasModule("ai")) return NextResponse.json({ error: "AI module not licensed" }, { status: 403 });

  const body = await req.json();
  const { stats } = body as { stats: any };

  // Handle both flat and kpis-nested structures
  const kpis = stats?.kpis ?? stats ?? {};
  const totalIncidents = kpis.totalIncidents ?? 0;
  const totalNearMisses = kpis.totalNearMisses ?? 0;
  const openActions = kpis.openActions ?? 0;
  const overdueActions = kpis.overdueActions ?? 0;

  const incSeverity = (stats?.incidentsBySeverity ?? []).map((s: any) =>
    `${s.severity}:${s.count}`
  ).join(", ") || "N/A";

  const nmSeverity = (stats?.nearMissesBySeverity ?? []).map((s: any) =>
    `${s.severity}:${s.count}`
  ).join(", ") || "N/A";

  // Last 3 months trend
  const trend = (stats?.monthlyTrend ?? []).slice(-3).map((m: any) =>
    `${m.month}: ${m.incidents ?? 0} incidents, ${m.nearMisses ?? 0} near-misses`
  ).join("; ") || "No trend data";

  // Top department with most near misses
  const topDept = (stats?.nearMissesByDepartment ?? [])[0]?.department ?? "Unknown";

  const topIncidentType = "Unknown";
  const topInjuryType = "Unknown";
  const topNmCategory = "Unknown";

  const systemPrompt =
    "You are a Senior SHEQ Risk Analyst. Analyse safety data and predict risks. Respond with valid JSON array only — no markdown, no extra text.";

  const userPrompt = `Predict the top 3 highest risks for this company based on safety data.

Incidents: ${totalIncidents} total | Severity breakdown: ${incSeverity}
Near Misses: ${totalNearMisses} total | Severity breakdown: ${nmSeverity}
Open Actions: ${openActions} | Overdue Actions: ${overdueActions}
Top At-Risk Department: ${topDept}
3-Month Trend: ${trend}

Return ONLY a JSON array of exactly 3 objects:
[{"rank":1,"title":"short risk title","riskLevel":"HIGH","trend":"INCREASING","description":"1-2 sentence description of the risk","recommendedActions":["action1","action2"]},...]

riskLevel must be one of: LOW, MEDIUM, HIGH, CRITICAL
trend must be one of: INCREASING, STABLE, DECREASING`;

  try {
    const res = await fetch(`${OLLAMA_URL}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(110_000),
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
        max_tokens: 450,
        keep_alive: -1,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Ollama error ${res.status}: ${err}`);
    }

    const json = await res.json();
    const rawText: string = json.choices?.[0]?.message?.content ?? "";
    const extracted = extractJson(rawText);
    const parsed = JSON.parse(extracted);
    const risks = Array.isArray(parsed) ? parsed : parsed.risks ?? [];

    return NextResponse.json({ risks, configured: true });
  } catch (err: any) {
    console.error("Predictive risks AI error:", err);
    return NextResponse.json({ error: err.message || "AI generation failed" }, { status: 500 });
  }
}
