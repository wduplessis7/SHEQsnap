import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { readAIConfig, writeAIConfig, maskKey, type AIConfig } from "@/lib/ai-config";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session) return null;
  const user = session.user as any;
  if (user?.role !== "ADMIN") return null;
  return session;
}

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const config = readAIConfig();
  return NextResponse.json({
    provider: config.provider,
    ollamaUrl: config.ollamaUrl,
    ollamaModel: config.ollamaModel,
    openaiKey: maskKey(config.openaiKey),
    openaiModel: config.openaiModel,
    geminiKey: maskKey(config.geminiKey),
    geminiModel: config.geminiModel,
  });
}

export async function POST(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const current = readAIConfig();

  const updated: AIConfig = {
    provider: body.provider ?? current.provider,
    ollamaUrl: body.ollamaUrl ?? current.ollamaUrl,
    ollamaModel: body.ollamaModel ?? current.ollamaModel,
    // Only update key if a real value was sent (not a masked placeholder)
    openaiKey: body.openaiKey && !body.openaiKey.startsWith("••") ? body.openaiKey : current.openaiKey,
    openaiModel: body.openaiModel ?? current.openaiModel,
    geminiKey: body.geminiKey && !body.geminiKey.startsWith("••") ? body.geminiKey : current.geminiKey,
    geminiModel: body.geminiModel ?? current.geminiModel,
  };

  writeAIConfig(updated);
  return NextResponse.json({ ok: true });
}
