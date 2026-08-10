import { generateContentWithRetry, isGeminiConfigured } from './geminiService.js';
import { buildRagIndex, retrieveRelevantChunks } from './ragService.js';

const SYSTEM_PROMPT_HEADER = `You are ProjectLens AI, an expert Project Intelligence Copilot for Software Project Managers.
You assist PMs by analyzing deterministic results comparing planned software specifications (SRS/Docs) with actual GitHub code implementation.

STRICT PRINCIPLES:
1. NEVER hallucinate or invent implementation coverage percentages, file names, or requirement details.
2. ALWAYS cite exact evidence provided in context (Requirement IDs, file names, counts, criteria).
3. Do NOT guess project completion — explain the deterministic calculations provided.
4. Keep answers professional, concise, structured, and immediately actionable for Project Managers.
5. You are only given a filtered subset of the project's data relevant to this question, not the full project. If something isn't in the provided context, say so instead of guessing.
6. Use the EXACT status values from context: IMPLEMENTED, PARTIAL, MISSING, NOT_VERIFIABLE.
7. When asked "which requirements are missing?" — list ONLY requirements with status MISSING.
8. When asked "which requirements are incomplete?" — list ONLY requirements with status PARTIAL.
9. When asked for evidence for a specific REQ-NNN — cite ONLY the evidence files listed for that requirement.
10. Do NOT confuse requirements from different modules or mix up their evidence.`;

/**
 * Build a structured offline answer using the real analysis data.
 * Uses the new canonical status values (IMPLEMENTED / PARTIAL / MISSING / NOT_VERIFIABLE).
 */
function normStatus(s) {
  if (!s) return 'MISSING';
  const u = s.toString().toUpperCase();
  if (u.includes('IMPLEMENT') || u === 'COMPLETED') return 'IMPLEMENTED';
  if (u.includes('PARTIAL')) return 'PARTIAL';
  if (u.includes('NOT_VERIF') || u.includes('UNABLE') || u.includes('DETERMINE')) return 'NOT_VERIFIABLE';
  return 'MISSING';
}

function buildOfflineAnswer(contextData) {
  const results = contextData?.analysisResults || [];
  const health = contextData?.healthMetrics || {};

  const lines = results.map((r) => {
    const status = normStatus(r.status);
    const conf = r.confidencePercent ?? Math.round((r.confidence ?? 0) * 100);
    const files = (r.evidence?.detectedFiles || []).slice(0, 3);
    const unmetCriteria = (r.criteria || []).filter(c => c.status !== 'IMPLEMENTED').map(c => c.description);

    const parts = [
      `• **${r.requirementId} — ${r.requirementTitle}** (${r.module})`,
      `  Status: **${status}** | Coverage: ${r.coveragePercent}% | Confidence: ${conf}%`,
      files.length ? `  Evidence: ${files.join(', ')}` : '  Evidence: None found',
    ];
    if (unmetCriteria.length) {
      parts.push(`  Unmet criteria: ${unmetCriteria.slice(0, 3).join('; ')}`);
    }
    if (r.recommendation) {
      parts.push(`  Recommendation: ${r.recommendation}`);
    }
    return parts.join('\n');
  });

  const summaryLines = [
    `[ProjectLens Local Assistant — no data sent externally]`,
    ``,
    `## Project Health: ${health.overallScore ?? 0}% — ${health.healthRating || 'Unknown'}`,
    `- Requirement Coverage: ${health.requirementCoverage ?? 0}%`,
    `- Implementation Coverage: ${health.implementationCoverage ?? 0}%`,
    ``,
    `## Requirement Analysis (${results.length} requirements)`,
    `- ✅ Implemented: ${results.filter(r => normStatus(r.status) === 'IMPLEMENTED').length}`,
    `- 🟡 Partial: ${results.filter(r => normStatus(r.status) === 'PARTIAL').length}`,
    `- ❌ Missing: ${results.filter(r => normStatus(r.status) === 'MISSING').length}`,
    `- ❓ Not Verifiable: ${results.filter(r => normStatus(r.status) === 'NOT_VERIFIABLE').length}`,
    ``,
    ...lines,
  ];

  if (health.keyRiskFactors?.length) {
    summaryLines.push('', '## Key Risk Factors', ...health.keyRiskFactors.map(f => `- ${f}`));
  }

  return {
    content: summaryLines.join('\n'),
    citations: results.slice(0, 3).map(r => ({
      type: 'Requirement',
      ref: r.requirementId,
      label: r.requirementTitle,
    })),
    suggestedQuestions: [
      'Which requirements are missing?',
      'Which requirements have contradictions?',
      'What needs to be done to reach 100% coverage?',
      'Generate a sprint action plan for missing requirements',
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
  const relevantChunks = retrieveRelevantChunks(index, userMessage, { topK: 8, charBudget: 7000 });

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

    // Extract citations from which requirement chunks were retrieved and referenced
    const citations = [];
    for (const c of relevantChunks) {
      if (c.id.startsWith('requirement:')) {
        const reqId = c.id.split(':')[1];
        // Only cite if the answer mentions this requirement ID
        if (answerText.toUpperCase().includes(reqId.toUpperCase())) {
          const match = contextData?.analysisResults?.find((r) => r.requirementId === reqId);
          if (match) citations.push({ type: 'Requirement', ref: match.requirementId, label: match.requirementTitle });
        }
      }
    }

    return {
      content: answerText,
      citations,
      suggestedQuestions: [
        'Which requirements are missing?',
        'Which requirements have contradictions?',
        'What needs to be done to reach 100% coverage?',
        'What is the highest-risk module?',
        'Generate sprint action plan for missing items',
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
