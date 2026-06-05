/**
 * Unified AI completion client.
 * Set AI_PROVIDER=ollama|openai|gemini in environment.
 * Defaults to ollama if not set.
 */

export type AIMessage = { role: "system" | "user" | "assistant"; content: string };

export interface AICompletionOptions {
  messages: AIMessage[];
  maxTokens: number;
  temperature?: number;
}

type Provider = "ollama" | "openai" | "gemini";

function getProvider(): Provider {
  const p = (process.env.AI_PROVIDER ?? "ollama").toLowerCase();
  if (p === "openai") return "openai";
  if (p === "gemini") return "gemini";
  return "ollama";
}

function getEndpointAndHeaders(): { url: string; headers: Record<string, string>; extraBody?: Record<string, unknown> } {
  const provider = getProvider();

  if (provider === "openai") {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error("OPENAI_API_KEY is not set");
    return {
      url: "https://api.openai.com/v1/chat/completions",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`,
      },
    };
  }

  if (provider === "gemini") {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("GEMINI_API_KEY is not set");
    return {
      url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`,
      },
    };
  }

  // Ollama (default)
  const ollamaUrl = process.env.OLLAMA_URL || "http://192.168.1.92:11434";
  return {
    url: `${ollamaUrl}/v1/chat/completions`,
    headers: { "Content-Type": "application/json" },
    extraBody: { keep_alive: -1 },
  };
}

function getModel(): string {
  const provider = getProvider();
  if (provider === "openai") return process.env.OPENAI_MODEL || "gpt-4o-mini";
  if (provider === "gemini") return process.env.GEMINI_MODEL || "gemini-1.5-flash";
  return process.env.OLLAMA_MODEL || "qwen2.5:3b";
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
  const provider = getProvider();
  if (provider === "openai") return `OpenAI (${getModel()})`;
  if (provider === "gemini") return `Google Gemini (${getModel()})`;
  return `Ollama (${getModel()})`;
}
