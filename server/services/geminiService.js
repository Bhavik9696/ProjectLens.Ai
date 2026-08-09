import { GoogleGenAI } from '@google/genai';

let client = null;

function getClient() {
  if (!process.env.GEMINI_API_KEY) return null;
  if (!client) {
    client = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: { 'User-Agent': 'projectlens-ai-mern' },
      },
    });
  }
  return client;
}

export function isGeminiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY);
}

// BUG FIX: the original AI-Studio scaffold called a non-existent model
// id ("gemini-3.6-flash"), so every request silently burned a retry
// against a 404 before ever reaching the real model. These are the
// current valid Gemini model ids, primary first.
const MODEL_FALLBACK_CHAIN = ['gemini-2.5-flash', 'gemini-2.0-flash'];

/**
 * Calls Gemini with retry + model fallback for transient 503/429 errors.
 * @param {{contents: string, config?: any}} params
 */
export async function generateContentWithRetry({ contents, config }) {
  const ai = getClient();
  if (!ai) throw new Error('GEMINI_API_KEY is not configured');

  let lastError = null;

  for (const model of MODEL_FALLBACK_CHAIN) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await ai.models.generateContent({ model, contents, config });
        return res;
      } catch (err) {
        lastError = err;
        const errMsg = err?.message || '';
        const isTransient =
          err?.status === 'UNAVAILABLE' ||
          err?.code === 503 ||
          err?.status === 503 ||
          errMsg.includes('503') ||
          errMsg.includes('high demand') ||
          errMsg.includes('UNAVAILABLE');

        if (isTransient && attempt === 0) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } else {
          break; // try next model in the chain, or give up
        }
      }
    }
  }

  throw lastError;
}
