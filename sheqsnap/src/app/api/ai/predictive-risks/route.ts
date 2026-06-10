import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { licenseHasModule } from "@/lib/license";
import { aiCompletion, getProviderLabel } from "@/lib/ai-client";

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

  const userPrompt = `Analyse the safety statistics below and predict the top 3 highest risks for this company.

<safety_statistics>
Incidents: ${totalIncidents} total | Severity breakdown: ${incSeverity.slice(0, 200)}
Near Misses: ${totalNearMisses} total | Severity breakdown: ${nmSeverity.slice(0, 200)}
Open Actions: ${openActions} | Overdue Actions: ${overdueActions}
Top At-Risk Department: ${topDept.slice(0, 100)}
3-Month Trend: ${trend.slice(0, 300)}
</safety_statistics>

Return ONLY a JSON array of exactly 3 objects (no markdown, no extra text, max 20 words per field):
[{"rank":1,"title":"Risk title","riskLevel":"HIGH","trend":"INCREASING","description":"Brief description.","actions":["action1","action2"]}]

riskLevel: LOW|MEDIUM|HIGH|CRITICAL  trend: INCREASING|STABLE|DECREASING`;

  try {
    const rawText = await aiCompletion({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      maxTokens: 2000,
      temperature: 0.2,
    });

    const extracted = extractJson(rawText);
    const parsed = JSON.parse(extracted);
    const risks = Array.isArray(parsed) ? parsed : parsed.risks ?? [];

    return NextResponse.json({ risks, configured: true, provider: getProviderLabel() });
  } catch (err: any) {
    console.error("Predictive risks AI error:", err);
    return NextResponse.json({ error: err.message || "AI generation failed" }, { status: 500 });
  }
}
