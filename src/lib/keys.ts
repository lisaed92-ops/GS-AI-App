// ── Bring-your-own API keys ──
// Keys are stored only in this browser's localStorage and sent per-request
// to the local API server. They are never persisted server-side.

export type ApiKeyProvider = "openai" | "anthropic" | "accuweather";

const KEY_STORAGE: Record<ApiKeyProvider, string> = {
  openai: "factori_key_openai",
  anthropic: "factori_key_anthropic",
  accuweather: "factori_key_accuweather",
};

export function getApiKey(provider: ApiKeyProvider): string {
  return localStorage.getItem(KEY_STORAGE[provider]) || "";
}

export function setApiKey(provider: ApiKeyProvider, key: string): void {
  const trimmed = key.trim();
  if (trimmed) {
    localStorage.setItem(KEY_STORAGE[provider], trimmed);
  } else {
    localStorage.removeItem(KEY_STORAGE[provider]);
  }
}

export function clearApiKey(provider: ApiKeyProvider): void {
  localStorage.removeItem(KEY_STORAGE[provider]);
}

/** Headers to attach to /api/chat and /api/weather requests. Only set for keys the user has entered. */
export function apiKeyHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  const openai = getApiKey("openai");
  const anthropic = getApiKey("anthropic");
  const accuweather = getApiKey("accuweather");
  if (openai) headers["x-openai-key"] = openai;
  if (anthropic) headers["x-anthropic-key"] = anthropic;
  if (accuweather) headers["x-accuweather-key"] = accuweather;
  return headers;
}
