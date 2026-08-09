import { generateContentWithRetry, isGeminiConfigured } from './geminiService.js';
import { buildRagIndex, retrieveRelevantChunks } from './ragService.js';

const SYSTEM_PROMPT_HEADER = `You are ProjectLens AI, an expert Project Intelligence Copilot for Software Project Managers.
You assist PMs by analyzing deterministic results comparing planned software specifications (SRS/Docs) with actual GitHub code implementation.

STRICT PRINCIPLES:
1. NEVER hallucinate or invent implementation coverage percentages.
2. ALWAYS cite exact evidence provided in context (Requirement IDs, file names, counts).
3. Do NOT guess project completion — explain the deterministic calculations provided.
4. Keep answers professional, concise, structured, and immediately actionable for Project Managers.
5. You are only given a filtered subset of the project's data relevant to this question, not the full project. If something isn't in the provided context, say so instead of guessing.`;

function buildOfflineAnswer(contextData) {
  return {
    content: `[ProjectLens Local Assistant — no data sent externally]\n\nBased on deterministic project metrics:\n- Requirement Coverage: ${contextData?.healthMetrics?.requirementCoverage}%\n- Overall Health Score: ${contextData?.healthMetrics?.overallScore}% (${contextData?.healthMetrics?.healthRating})\n\nKey Findings:\n${(contextData?.analysisResults || [])
      .map((r) => `• **${r.requirementId} (${r.module})**: ${r.coveragePercent}% coverage. Status: ${r.status}. Evidence files: ${r.evidence?.detectedFiles?.slice(0, 3).join(', ') || 'None'}`)
      .join('\n')}`,
    citations: contextData?.analysisResults?.[0]
      ? [{ type: 'Requirement', ref: contextData.analysisResults[0].requirementId, label: contextData.analysisResults[0].requirementTitle }]
      : [],
    suggestedQuestions: [
      'Is the project following the SRS?',
      'Which requirements are currently High Risk?',
      'Generate Sprint Action Plan for missing items',
    ],
    ragMeta: { mode: 'local', chunksSent: [], sentExternally: false },
  };
}

/**
 * Answers a Copilot question using retrieval-augmented generation.
 *
 * `allowExternalAI` is an explicit, per-project opt-in flag. When it is
 * false — the default for every new project — this function NEVER calls
 * an external AI provider, regardless of whether GEMINI_API_KEY is
 * configured. It only uses the deterministic local summary.
 *
 * When external AI is allowed, only the top-K query-relevant, redacted
 * chunks built by ragService are sent — never the full project bundle.
 * The function returns `ragMeta` describing exactly what was retrieved
 * and sent, so the caller can persist an audit trail and the UI can show
 * the user precisely what left the server for this answer.
 */
export async function askCopilot(userMessage, contextData, { allowExternalAI = false } = {}) {
  if (!allowExternalAI || !isGeminiConfigured()) {
    return buildOfflineAnswer(contextData);
  }

  const index = buildRagIndex(contextData);
  const relevantChunks = retrieveRelevantChunks(index, userMessage, { topK: 8, charBudget: 6000 });

  const contextBlock = relevantChunks.map((c) => `[${c.id}] ${c.text}`).join('\n\n');
  const systemPrompt = `${SYSTEM_PROMPT_HEADER}\n\nRETRIEVED CONTEXT (${relevantChunks.length} of ${index.length} total data chunks — only the chunks relevant to this question):\n${contextBlock}`;

  const ragMeta = {
    mode: 'external',
    sentExternally: true,
    chunksSent: relevantChunks.map((c) => ({ id: c.id, text: c.text })),
    totalChunksAvailable: index.length,
  };

  try {
    const geminiRes = await generateContentWithRetry({
      contents: userMessage,
      config: { systemInstruction: systemPrompt },
    });

    const answerText = geminiRes.text || 'Unable to analyze query.';

    const citations = [];
    for (const c of relevantChunks) {
      if (c.id.startsWith('requirement:') && answerText.includes(c.id.split(':')[1])) {
        const reqId = c.id.split(':')[1];
        const match = contextData?.analysisResults?.find((r) => r.requirementId === reqId);
        if (match) citations.push({ type: 'Requirement', ref: match.requirementId, label: match.requirementTitle });
      }
    }

    return {
      content: answerText,
      citations,
      suggestedQuestions: [
        'Is the project following the SRS?',
        'Which requirements are currently High Risk?',
        'What is missing in the highest-priority module?',
        'Generate Sprint Action Plan for missing items',
      ],
      ragMeta,
    };
  } catch (apiError) {
    console.warn('Gemini Copilot API error, switching to local fallback:', apiError.message);
    const offline = buildOfflineAnswer(contextData);
    return {
      ...offline,
      content: `*AI provider unavailable — showing local deterministic summary instead. Nothing was sent externally for this answer.*\n\n${offline.content}`,
    };
  }
}
