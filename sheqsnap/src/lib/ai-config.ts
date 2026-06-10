import fs from "fs";
import path from "path";

export interface AIConfig {
  provider: "ollama" | "openai" | "gemini";
  ollamaUrl: string;
  ollamaModel: string;
  openaiKey: string;
  openaiModel: string;
  geminiKey: string;
  geminiModel: string;
}

interface AISettings {
  provider: "ollama" | "openai" | "gemini";
  ollamaUrl: string;
  ollamaModel: string;
  openaiModel: string;
  geminiModel: string;
}

interface AISecrets {
  openaiKey: string;
  geminiKey: string;
}

const DEFAULT_SETTINGS: AISettings = {
  provider: "ollama",
  ollamaUrl: process.env.OLLAMA_URL || "http://192.168.1.92:11434",
  ollamaModel: process.env.OLLAMA_MODEL || "qwen2.5:3b",
  openaiModel: process.env.OPENAI_MODEL || "gpt-4o-mini",
  geminiModel: process.env.GEMINI_MODEL || "gemini-1.5-flash",
};

const DEFAULT_SECRETS: AISecrets = {
  openaiKey: process.env.OPENAI_API_KEY || "",
  geminiKey: process.env.GEMINI_API_KEY || "",
};

function getSettingsPath(): string {
  const dbUrl = process.env.DATABASE_URL ?? "";
  const match = dbUrl.match(/^file:(.+[/\\])/);
  if (match) return path.join(match[1], "ai-config.json");
  return path.join(process.cwd(), "data", "ai-config.json");
}

// Secrets live at the app root, outside the data/DB directory.
// This prevents API keys from being swept up in database backups.
function getSecretsPath(): string {
  return path.join(process.cwd(), ".ai-secrets.json");
}

let _settingsCache: AISettings | null = null;
let _secretsCache: AISecrets | null = null;

function readSettings(): AISettings {
  if (_settingsCache) return _settingsCache;
  try {
    const raw = fs.readFileSync(getSettingsPath(), "utf-8");
    _settingsCache = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    _settingsCache = { ...DEFAULT_SETTINGS };
  }
  return _settingsCache!;
}

function readSecrets(): AISecrets {
  if (_secretsCache) return _secretsCache;
  try {
    const raw = fs.readFileSync(getSecretsPath(), "utf-8");
    _secretsCache = { ...DEFAULT_SECRETS, ...JSON.parse(raw) };
  } catch {
    _secretsCache = { ...DEFAULT_SECRETS };
  }
  return _secretsCache!;
}

function writeSettings(settings: AISettings): void {
  const filePath = getSettingsPath();
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(settings, null, 2), "utf-8");
  _settingsCache = settings;
}

function writeSecrets(secrets: AISecrets): void {
  const filePath = getSecretsPath();
  fs.writeFileSync(filePath, JSON.stringify(secrets, null, 2), { encoding: "utf-8", mode: 0o600 });
  _secretsCache = secrets;
}

export function readAIConfig(): AIConfig {
  const settings = readSettings();
  const secrets = readSecrets();
  return { ...settings, ...secrets };
}

export function writeAIConfig(config: AIConfig): void {
  const { openaiKey, geminiKey, ...settings } = config;
  writeSettings(settings);
  writeSecrets({ openaiKey, geminiKey });
}

export function maskKey(key: string): string {
  if (!key || key.length < 8) return key ? "••••••••" : "";
  return "••••••••" + key.slice(-4);
}
