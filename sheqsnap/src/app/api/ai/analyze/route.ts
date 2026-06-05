import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ configured: false, message: "ANTHROPIC_API_KEY not configured" });
  }

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

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system:
        "You are a Senior Safety Officer with 20+ years of experience in SHEQ (Safety, Health, Environment, Quality) management. Analyze safety incidents and near misses to help teams understand root causes and prevent recurrence. Always respond with valid JSON only — no markdown, no code blocks, just raw JSON.",
      messages: [{ role: "user", content: userPrompt }],
    });

    const rawText = (message.content[0] as any).text as string;
    const parsed = JSON.parse(rawText);

    return NextResponse.json({ ...parsed, configured: true });
  } catch (err: any) {
    console.error("AI analyze error:", err);
    return NextResponse.json({ error: err.message || "AI analysis failed" }, { status: 500 });
  }
}
