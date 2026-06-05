import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { licenseHasModule } from "@/lib/license";

const OLLAMA_URL = process.env.OLLAMA_URL || "http://192.168.1.92:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen2.5:3b";

function extractJson(text: string): string {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (match) return match[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1) return text.slice(start, end + 1);
  return text.trim();
}

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!await licenseHasModule("ai")) return NextResponse.json({ error: "AI module not licensed" }, { status: 403 });

  const body = await req.json();
  const { incidents, nearMisses, topic, date } = body as {
    incidents: any[];
    nearMisses: any[];
    topic?: string;
    date?: string;
  };

  const incidentSummary =
    incidents.length > 0
      ? incidents
          .slice(0, 5)
          .map((inc: any, i: number) =>
            `I${i + 1}: [${inc.severityLevel}] ${inc.incidentType || "General"} — ${inc.description?.substring(0, 100) || "No description"}`
          )
          .join("\n")
      : "None.";

  const nearMissSummary =
    nearMisses.length > 0
      ? nearMisses
          .slice(0, 5)
          .map((nm: any, i: number) =>
            `NM${i + 1}: [${nm.severityLevel}] ${nm.riskCategory || "General"} — ${nm.description?.substring(0, 100) || "No description"}`
          )
          .join("\n")
      : "None.";

  const sessionDate = date || new Date().toLocaleDateString("en-ZA");

  const systemPrompt =
    "You are a SHEQ Safety Officer. Generate toolbox talk briefings. Respond with valid JSON only — no markdown, no code blocks.";

  const userPrompt = `Generate a toolbox talk for workers.
${topic ? `Topic: ${topic}` : "Pick the most relevant topic from the data."}
Date: ${sessionDate}
Incidents: ${incidentSummary}
Near Misses: ${nearMissSummary}

Return ONLY this JSON:
{"title":"short title","date":"${sessionDate}","facilitator":"Safety Officer","duration":"15 minutes","safetyMessage":"1-2 sentence opening message","keyPoints":["point1","point2","point3"],"discussionQuestions":["q1","q2"],"actionItems":["action1","action2","action3"],"takeawayMessage":"one closing sentence"}`;

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
        temperature: 0.3,
        max_tokens: 400,
        keep_alive: -1,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Ollama error ${res.status}: ${err}`);
    }

    const json = await res.json();
    const rawText: string = json.choices?.[0]?.message?.content ?? "";
    const parsed = JSON.parse(extractJson(rawText));

    return NextResponse.json({ ...parsed, configured: true });
  } catch (err: any) {
    console.error("Toolbox talk AI error:", err);
    return NextResponse.json({ error: err.message || "AI generation failed" }, { status: 500 });
  }
}
