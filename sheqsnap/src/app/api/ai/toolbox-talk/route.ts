import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

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
          .map(
            (inc: any, i: number) =>
              `Incident ${i + 1}: [${inc.severityLevel}] ${inc.incidentType || "General"} — ${inc.description?.substring(0, 200) || "No description"}`
          )
          .join("\n")
      : "No incidents in selected period.";

  const nearMissSummary =
    nearMisses.length > 0
      ? nearMisses
          .map(
            (nm: any, i: number) =>
              `Near Miss ${i + 1}: [${nm.severityLevel}] ${nm.riskCategory || "General"} — ${nm.description?.substring(0, 200) || "No description"}`
          )
          .join("\n")
      : "No near misses in selected period.";

  const sessionDate = date || new Date().toLocaleDateString("en-ZA");

  const systemPrompt =
    "You are an experienced SHEQ Safety Officer generating practical toolbox talk briefings for workers on site. Generate content that is clear, actionable, and directly relevant to recent incidents. Always respond with valid JSON only.";

  const userPrompt = `Generate a practical toolbox talk briefing based on the following recent safety data.
${topic ? `Requested Focus Topic: ${topic}` : "Choose the most relevant topic based on the data below."}
Session Date: ${sessionDate}

RECENT INCIDENTS:
${incidentSummary}

RECENT NEAR MISSES:
${nearMissSummary}

Respond with this exact JSON structure:
{
  "title": "Short, punchy toolbox talk title",
  "date": "${sessionDate}",
  "facilitator": "Safety Officer",
  "duration": "15 minutes",
  "safetyMessage": "2-3 sentence opening safety message that sets the tone and urgency",
  "keyPoints": ["key point 1 workers must know", "key point 2", "key point 3", "key point 4", "key point 5"],
  "discussionQuestions": ["question to ask the group 1", "question 2", "question 3"],
  "actionItems": ["specific commitment workers make 1", "commitment 2", "commitment 3", "commitment 4"],
  "takeawayMessage": "One memorable closing sentence that workers will remember"
}`;

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
        temperature: 0.4,
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
