export interface AIConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export const DEFAULT_BASE_URL = "https://api.openai.com/v1";
export const DEFAULT_MODEL = "gpt-4o";
export const CONFIG_KEY = "ai_chat_config";

export function loadConfig(): AIConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") return parsed as AIConfig;
    }
  } catch {}
  return { baseUrl: DEFAULT_BASE_URL, apiKey: "", model: DEFAULT_MODEL };
}

export function saveConfig(config: AIConfig): void {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}
