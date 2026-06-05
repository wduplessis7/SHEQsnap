import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { licenseHasModule } from "@/lib/license";
import { aiCompletion, getProviderLabel } from "@/lib/ai-client";

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
    "You are a Senior Safety Officer. Analyze safety incidents concisely. Respond with valid JSON only — no markdown, no code blocks.";

  const userPrompt = `Analyze this ${type}:
Severity: ${data.severity || "Unknown"}
Category: ${data.category || "General"}
Description: ${data.description || "No description"}
${data.rootCause ? `Root Cause: ${data.rootCause}` : ""}
${data.department ? `Dept: ${data.department}` : ""}

Return ONLY this JSON (no extra text):
{"summary":"1-2 sentence summary","rootCauses":["cause1","cause2"],"immediateActions":["action1","action2"],"preventiveMeasures":["measure1","measure2","measure3"],"investigationChecklist":["item1","item2","item3"],"riskLevel":"HIGH","patternNote":null}`;

  try {
    const rawText = await aiCompletion({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      maxTokens: 400,
      temperature: 0.2,
    });

    const parsed = JSON.parse(extractJson(rawText));
    return NextResponse.json({ ...parsed, configured: true, provider: getProviderLabel() });
  } catch (err: any) {
    console.error("AI analyse error:", err);
    return NextResponse.json({ error: err.message || "AI analysis failed" }, { status: 500 });
  }
}
