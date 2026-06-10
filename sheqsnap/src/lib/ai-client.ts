import { readAIConfig } from "@/lib/ai-config";

export type AIMessage = { role: "system" | "user" | "assistant"; content: string };

export interface AICompletionOptions {
  messages: AIMessage[];
  maxTokens: number;
  temperature?: number;
}

function getEndpointAndHeaders(): { url: string; headers: Record<string, string>; extraBody?: Record<string, unknown> } {
  const config = readAIConfig();

  if (config.provider === "openai") {
    if (!config.openaiKey) throw new Error("OpenAI API key is not configured. Set it in Admin → Platform License → AI Engine.");
    return {
      url: "https://api.openai.com/v1/chat/completions",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.openaiKey}`,
      },
    };
  }

  if (config.provider === "gemini") {
    if (!config.geminiKey) throw new Error("Gemini API key is not configured. Set it in Admin → Platform License → AI Engine.");
    return {
      url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.geminiKey}`,
      },
    };
  }

  // Ollama (default)
  return {
    url: `${config.ollamaUrl}/v1/chat/completions`,
    headers: { "Content-Type": "application/json" },
    extraBody: { keep_alive: -1 },
  };
}

function getModel(): string {
  const config = readAIConfig();
  if (config.provider === "openai") return config.openaiModel;
  if (config.provider === "gemini") return config.geminiModel;
  return config.ollamaModel;
}

export async function aiCompletion(options: AICompletionOptions): Promise<string> {
  const { url, headers, extraBody } = getEndpointAndHeaders();
  const model = getModel();

  const body: Record<string, unknown> = {
    model,
    messages: options.messages,
    temperature: options.temperature ?? 0.2,
    max_tokens: options.maxTokens,
    ...extraBody,
  };

  const res = await fetch(url, {
    method: "POST",
    headers,
    signal: AbortSignal.timeout(110_000),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`AI provider error ${res.status}: ${err}`);
  }

  const json = await res.json();
  return json.choices?.[0]?.message?.content ?? "";
}

export function getProviderLabel(): string {
  const config = readAIConfig();
  if (config.provider === "openai") return `OpenAI (${config.openaiModel})`;
  if (config.provider === "gemini") return `Google Gemini (${config.geminiModel})`;
  return `Ollama (${config.ollamaModel})`;
}
