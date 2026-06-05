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
  const { incidents, nearMisses, topic, date } = body as {
    incidents: any[];
    nearMisses: any[];
    topic?: string;
    date?: string;
  };

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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

  const userPrompt = `Generate a practical toolbox talk briefing based on the following recent safety data.
${topic ? `Requested Focus Topic: ${topic}` : "Choose the most relevant topic based on the data below."}
Session Date: ${date || new Date().toLocaleDateString("en-ZA")}

RECENT INCIDENTS:
${incidentSummary}

RECENT NEAR MISSES:
${nearMissSummary}

Respond with this exact JSON structure:
{
  "title": "Short, punchy toolbox talk title",
  "date": "${date || new Date().toLocaleDateString("en-ZA")}",
  "facilitator": "Safety Officer",
  "duration": "15 minutes",
  "safetyMessage": "2-3 sentence opening safety message that sets the tone and urgency",
  "keyPoints": ["key point 1 workers must know", "key point 2", "key point 3", "key point 4", "key point 5"],
  "discussionQuestions": ["question to ask the group 1", "question 2", "question 3"],
  "actionItems": ["specific commitment workers make 1", "commitment 2", "commitment 3", "commitment 4"],
  "takeawayMessage": "One memorable closing sentence that workers will remember"
}`;

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system:
        "You are an experienced SHEQ Safety Officer generating practical toolbox talk briefings for workers on site. Generate content that is clear, actionable, and directly relevant to recent incidents. Always respond with valid JSON only.",
      messages: [{ role: "user", content: userPrompt }],
    });

    const rawText = (message.content[0] as any).text as string;
    const parsed = JSON.parse(rawText);

    return NextResponse.json({ ...parsed, configured: true });
  } catch (err: any) {
    console.error("Toolbox talk AI error:", err);
    return NextResponse.json({ error: err.message || "AI generation failed" }, { status: 500 });
  }
}
