import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const OLLAMA_URL = process.env.OLLAMA_URL || "http://192.168.1.92:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "mistral:7b-instruct-q4_0";

function extractJson(text: string): string {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (match) return match[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1) return text.slice(start, end + 1);
  return text.trim();
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { type, data } = body as {
    type: "incident" | "near-miss";
    data: {
      title?: string;
      description: string;
      severity: string;
      category?: string;
      rootCause?: string;
      investigationNotes?: string;
      department?: string;
      location?: string;
    };
  };

  const systemPrompt =
    "You are a Senior Safety Officer with 20+ years of experience in SHEQ management. Analyze safety incidents and near misses to help teams understand root causes and prevent recurrence. Always respond with valid JSON only — no markdown, no code blocks, just raw JSON.";

  const userPrompt = `Analyze this ${type} and provide a structured safety analysis.

Record Type: ${type}
Severity: ${data.severity || "Unknown"}
Category: ${data.category || "General"}
Description: ${data.description || "No description provided"}
${data.rootCause ? `Root Cause Notes: ${data.rootCause}` : ""}
${data.investigationNotes ? `Investigation Notes: ${data.investigationNotes}` : ""}
${data.department ? `Department: ${data.department}` : ""}
${data.location ? `Location: ${data.location}` : ""}

Respond with this exact JSON structure:
{
  "summary": "2-3 sentence executive summary of the incident and key safety concerns",
  "rootCauses": ["root cause 1", "root cause 2", "root cause 3"],
  "immediateActions": ["immediate action 1", "immediate action 2", "immediate action 3"],
  "preventiveMeasures": ["preventive measure 1", "preventive measure 2", "preventive measure 3", "preventive measure 4"],
  "investigationChecklist": ["checklist item 1", "checklist item 2", "checklist item 3", "checklist item 4", "checklist item 5"],
  "riskLevel": "HIGH",
  "patternNote": "Any pattern observation or null if none"
}`;

  try {
    const res = await fetch(`${OLLAMA_URL}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
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
    console.error("AI analyze error:", err);
    return NextResponse.json({ error: err.message || "AI analysis failed" }, { status: 500 });
  }
}
