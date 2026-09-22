// ─────────────────────────────────────────────────────────────────────────────
// AI Provider Service
//
// Abstraction layer over GeminiProvider (cloud) and LocalOllamaProvider (privacy).
// The analysis engine calls this service instead of importing geminiService
// directly, keeping provider-specific logic out of engineService.js.
// ─────────────────────────────────────────────────────────────────────────────

import { generateContentWithRetry, isGeminiConfigured } from './geminiService.js';

const LOCAL_AGENT_URL = process.env.LOCAL_AGENT_URL || 'http://127.0.0.1:3847';
const LOCAL_AGENT_TIMEOUT_MS = 300_000; // 5 min — local analysis can be slow

// ─── GeminiProvider ───────────────────────────────────────────────────────────
export const GeminiProvider = {
  name: 'gemini-cloud',
  isConfigured() { return isGeminiConfigured(); },
  async generate({ contents, config }) { return generateContentWithRetry({ contents, config }); },
};

// ─── LocalOllamaProvider ──────────────────────────────────────────────────────
export const LocalOllamaProvider = {
  name: 'ollama-local',
  isConfigured() { return true; },

  async analyze({ requirements, githubUrl, githubToken, ollamaModel, ollamaUrl }) {
    const agentUrl = process.env.LOCAL_AGENT_URL || LOCAL_AGENT_URL;
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), LOCAL_AGENT_TIMEOUT_MS);
    let res;
    try {
      res = await fetch(`${agentUrl}/analyze`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        signal:  controller.signal,
        body: JSON.stringify({
          githubUrl,
          githubToken: githubToken || undefined,
          requirements,
          ollamaModel:  ollamaModel || 'llama3.1:8b',
          ollamaUrl:    ollamaUrl   || 'http://localhost:11434',
        }),
      });
    } finally {
      clearTimeout(tid);
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Local Agent returned ${res.status}`);
    }
    return res.json();
  },

  async checkStatus() {
    const agentUrl = process.env.LOCAL_AGENT_URL || LOCAL_AGENT_URL;
    try {
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`${agentUrl}/health`, { signal: controller.signal });
      clearTimeout(tid);
      if (!res.ok) return { agent: false, ollama: false, status: 'agent_error' };
      return res.json();
    } catch {
      return { agent: false, ollama: false, status: 'agent_offline' };
    }
  },

  async listModels() {
    const agentUrl = process.env.LOCAL_AGENT_URL || LOCAL_AGENT_URL;
    try {
      const res = await fetch(`${agentUrl}/models`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.models || [];
    } catch {
      return [];
    }
  },
};

export function getProvider(analysisMode) {
  return analysisMode === 'privacy' ? LocalOllamaProvider : GeminiProvider;
}
