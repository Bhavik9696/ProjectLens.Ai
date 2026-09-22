/**
 * Ollama Service — thin HTTP wrapper around the Ollama REST API.
 * Ollama must be running locally (default: http://localhost:11434).
 *
 * Exports both naming conventions for compatibility:
 *   isOllamaReachable / checkOllama   — connectivity check
 *   listOllamaModels  / listModels    — list installed models
 *   generate                          — run a prompt
 */

const OLLAMA_BASE = process.env.OLLAMA_BASE_URL || process.env.OLLAMA_URL || 'http://localhost:11434';
const DEFAULT_MODEL = process.env.OLLAMA_DEFAULT_MODEL || process.env.OLLAMA_MODEL || 'llama3.1:8b';

/**
 * Checks whether Ollama is running and reachable.
 * @param {string} [ollamaUrl]
 * @returns {Promise<boolean>}
 */
export async function isOllamaReachable(ollamaUrl = OLLAMA_BASE) {
  try {
    const res = await fetch(`${ollamaUrl}/api/tags`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

/** Alias for isOllamaReachable */
export const checkOllama = isOllamaReachable;

/**
 * List all locally available Ollama model names.
 * @param {string} [ollamaUrl]
 * @returns {Promise<string[]>}
 */
export async function listOllamaModels(ollamaUrl = OLLAMA_BASE) {
  const res = await fetch(`${ollamaUrl}/api/tags`, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`Ollama /api/tags returned ${res.status}`);
  const data = await res.json();
  return (data.models || []).map((m) => m.name);
}

/** Alias for listOllamaModels */
export const listModels = listOllamaModels;

/**
 * Send a prompt to Ollama and get the full response text.
 * Uses the /api/generate endpoint (non-streaming).
 *
 * @param {string} prompt
 * @param {string} [model]
 * @param {number} [timeoutMs]
 * @returns {Promise<string>}
 */
export async function generate(prompt, model = DEFAULT_MODEL, timeoutMs = 120_000) {
  const res = await fetch(`${OLLAMA_BASE}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      prompt,
      stream: false,
      options: {
        temperature: 0.1,
        num_predict: 2048,
      },
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Ollama generate failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  return data.response || '';
}
